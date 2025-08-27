use crate::domain::services::{ImageCompressor, CompressionOutput, CompressionResult, CompressionError};
use crate::domain::entities::{CompressionSettings, OutputFormat};

pub struct OxipngCompressor;

impl ImageCompressor for OxipngCompressor {
    fn compress(&self, data: &[u8], settings: &CompressionSettings) -> CompressionResult<CompressionOutput> {
        if settings.format != OutputFormat::Png {
            return Err(CompressionError::UnsupportedFormat("OxipngCompressor only supports PNG".to_string()));
        }

        // Configuration oxipng optimisée pour la performance
        let options = oxipng::Options {
            optimize_alpha: settings.optimize_alpha,
            ..oxipng::Options::from_preset(2) // Preset 2 = bon compromis vitesse/compression
        };

        match oxipng::optimize_from_memory(data, &options) {
            Ok(compressed_data) => Ok(CompressionOutput::new(data, compressed_data)),
            Err(e) => Err(CompressionError::CompressionFailed(format!("Oxipng error: {}", e))),
        }
    }

    fn supports_format(&self, format: OutputFormat) -> bool {
        matches!(format, OutputFormat::Png)
    }
}

impl Default for OxipngCompressor {
    fn default() -> Self {
        Self
    }
}