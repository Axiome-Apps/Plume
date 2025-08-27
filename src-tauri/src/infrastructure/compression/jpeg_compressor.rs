use crate::domain::services::{ImageCompressor, CompressionOutput, CompressionResult, CompressionError};
use crate::domain::entities::{CompressionSettings, OutputFormat};
use std::io::Cursor;

pub struct JpegCompressor;

impl ImageCompressor for JpegCompressor {
    fn compress(&self, data: &[u8], settings: &CompressionSettings) -> CompressionResult<CompressionOutput> {
        if settings.format != OutputFormat::Jpeg {
            return Err(CompressionError::UnsupportedFormat("JpegCompressor only supports JPEG".to_string()));
        }

        // Charger l'image
        let img = image::load_from_memory(data)
            .map_err(|_| CompressionError::InvalidImageData)?;

        // Convertir en RGB (JPEG ne supporte pas la transparence)
        let rgb_img = img.to_rgb8();

        // Compression JPEG
        let mut compressed_data = Vec::new();
        let mut cursor = Cursor::new(&mut compressed_data);
        
        // Utiliser l'encodeur JPEG avec qualité personnalisée
        let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut cursor, settings.quality);
        
        rgb_img.write_with_encoder(encoder)
            .map_err(|e| CompressionError::CompressionFailed(format!("JPEG encoding error: {}", e)))?;

        Ok(CompressionOutput::new(data, compressed_data))
    }

    fn supports_format(&self, format: OutputFormat) -> bool {
        matches!(format, OutputFormat::Jpeg)
    }
}

impl Default for JpegCompressor {
    fn default() -> Self {
        Self
    }
}