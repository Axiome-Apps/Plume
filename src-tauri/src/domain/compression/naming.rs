use crate::domain::file::PathUtils;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Compression level requested by the user.
///
/// Serialized as the lowercase names the frontend sends ("light", "balanced",
/// "aggressive"); anything else fails deserialization rather than silently
/// falling back to a default.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CompressionLevel {
    Light,
    Balanced,
    Aggressive,
}

impl CompressionLevel {
    /// Suffix appended to the output file name
    pub fn suffix(self) -> &'static str {
        match self {
            CompressionLevel::Light => "light",
            CompressionLevel::Balanced => "balanced",
            CompressionLevel::Aggressive => "aggressive",
        }
    }
}

/// Name used when the input path carries no usable file stem
const FALLBACK_STEM: &str = "compressed";

/// Resolve where a compressed file should be written.
///
/// Without an explicit destination the output sits next to the input, named
/// `{stem}_{level}.{extension}` (ADR-0003): the same parameters overwrite the
/// previous result, different parameters produce a new file.
///
/// An explicit destination is honoured as-is when it names a file, or receives
/// `{stem}.{extension}` when it names an existing directory.
pub fn resolve_output_path(
    input: &Path,
    destination: Option<&Path>,
    level: CompressionLevel,
    extension: &str,
) -> PathBuf {
    let stem = PathUtils::get_file_stem(input).unwrap_or_else(|_| FALLBACK_STEM.to_string());

    match destination {
        Some(path) if path.is_dir() => path.join(format!("{}.{}", stem, extension)),
        Some(path) => path.to_path_buf(),
        None => {
            let mut output = input.to_path_buf();
            output.set_file_name(format!("{}_{}.{}", stem, level.suffix(), extension));
            output
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_output_sits_next_to_input_with_level_suffix() {
        let input = Path::new("/home/user/Pictures/photo.png");

        assert_eq!(
            resolve_output_path(input, None, CompressionLevel::Balanced, "webp"),
            PathBuf::from("/home/user/Pictures/photo_balanced.webp")
        );
        assert_eq!(
            resolve_output_path(input, None, CompressionLevel::Light, "webp"),
            PathBuf::from("/home/user/Pictures/photo_light.webp")
        );
        assert_eq!(
            resolve_output_path(input, None, CompressionLevel::Aggressive, "jpg"),
            PathBuf::from("/home/user/Pictures/photo_aggressive.jpg")
        );
    }

    #[test]
    fn test_same_parameters_resolve_to_the_same_path() {
        let input = Path::new("/tmp/photo.png");
        let first = resolve_output_path(input, None, CompressionLevel::Balanced, "webp");
        let second = resolve_output_path(input, None, CompressionLevel::Balanced, "webp");

        assert_eq!(first, second);
    }

    #[test]
    fn test_explicit_file_destination_is_honoured() {
        let input = Path::new("/tmp/photo.png");
        let destination = Path::new("/tmp/custom-name.webp");

        assert_eq!(
            resolve_output_path(input, Some(destination), CompressionLevel::Light, "webp"),
            PathBuf::from("/tmp/custom-name.webp")
        );
    }

    #[test]
    fn test_level_deserializes_from_frontend_values() {
        assert_eq!(
            serde_json::from_str::<CompressionLevel>("\"light\"").unwrap(),
            CompressionLevel::Light
        );
        assert_eq!(
            serde_json::from_str::<CompressionLevel>("\"aggressive\"").unwrap(),
            CompressionLevel::Aggressive
        );
        assert!(serde_json::from_str::<CompressionLevel>("\"turbo\"").is_err());
    }
}
