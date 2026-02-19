use serde::{Deserialize, Serialize};

/// Supported input formats for image decoding
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum InputFormat {
    Png,
    Jpeg,
    WebP,
    Heic,
}

impl InputFormat {
    /// Parses an input format from a file extension string
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().as_str() {
            "png" => Some(InputFormat::Png),
            "jpg" | "jpeg" => Some(InputFormat::Jpeg),
            "webp" => Some(InputFormat::WebP),
            "heic" | "heif" => Some(InputFormat::Heic),
            _ => None,
        }
    }

    /// Returns true if this format requires transcoding (no direct output possible)
    pub fn requires_transcoding(&self) -> bool {
        matches!(self, InputFormat::Heic)
    }
}

impl std::fmt::Display for InputFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                InputFormat::Png => "PNG",
                InputFormat::Jpeg => "JPEG",
                InputFormat::WebP => "WebP",
                InputFormat::Heic => "HEIC",
            }
        )
    }
}

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

    #[test]
    fn test_input_format_from_extension() {
        assert_eq!(InputFormat::from_extension("heic"), Some(InputFormat::Heic));
        assert_eq!(InputFormat::from_extension("HEIF"), Some(InputFormat::Heic));
        assert_eq!(InputFormat::from_extension("png"), Some(InputFormat::Png));
        assert_eq!(InputFormat::from_extension("jpg"), Some(InputFormat::Jpeg));
        assert_eq!(InputFormat::from_extension("unknown"), None);
    }

    #[test]
    fn test_input_format_requires_transcoding() {
        assert!(InputFormat::Heic.requires_transcoding());
        assert!(!InputFormat::Png.requires_transcoding());
        assert!(!InputFormat::Jpeg.requires_transcoding());
        assert!(!InputFormat::WebP.requires_transcoding());
    }
}
