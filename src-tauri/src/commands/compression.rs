use crate::database::DatabaseManager;
use crate::domain::{AppState, OutputFormat, validate_image_file};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{AppHandle, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressImageRequest {
    pub file_path: String,
    pub quality: Option<u8>,
    pub format: Option<String>,
    pub output_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionResult {
    pub original_size: u64,
    pub compressed_size: u64,
    pub savings_percent: f64,
    pub output_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressImageResponse {
    pub success: bool,
    pub image_id: String,
    pub output_path: Option<String>,
    pub result: Option<CompressionResult>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn compress_image(
    request: CompressImageRequest,
    image_id: Option<String>,
    app_handle: AppHandle,
    _state: State<'_, AppState>,
) -> Result<CompressImageResponse, String> {
    let start_time = std::time::Instant::now();
    let file_path = Path::new(&request.file_path);

    let image_id = image_id.unwrap_or_else(|| format!("img_{}", start_time.elapsed().as_nanos()));

    // Validate image file
    let metadata = match validate_image_file(file_path) {
        Ok(meta) => meta,
        Err(e) => {
            return Ok(CompressImageResponse {
                success: false,
                image_id,
                output_path: None,
                result: None,
                error: Some(format!("File validation failed: {}", e)),
            });
        }
    };

    // Determine compression settings
    let output_format = match request.format.as_deref() {
        Some("webp") => OutputFormat::WebP,
        Some("png") => OutputFormat::Png,
        Some("jpg") | Some("jpeg") => OutputFormat::Jpeg,
        Some("auto") => {
            let input_extension = metadata
                .extension
                .clone()
                .unwrap_or_else(|| "webp".to_string());

            match input_extension.as_str() {
                "heic" | "heif" => OutputFormat::Jpeg,
                _ => crate::domain::CompressionSettings::preserve_input_format(&input_extension),
            }
        }
        _ => {
            let input_extension = metadata
                .extension
                .clone()
                .unwrap_or_else(|| "webp".to_string());

            crate::domain::CompressionSettings::optimal_format_for_input(&input_extension)
        }
    };

    let quality = request.quality.unwrap_or(80);
    let settings = crate::domain::CompressionSettings::new(quality, output_format);

    let output_extension = match output_format {
        OutputFormat::WebP => "webp",
        OutputFormat::Png => "png",
        OutputFormat::Jpeg => "jpg",
    };

    let output_path = match request.output_path.as_ref() {
        Some(custom_path) => {
            let path = Path::new(custom_path);
            if path.is_dir() {
                let filename = file_path
                    .file_stem()
                    .and_then(|stem| stem.to_str())
                    .unwrap_or("compressed");
                path.join(format!("{}.{}", filename, output_extension))
            } else {
                path.to_path_buf()
            }
        }
        None => {
            let mut output_path = file_path.to_path_buf();
            let filename = file_path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .unwrap_or("compressed");
            output_path.set_file_name(format!("{}_compressed.{}", filename, output_extension));
            output_path
        }
    };

    // Get pixel count for duration estimation accuracy
    let pixel_count = image::image_dimensions(file_path)
        .map(|(w, h)| w as u64 * h as u64)
        .ok();

    // Compress
    match crate::domain::compression::compress_file_to_file(file_path, &output_path, &settings) {
        Ok(compression_output) => {
            let processing_time = start_time.elapsed().as_millis() as u64;

            // Record stats in DB (backend-only, frontend does not duplicate)
            let input_format = metadata
                .extension
                .clone()
                .unwrap_or_else(|| "unknown".to_string());
            let stat = crate::domain::compression::stats::create_stat_with_time(
                input_format,
                output_extension.to_string(),
                compression_output.original_size,
                compression_output.compressed_size,
                processing_time,
                pixel_count,
                &settings,
            );

            if let Err(e) = DatabaseManager::new(&app_handle).and_then(|db| {
                db.connect()?;
                db.save_compression_stat(&stat)
            }) {
                log::warn!("Failed to save compression stat: {}", e);
            }

            Ok(CompressImageResponse {
                success: true,
                image_id,
                output_path: Some(compression_output.output_path.to_string_lossy().to_string()),
                result: Some(CompressionResult {
                    original_size: compression_output.original_size,
                    compressed_size: compression_output.compressed_size,
                    savings_percent: compression_output.savings_percent,
                    output_path: compression_output.output_path.to_string_lossy().to_string(),
                }),
                error: None,
            })
        }
        Err(e) => Ok(CompressImageResponse {
            success: false,
            image_id,
            output_path: None,
            result: None,
            error: Some(format!("Compression failed: {}", e)),
        }),
    }
}
