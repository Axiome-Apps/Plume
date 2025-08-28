use crate::domain::entities::{CompressionSettings, OutputFormat};
use std::path::Path;

#[derive(Debug, thiserror::Error)]
pub enum CompressionError {
    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),
    #[error("Invalid image data")]
    InvalidImageData,
    #[error("Compression failed: {0}")]
    CompressionFailed(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub type CompressionResult<T> = Result<T, CompressionError>;

#[derive(Debug, Clone)]
pub struct CompressionOutput {
    pub compressed_data: Vec<u8>,
    pub original_size: u64,
    pub compressed_size: u64,
    pub savings_percent: f64,
}

impl CompressionOutput {
    pub fn new(original_data: &[u8], compressed_data: Vec<u8>) -> Self {
        let original_size = original_data.len() as u64;
        let compressed_size = compressed_data.len() as u64;
        let savings_percent = if original_size > 0 {
            ((original_size - compressed_size) as f64 / original_size as f64) * 100.0
        } else {
            0.0
        };

        Self {
            compressed_data,
            original_size,
            compressed_size,
            savings_percent,
        }
    }
}

pub trait ImageCompressor {
    fn compress(
        &self,
        data: &[u8],
        settings: &CompressionSettings,
    ) -> CompressionResult<CompressionOutput>;
    fn supports_format(&self, format: OutputFormat) -> bool;
}

pub struct CompressionService {
    compressors: std::collections::HashMap<OutputFormat, Box<dyn ImageCompressor + Send + Sync>>,
}

impl CompressionService {
    pub fn new() -> Self {
        Self {
            compressors: std::collections::HashMap::new(),
        }
    }

    pub fn register_compressor<C>(&mut self, format: OutputFormat, compressor: C)
    where
        C: ImageCompressor + Send + Sync + 'static,
    {
        self.compressors.insert(format, Box::new(compressor));
    }

    pub fn compress_image(
        &self,
        image_data: &[u8],
        settings: &CompressionSettings,
    ) -> CompressionResult<CompressionOutput> {
        let compressor = self
            .compressors
            .get(&settings.format)
            .ok_or_else(|| CompressionError::UnsupportedFormat(format!("{:?}", settings.format)))?;

        if !compressor.supports_format(settings.format) {
            return Err(CompressionError::UnsupportedFormat(format!(
                "{:?}",
                settings.format
            )));
        }

        compressor.compress(image_data, settings)
    }

    pub fn auto_compress(
        &self,
        image_data: &[u8],
        input_format: &str,
        quality: u8,
    ) -> CompressionResult<CompressionOutput> {
        let optimal_format = CompressionSettings::optimal_format_for_input(input_format);
        let settings = CompressionSettings::new(quality, optimal_format);

        self.compress_image(image_data, &settings)
    }

    pub fn detect_format(data: &[u8]) -> Option<String> {
        if data.len() < 8 {
            return None;
        }

        // PNG signature
        if data.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
            return Some("PNG".to_string());
        }

        // JPEG signature
        if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
            return Some("JPEG".to_string());
        }

        // WebP signature
        if data.len() >= 12 && data.starts_with(b"RIFF") && &data[8..12] == b"WEBP" {
            return Some("WEBP".to_string());
        }

        None
    }

    pub fn generate_output_path(input_path: &Path, format: OutputFormat) -> std::path::PathBuf {
        let stem = input_path.file_stem().unwrap_or_default();
        let parent = input_path.parent().unwrap_or_else(|| Path::new("."));

        parent.join(format!(
            "{}_compressed.{}",
            stem.to_string_lossy(),
            format.extension()
        ))
    }
}

impl Default for CompressionService {
    fn default() -> Self {
        Self::new()
    }
}
