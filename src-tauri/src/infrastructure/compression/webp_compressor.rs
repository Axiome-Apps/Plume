use crate::domain::entities::{CompressionSettings, OutputFormat};
use crate::domain::services::{
    CompressionError, CompressionOutput, CompressionResult, ImageCompressor,
};
use image::DynamicImage;

pub struct WebpCompressor;

impl ImageCompressor for WebpCompressor {
    fn compress(
        &self,
        data: &[u8],
        settings: &CompressionSettings,
    ) -> CompressionResult<CompressionOutput> {
        if settings.format != OutputFormat::WebP {
            return Err(CompressionError::UnsupportedFormat(
                "WebpCompressor only supports WebP".to_string(),
            ));
        }

        // Charger l'image avec la crate image
        let img = image::load_from_memory(data).map_err(|_e| CompressionError::InvalidImageData)?;

        // Convertir en RGB/RGBA selon le cas
        let (width, height, rgba_data, has_alpha) = match img {
            DynamicImage::ImageRgba8(rgba_img) => {
                let (w, h) = rgba_img.dimensions();
                (w, h, rgba_img.into_raw(), true)
            }
            other => {
                let rgba_img = other.to_rgba8();
                let (w, h) = rgba_img.dimensions();
                (w, h, rgba_img.into_raw(), false)
            }
        };

        // Configuration WebP
        let quality = settings.quality as f32;

        let compressed_data = if has_alpha {
            // WebP avec canal alpha
            webp::Encoder::from_rgba(&rgba_data, width, height).encode(quality)
        } else {
            // Convertir RGBA en RGB pour WebP sans alpha
            let rgb_data: Vec<u8> = rgba_data
                .chunks(4)
                .flat_map(|chunk| [chunk[0], chunk[1], chunk[2]])
                .collect();

            webp::Encoder::from_rgb(&rgb_data, width, height).encode(quality)
        };

        Ok(CompressionOutput::new(data, compressed_data.to_vec()))
    }

    fn supports_format(&self, format: OutputFormat) -> bool {
        matches!(format, OutputFormat::WebP)
    }
}

impl Default for WebpCompressor {
    fn default() -> Self {
        Self
    }
}
