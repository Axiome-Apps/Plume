use serde::{Deserialize, Serialize};

/// Supported output formats for image compression
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum OutputFormat {
    Png,
    Jpeg,
    WebP,
}

impl OutputFormat {
    /// Returns the file extension for this format
    pub fn extension(&self) -> &'static str {
        match self {
            OutputFormat::Png => "png",
            OutputFormat::Jpeg => "jpg",
            OutputFormat::WebP => "webp",
        }
    }

    /// Parses an output format from a string
    pub fn from_string(format: &str) -> Option<Self> {
        match format.to_lowercase().as_str() {
            "png" => Some(OutputFormat::Png),
            "jpeg" | "jpg" => Some(OutputFormat::Jpeg),
            "webp" => Some(OutputFormat::WebP),
            _ => None,
        }
    }

    /// Returns the MIME type for this format
    pub fn mime_type(&self) -> &'static str {
        match self {
            OutputFormat::Png => "image/png",
            OutputFormat::Jpeg => "image/jpeg",
            OutputFormat::WebP => "image/webp",
        }
    }

    /// Returns true if this format supports lossless compression
    pub fn supports_lossless(&self) -> bool {
        matches!(self, OutputFormat::Png | OutputFormat::WebP)
    }
}

impl std::fmt::Display for OutputFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                OutputFormat::Png => "PNG",
                OutputFormat::Jpeg => "JPEG",
                OutputFormat::WebP => "WebP",
            }
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_extension() {
        assert_eq!(OutputFormat::Png.extension(), "png");
        assert_eq!(OutputFormat::Jpeg.extension(), "jpg");
        assert_eq!(OutputFormat::WebP.extension(), "webp");
    }

    #[test]
    fn test_from_string() {
        assert_eq!(OutputFormat::from_string("png"), Some(OutputFormat::Png));
        assert_eq!(OutputFormat::from_string("JPG"), Some(OutputFormat::Jpeg));
        assert_eq!(OutputFormat::from_string("webp"), Some(OutputFormat::WebP));
        assert_eq!(OutputFormat::from_string("unknown"), None);
    }

    #[test]
    fn test_lossless_support() {
        assert!(OutputFormat::Png.supports_lossless());
        assert!(OutputFormat::WebP.supports_lossless());
        assert!(!OutputFormat::Jpeg.supports_lossless());
    }
}
