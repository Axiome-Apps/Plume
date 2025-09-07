use crate::domain::compression::formats::OutputFormat;
use serde::{Deserialize, Serialize};

/// Configuration settings for image compression operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionSettings {
    pub quality: u8,
    pub format: OutputFormat,
    pub preserve_metadata: bool,
    pub optimize_alpha: bool,
}

impl CompressionSettings {
    /// Creates new compression settings with the specified quality and format
    pub fn new(quality: u8, format: OutputFormat) -> Self {
        Self {
            quality: quality.clamp(1, 100),
            format,
            preserve_metadata: false,
            optimize_alpha: true,
        }
    }

    /// Sets the quality level (1-100)
    pub fn with_quality(mut self, quality: u8) -> Self {
        self.quality = quality.clamp(1, 100);
        self
    }

    /// Sets metadata preservation
    pub fn with_metadata_preservation(mut self, preserve: bool) -> Self {
        self.preserve_metadata = preserve;
        self
    }

    /// Sets alpha channel optimization
    pub fn with_alpha_optimization(mut self, optimize: bool) -> Self {
        self.optimize_alpha = optimize;
        self
    }

    /// Validates the settings
    pub fn is_valid(&self) -> bool {
        (1..=100).contains(&self.quality)
    }

    /// Determines the optimal output format for the given input format
    /// Returns WebP for best compression, or original format when preserving
    pub fn optimal_format_for_input(input_format: &str) -> OutputFormat {
        match input_format.to_lowercase().as_str() {
            "png" => OutputFormat::WebP, // PNG -> WebP pour de meilleures économies
            "jpg" | "jpeg" => OutputFormat::WebP, // JPEG -> WebP
            "webp" => OutputFormat::WebP, // WebP -> WebP (re-compression)
            _ => OutputFormat::WebP,     // Par défaut WebP
        }
    }

    /// Returns the same format as input (for preserving original format)
    pub fn preserve_input_format(input_format: &str) -> OutputFormat {
        match input_format.to_lowercase().as_str() {
            "png" => OutputFormat::Png,
            "jpg" | "jpeg" => OutputFormat::Jpeg,
            "webp" => OutputFormat::WebP,
            _ => OutputFormat::WebP, // Fallback vers WebP pour formats inconnus
        }
    }
}

impl Default for CompressionSettings {
    fn default() -> Self {
        Self::new(80, OutputFormat::WebP)
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

    #[test]
    fn test_optimal_format() {
        assert_eq!(
            CompressionSettings::optimal_format_for_input("png"),
            OutputFormat::WebP
        );
        assert_eq!(
            CompressionSettings::optimal_format_for_input("jpg"),
            OutputFormat::WebP
        );
        assert_eq!(
            CompressionSettings::optimal_format_for_input("unknown"),
            OutputFormat::WebP
        );
    }
}
