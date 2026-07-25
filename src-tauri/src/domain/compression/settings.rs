use crate::domain::compression::formats::OutputFormat;
use serde::{Deserialize, Serialize};

/// Quality applied when the frontend does not specify one.
pub const DEFAULT_QUALITY: u8 = 80;

/// Configuration settings for image compression operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionSettings {
    pub quality: u8,
    pub format: OutputFormat,
}

impl CompressionSettings {
    /// Creates new compression settings with the specified quality and format
    pub fn new(quality: u8, format: OutputFormat) -> Self {
        Self {
            quality: quality.clamp(1, 100),
            format,
        }
    }

    /// Validates the settings
    pub fn is_valid(&self) -> bool {
        (1..=100).contains(&self.quality)
    }

    /// Determines the optimal output format for the given input format
    /// Returns WebP for best compression, or original format when preserving
    // The arms currently all resolve to WebP; they are kept explicit to document
    // the per-input decision surface should a format ever diverge.
    #[allow(clippy::match_same_arms)]
    pub fn optimal_format_for_input(input_format: &str) -> OutputFormat {
        match input_format.to_lowercase().as_str() {
            "png" => OutputFormat::WebP,          // PNG -> WebP for better savings
            "jpg" | "jpeg" => OutputFormat::WebP, // JPEG -> WebP
            "webp" => OutputFormat::WebP,         // WebP -> WebP (re-compression)
            _ => OutputFormat::WebP,              // WebP by default
        }
    }

    /// Returns the same format as input (for preserving original format)
    // WebP, HEIC and the fallback all resolve to WebP; the arms stay explicit so
    // the preserve-vs-transcode intent per input format is readable.
    #[allow(clippy::match_same_arms)]
    pub fn preserve_input_format(input_format: &str) -> OutputFormat {
        match input_format.to_lowercase().as_str() {
            "png" => OutputFormat::Png,
            "jpg" | "jpeg" => OutputFormat::Jpeg,
            "webp" => OutputFormat::WebP,
            "heic" | "heif" => OutputFormat::WebP, // HEIC cannot be preserved, default to WebP
            _ => OutputFormat::WebP,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quality_clamping() {
        let settings = CompressionSettings::new(150, OutputFormat::WebP);
        assert_eq!(settings.quality, 100);

        let settings = CompressionSettings::new(0, OutputFormat::WebP);
        assert_eq!(settings.quality, 1);
    }
}
