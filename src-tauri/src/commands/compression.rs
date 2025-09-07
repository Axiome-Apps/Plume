use crate::domain::{validate_image_file, AppState, OutputFormat, SqliteStatsStore, StatsStore};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

// Global stats store - same pattern as stats.rs
static STATS_STORE: std::sync::LazyLock<Mutex<SqliteStatsStore>> = std::sync::LazyLock::new(|| {
    let db_path = std::env::temp_dir()
        .join("plume")
        .join("compression_stats.db");
    std::fs::create_dir_all(db_path.parent().unwrap()).unwrap();
    let store = SqliteStatsStore::new(db_path.to_str().unwrap()).unwrap();
    Mutex::new(store)
});

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionProgressEvent {
    pub image_id: String,
    pub image_name: String,
    pub stage: CompressionStage,
    pub progress: f64,
    pub estimated_time_remaining: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CompressionStage {
    Started,
    Processing,
    Completed,
    Error,
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
    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let image_id = image_id.unwrap_or_else(|| {
        let generated_id = format!("img_{}", start_time.elapsed().as_nanos());
        println!("🔧 No image_id provided, generated: {}", generated_id);
        generated_id
    });

    println!("🎯 compress_image called, using image_id: {}", image_id);

    // Emit start event
    let _ = app_handle.emit(
        "compression-progress",
        CompressionProgressEvent {
            image_id: image_id.clone(),
            image_name: file_name.clone(),
            stage: CompressionStage::Started,
            progress: 0.0,
            estimated_time_remaining: None,
        },
    );

    // Validate image file first
    let metadata = match validate_image_file(file_path) {
        Ok(meta) => meta,
        Err(e) => {
            let error_msg = format!("File validation failed: {}", e);
            let _ = app_handle.emit(
                "compression-progress",
                CompressionProgressEvent {
                    image_id: image_id.clone(),
                    image_name: file_name,
                    stage: CompressionStage::Error,
                    progress: 0.0,
                    estimated_time_remaining: None,
                },
            );
            return Ok(CompressImageResponse {
                success: false,
                image_id: image_id.clone(),
                output_path: None,
                result: None,
                error: Some(error_msg),
            });
        }
    };

    // Emit processing event - étape 1: lecture du fichier
    let _ = app_handle.emit(
        "compression-progress",
        CompressionProgressEvent {
            image_id: image_id.clone(),
            image_name: file_name.clone(),
            stage: CompressionStage::Processing,
            progress: 25.0,
            estimated_time_remaining: Some(3000),
        },
    );

    // Determine compression settings
    let output_format = match request.format.as_deref() {
        Some("webp") => OutputFormat::WebP,
        Some("png") => OutputFormat::Png,
        Some("jpg") | Some("jpeg") => OutputFormat::Jpeg,
        Some("auto") => {
            // Mode 'auto' : préserver le format original
            let input_extension = metadata
                .extension
                .clone()
                .unwrap_or_else(|| "webp".to_string());
            let format =
                crate::domain::CompressionSettings::preserve_input_format(&input_extension);
            format
        }
        _ => {
            // Aucun format spécifié ou format inconnu : utiliser WebP optimal
            let input_extension = metadata
                .extension
                .clone()
                .unwrap_or_else(|| "webp".to_string());
            let format =
                crate::domain::CompressionSettings::optimal_format_for_input(&input_extension);
            format
        }
    };

    let quality = request.quality.unwrap_or(80);
    let settings = crate::domain::CompressionSettings::new(quality, output_format);

    // Determine output path
    let output_extension = match output_format {
        OutputFormat::WebP => "webp",
        OutputFormat::Png => "png",
        OutputFormat::Jpeg => "jpg",
    };

    let output_path = match request.output_path.as_ref() {
        Some(custom_path) => {
            let path = Path::new(custom_path);
            if path.is_dir() {
                // If output_path is a directory, generate filename
                let filename = file_path
                    .file_stem()
                    .and_then(|stem| stem.to_str())
                    .unwrap_or("compressed");
                path.join(format!("{}.{}", filename, output_extension))
            } else {
                // Use the provided path directly
                path.to_path_buf()
            }
        }
        None => {
            // Generate output path next to input file
            let mut output_path = file_path.to_path_buf();
            let filename = file_path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .unwrap_or("compressed");
            output_path.set_file_name(format!("{}_compressed.{}", filename, output_extension));
            output_path
        }
    };

    // Perform file-to-file compression
    match crate::domain::compression::compress_file_to_file(file_path, &output_path, &settings) {
        Ok(compression_output) => {
            let processing_time = start_time.elapsed().as_millis() as u64;

            // Emit completion event
            let _ = app_handle.emit(
                "compression-progress",
                CompressionProgressEvent {
                    image_id: image_id.clone(),
                    image_name: file_name,
                    stage: CompressionStage::Completed,
                    progress: 100.0,
                    estimated_time_remaining: Some(0),
                },
            );

            // Record compression statistics with timing information
            if let Ok(mut store) = STATS_STORE.lock() {
                let input_format = metadata
                    .extension
                    .clone()
                    .unwrap_or_else(|| "unknown".to_string());
                let stat = crate::domain::compression::stats::create_stat_with_time(
                    input_format.clone(),
                    output_extension.to_string(),
                    compression_output.original_size,
                    compression_output.compressed_size,
                    processing_time,
                    &settings,
                    "plume-v0.1.0".to_string(),
                );

                match store.save_stat(stat) {
                    Ok(id) => {
                        println!(
                            "📊 Saved compression stat with timing (id: {}, time: {}ms)",
                            id, processing_time
                        );
                    }
                    Err(e) => {
                        println!("⚠️ Failed to save compression stat: {}", e);
                    }
                }
            }

            // Emit domain event for analytics
            let _event = crate::domain::compression_completed_event(
                metadata
                    .extension
                    .clone()
                    .unwrap_or_else(|| "unknown".to_string()),
                output_extension.to_string(),
                compression_output.original_size,
                compression_output.compressed_size,
                compression_output.savings_percent,
                processing_time,
            );

            Ok(CompressImageResponse {
                success: true,
                image_id: image_id.clone(),
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
        Err(e) => {
            let error_msg = format!("Compression failed: {}", e);
            let _ = app_handle.emit(
                "compression-progress",
                CompressionProgressEvent {
                    image_id: image_id.clone(),
                    image_name: file_name,
                    stage: CompressionStage::Error,
                    progress: 0.0,
                    estimated_time_remaining: None,
                },
            );
            Ok(CompressImageResponse {
                success: false,
                image_id,
                output_path: None,
                result: None,
                error: Some(error_msg),
            })
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressBatchRequest {
    pub file_paths: Vec<String>,
    pub quality: Option<u8>,
    pub format: Option<String>,
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressBatchResponse {
    pub total_files: usize,
    pub successful: usize,
    pub failed: usize,
    pub results: Vec<CompressImageResponse>,
}

#[tauri::command]
pub async fn compress_batch(
    request: CompressBatchRequest,
    app_handle: AppHandle,
    _state: State<'_, AppState>,
) -> Result<CompressBatchResponse, String> {
    let total_files = request.file_paths.len();
    let mut results = Vec::new();
    let mut successful = 0;
    let mut failed = 0;

    for (index, file_path) in request.file_paths.iter().enumerate() {
        let compress_request = CompressImageRequest {
            file_path: file_path.clone(),
            quality: request.quality,
            format: request.format.clone(),
            output_path: request.output_dir.clone(),
        };

        // Emit batch progress
        let _ = app_handle.emit(
            "batch-progress",
            serde_json::json!({
                "current": index + 1,
                "total": total_files,
                "file_name": Path::new(file_path).file_name()
                    .and_then(|n| n.to_str()).unwrap_or("unknown")
            }),
        );

        match compress_image(compress_request, None, app_handle.clone(), _state.clone()).await {
            Ok(response) => {
                if response.success {
                    successful += 1;
                } else {
                    failed += 1;
                }
                results.push(response);
            }
            Err(e) => {
                failed += 1;
                results.push(CompressImageResponse {
                    success: false,
                    image_id: format!("batch_{}", index),
                    output_path: None,
                    result: None,
                    error: Some(e),
                });
            }
        }
    }

    Ok(CompressBatchResponse {
        total_files,
        successful,
        failed,
        results,
    })
}
