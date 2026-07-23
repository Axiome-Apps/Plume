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
    fn test_from_string() {
        assert_eq!(OutputFormat::from_string("png"), Some(OutputFormat::Png));
        assert_eq!(OutputFormat::from_string("JPG"), Some(OutputFormat::Jpeg));
        assert_eq!(OutputFormat::from_string("webp"), Some(OutputFormat::WebP));
        assert_eq!(OutputFormat::from_string("unknown"), None);
    }

}
