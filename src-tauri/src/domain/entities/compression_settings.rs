use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum OutputFormat {
    Png,
    Jpeg,
    WebP,
}

impl OutputFormat {
    pub fn extension(&self) -> &'static str {
        match self {
            OutputFormat::Png => "png",
            OutputFormat::Jpeg => "jpg",
            OutputFormat::WebP => "webp",
        }
    }

    pub fn from_string(format: &str) -> Option<Self> {
        match format.to_lowercase().as_str() {
            "png" => Some(OutputFormat::Png),
            "jpeg" | "jpg" => Some(OutputFormat::Jpeg),
            "webp" => Some(OutputFormat::WebP),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionSettings {
    pub quality: u8,
    pub format: OutputFormat,
    pub preserve_metadata: bool,
    pub optimize_alpha: bool,
}

impl CompressionSettings {
    pub fn new(quality: u8, format: OutputFormat) -> Self {
        Self {
            quality: quality.clamp(1, 100),
            format,
            preserve_metadata: false,
            optimize_alpha: true,
        }
    }

    pub fn with_quality(mut self, quality: u8) -> Self {
        self.quality = quality.clamp(1, 100);
        self
    }

    pub fn with_metadata_preservation(mut self, preserve: bool) -> Self {
        self.preserve_metadata = preserve;
        self
    }

    pub fn with_alpha_optimization(mut self, optimize: bool) -> Self {
        self.optimize_alpha = optimize;
        self
    }

    pub fn is_valid(&self) -> bool {
        (1..=100).contains(&self.quality)
    }

    /// Détermine le format de sortie optimal basé sur le format d'entrée
    pub fn optimal_format_for_input(input_format: &str) -> OutputFormat {
        match input_format.to_lowercase().as_str() {
            "png" => OutputFormat::WebP, // PNG -> WebP pour de meilleures économies
            "jpg" | "jpeg" => OutputFormat::WebP, // JPEG -> WebP
            "webp" => OutputFormat::WebP, // WebP -> WebP (re-compression)
            _ => OutputFormat::WebP, // Par défaut WebP
        }
    }
}

impl Default for CompressionSettings {
    fn default() -> Self {
        Self::new(80, OutputFormat::WebP)
    }
}