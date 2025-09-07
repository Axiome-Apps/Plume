use crate::domain::compression::{
    error::{CompressionError, CompressionResult},
    formats::OutputFormat,
    settings::CompressionSettings,
    stats::{create_stat, CompressionStat},
};
use std::path::Path;

/// Result of a compression operation
#[derive(Debug, Clone)]
pub struct CompressionOutput {
    pub output_path: std::path::PathBuf,
    pub original_size: u64,
    pub compressed_size: u64,
    pub format: OutputFormat,
    pub savings_percent: f64,
}

impl CompressionOutput {
    pub fn new(
        output_path: std::path::PathBuf,
        original_size: u64,
        compressed_size: u64,
        format: OutputFormat,
    ) -> Self {
        let savings_percent = if original_size > 0 {
            ((original_size - compressed_size) as f64 / original_size as f64) * 100.0
        } else {
            0.0
        };

        Self {
            output_path,
            original_size,
            compressed_size,
            format,
            savings_percent,
        }
    }
}

/// Compress image file-to-file using the specified settings
pub fn compress_file_to_file<P: AsRef<Path>>(
    input_path: P,
    output_path: P,
    settings: &CompressionSettings,
) -> CompressionResult<CompressionOutput> {
    validate_settings(settings)?;

    let input_path = input_path.as_ref();
    let output_path = output_path.as_ref();

    // Get original file size
    let original_size = std::fs::metadata(input_path)
        .map_err(|e| CompressionError::IoError(format!("Failed to get file metadata: {}", e)))?
        .len();

    // Determine input format from extension
    let input_format = input_path
        .extension()
        .and_then(|ext| ext.to_str())
        .ok_or_else(|| CompressionError::UnsupportedFormat("No file extension".to_string()))?;

    // Route to appropriate compression function based on target format
    match settings.format {
        OutputFormat::WebP => {
            compress_to_webp_file(input_path, output_path, input_format, settings)?
        }
        OutputFormat::Png => compress_to_png_file(input_path, output_path, input_format, settings)?,
        OutputFormat::Jpeg => {
            compress_to_jpeg_file(input_path, output_path, input_format, settings)?
        }
    };

    // Get compressed file size
    let compressed_size = std::fs::metadata(output_path)
        .map_err(|e| {
            CompressionError::IoError(format!("Failed to get output file metadata: {}", e))
        })?
        .len();

    Ok(CompressionOutput::new(
        output_path.to_path_buf(),
        original_size,
        compressed_size,
        settings.format,
    ))
}

/// Compress multiple images in batch (file-to-file)
pub fn compress_batch_files(
    files: Vec<(std::path::PathBuf, std::path::PathBuf)>, // (input_path, output_path) pairs
    settings: &CompressionSettings,
) -> Vec<CompressionResult<CompressionOutput>> {
    files
        .into_iter()
        .map(|(input_path, output_path)| compress_file_to_file(input_path, output_path, settings))
        .collect()
}

/// Legacy function - use compress_file_to_file instead
#[deprecated(note = "Use compress_file_to_file for better memory efficiency")]
pub fn compress_file<P: AsRef<Path>>(
    file_path: P,
    settings: &CompressionSettings,
) -> CompressionResult<CompressionOutput> {
    let input_path = file_path.as_ref();

    // Create output path with new extension
    let mut output_path = input_path.to_path_buf();
    let new_extension = match settings.format {
        OutputFormat::WebP => "webp",
        OutputFormat::Png => "png",
        OutputFormat::Jpeg => "jpg",
    };
    output_path.set_extension(new_extension);

    compress_file_to_file(input_path, &output_path, settings)
}

/// Create a compression statistic from the operation result
pub fn create_compression_stat(
    input_format: &str,
    output: &CompressionOutput,
    settings: &CompressionSettings,
) -> CompressionStat {
    create_stat(
        input_format.to_string(),
        output.format.to_string().to_lowercase(),
        output.original_size,
        output.compressed_size,
        settings,
    )
}

// Private compression functions for each format (file-to-file)

fn compress_to_webp_file(
    input_path: &Path,
    output_path: &Path,
    input_format: &str,
    settings: &CompressionSettings,
) -> CompressionResult<()> {
    // Read image file data
    let input_data = std::fs::read(input_path)
        .map_err(|e| CompressionError::IoError(format!("Failed to read input file: {}", e)))?;
    use image::ImageFormat;

    // Décode l'image selon le format d'entrée
    let img = match input_format.to_lowercase().as_str() {
        "png" => image::load_from_memory_with_format(&input_data, ImageFormat::Png),
        "jpg" | "jpeg" => image::load_from_memory_with_format(&input_data, ImageFormat::Jpeg),
        "webp" => image::load_from_memory_with_format(&input_data, ImageFormat::WebP),
        _ => {
            return Err(CompressionError::UnsupportedFormat(format!(
                "Format {} non supporté",
                input_format
            )))
        }
    }
    .map_err(|e| CompressionError::ProcessingError(format!("Erreur décodage image: {}", e)))?;

    // Encode en WebP avec webp crate
    let rgba_img = img.to_rgba8();
    let (width, height) = rgba_img.dimensions();

    let encoder = webp::Encoder::from_rgba(rgba_img.as_raw(), width, height);

    let encoded = if settings.quality >= 90 {
        // Mode lossless pour qualité élevée
        encoder.encode_lossless()
    } else {
        // Mode lossy avec qualité spécifiée
        encoder.encode(settings.quality as f32)
    };

    // Write directly to output file
    std::fs::write(output_path, &*encoded)
        .map_err(|e| CompressionError::IoError(format!("Failed to write output file: {}", e)))?;

    Ok(())
}

fn compress_to_png_file(
    input_path: &Path,
    output_path: &Path,
    input_format: &str,
    _settings: &CompressionSettings,
) -> CompressionResult<()> {
    use image::ImageFormat;

    match input_format.to_lowercase().as_str() {
        "png" => {
            // Pour PNG -> PNG, utilise oxipng directement sur les fichiers
            let options = oxipng::Options::from_preset(3); // Preset 3 = bon compromis vitesse/compression
            let input_data = std::fs::read(input_path).map_err(|e| {
                CompressionError::IoError(format!("Failed to read PNG file: {}", e))
            })?;
            match oxipng::optimize_from_memory(&input_data, &options) {
                Ok(optimized_data) => {
                    // Écrire les données optimisées vers le fichier de sortie
                    std::fs::write(output_path, optimized_data).map_err(|e| {
                        CompressionError::IoError(format!("Failed to write optimized PNG: {}", e))
                    })?;
                    return Ok(());
                }
                Err(_) => {
                    // Fallback: copie le fichier original
                    std::fs::copy(input_path, output_path).map_err(|e| {
                        CompressionError::IoError(format!("Failed to copy PNG file: {}", e))
                    })?;
                    return Ok(());
                }
            }
        }
        "jpg" | "jpeg" | "webp" => {
            // Pour autres formats -> PNG, on doit décoder/encoder
            let input_data = std::fs::read(input_path).map_err(|e| {
                CompressionError::IoError(format!("Failed to read input file: {}", e))
            })?;

            let img_format = match input_format {
                "jpg" | "jpeg" => ImageFormat::Jpeg,
                "webp" => ImageFormat::WebP,
                _ => unreachable!(),
            };

            let img =
                image::load_from_memory_with_format(&input_data, img_format).map_err(|e| {
                    CompressionError::ProcessingError(format!("Erreur décodage image: {}", e))
                })?;

            // Encode en PNG directement vers le fichier
            let output_file = std::fs::File::create(output_path).map_err(|e| {
                CompressionError::IoError(format!("Failed to create output file: {}", e))
            })?;

            let mut writer = std::io::BufWriter::new(output_file);
            img.write_to(&mut writer, ImageFormat::Png).map_err(|e| {
                CompressionError::ProcessingError(format!("Erreur encodage PNG: {}", e))
            })?;

            // Optimise le fichier PNG généré avec oxipng
            let options = oxipng::Options::from_preset(3);
            if let Ok(png_data) = std::fs::read(output_path) {
                if let Ok(optimized_data) = oxipng::optimize_from_memory(&png_data, &options) {
                    let _ = std::fs::write(output_path, optimized_data); // Ignore les erreurs d'optimisation
                }
            }
        }
        _ => {
            return Err(CompressionError::UnsupportedFormat(format!(
                "Format {} non supporté pour PNG",
                input_format
            )))
        }
    }

    Ok(())
}

fn compress_to_jpeg_file(
    input_path: &Path,
    output_path: &Path,
    input_format: &str,
    settings: &CompressionSettings,
) -> CompressionResult<()> {
    use image::ImageFormat;

    // Read input file data
    let input_data = std::fs::read(input_path)
        .map_err(|e| CompressionError::IoError(format!("Failed to read input file: {}", e)))?;

    // Décode l'image selon le format d'entrée
    let img = match input_format.to_lowercase().as_str() {
        "png" => image::load_from_memory_with_format(&input_data, ImageFormat::Png),
        "jpg" | "jpeg" => image::load_from_memory_with_format(&input_data, ImageFormat::Jpeg),
        "webp" => image::load_from_memory_with_format(&input_data, ImageFormat::WebP),
        _ => {
            return Err(CompressionError::UnsupportedFormat(format!(
                "Format {} non supporté pour JPEG",
                input_format
            )))
        }
    }
    .map_err(|e| CompressionError::ProcessingError(format!("Erreur décodage image: {}", e)))?;

    // Convertit en RGB (JPEG ne supporte pas la transparence)
    let rgb_img = img.to_rgb8();

    // Create output file and encode directly to it
    let output_file = std::fs::File::create(output_path)
        .map_err(|e| CompressionError::IoError(format!("Failed to create output file: {}", e)))?;

    let mut writer = std::io::BufWriter::new(output_file);
    let mut encoder =
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut writer, settings.quality);
    let (width, height) = rgb_img.dimensions();

    encoder
        .encode(
            rgb_img.as_raw(),
            width,
            height,
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|e| CompressionError::ProcessingError(format!("Erreur encodage JPEG: {}", e)))?;

    Ok(())
}

// Helper functions

fn validate_settings(settings: &CompressionSettings) -> CompressionResult<()> {
    if !settings.is_valid() {
        return Err(CompressionError::InvalidSettings(format!(
            "Invalid quality setting: {}",
            settings.quality
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_output_creation() {
        let output_path = std::path::PathBuf::from("/tmp/test.webp");
        let output = CompressionOutput::new(output_path.clone(), 1000, 5, OutputFormat::WebP);

        assert_eq!(output.output_path, output_path);
        assert_eq!(output.original_size, 1000);
        assert_eq!(output.compressed_size, 5);
        assert!(output.savings_percent > 99.0); // 995/1000 * 100
    }

    // Note: file-based tests would require actual test files
    // These are placeholder tests - real tests should use temporary files
    #[test]
    fn test_settings_validation() {
        let settings = CompressionSettings::new(80, OutputFormat::WebP);
        assert!(validate_settings(&settings).is_ok());

        let mut invalid_settings = CompressionSettings::new(80, OutputFormat::WebP);
        invalid_settings.quality = 200; // Invalid quality
        assert!(validate_settings(&invalid_settings).is_err());
    }
}
