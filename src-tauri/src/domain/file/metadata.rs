use crate::domain::file::error::{FileError, FileResult};
use crate::domain::file::path::validate_safe_path;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Single source of truth for the image extensions Plume can compress. The file
/// picker filter, the `is_supported_image` guard and the folder scanner all
/// derive from this list, so they can never drift apart. (The frontend keeps its
/// own typed SSOT in `domain/constants.ts`; without shared codegen the two sides
/// are synced by hand — this is the single Rust-side point.)
pub const SUPPORTED_IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "heic", "heif"];

/// Whether a bare, lowercased extension is one Plume can compress.
pub fn is_supported_extension(extension: &str) -> bool {
    SUPPORTED_IMAGE_EXTENSIONS.contains(&extension)
}

/// Check whether a path points to an existing file
pub fn file_exists<P: AsRef<Path>>(path: P) -> bool {
    path.as_ref().exists() && path.as_ref().is_file()
}

/// Read the metadata of a file, rejecting unsafe paths
pub fn get_file_info<P: AsRef<Path>>(path: P) -> FileResult<FileMetadata> {
    validate_safe_path(&path)?;

    if !file_exists(&path) {
        return Err(FileError::NotFound(
            path.as_ref().to_string_lossy().to_string(),
        ));
    }

    FileMetadata::from_path(path)
}

/// File metadata information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size: u64,
    pub is_image: bool,
}

impl FileMetadata {
    /// Create metadata from a file path
    pub fn from_path<P: AsRef<Path>>(path: P) -> FileResult<Self> {
        let path_ref = path.as_ref();
        let metadata = std::fs::metadata(path_ref)?;

        let name = path_ref
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| FileError::InvalidPath("Cannot extract file name".to_string()))?
            .to_string();

        let extension = path_ref
            .extension()
            .and_then(|ext| ext.to_str())
            .map(str::to_lowercase);

        let is_image = extension.as_ref().is_some_and(|ext| {
            matches!(
                ext.as_str(),
                "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp" | "tiff" | "heic" | "heif"
            )
        });

        Ok(FileMetadata {
            path: path_ref.to_string_lossy().to_string(),
            name,
            extension,
            size: metadata.len(),
            is_image,
        })
    }

    /// Check if file is a supported image format
    pub fn is_supported_image(&self) -> bool {
        self.is_image
            && self
                .extension
                .as_ref()
                .is_some_and(|ext| is_supported_extension(ext))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_is_supported_extension_matches_the_ssot() {
        for ext in SUPPORTED_IMAGE_EXTENSIONS {
            assert!(is_supported_extension(ext), "{ext} should be supported");
        }
        assert!(!is_supported_extension("gif"));
        assert!(!is_supported_extension("txt"));
        assert!(!is_supported_extension("PNG")); // callers pass a lowercased ext
    }

    #[test]
    fn test_metadata_from_path() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().join("photo.JPG");
        fs::write(&path, b"data").unwrap();

        let metadata = get_file_info(&path).unwrap();
        assert_eq!(metadata.name, "photo.JPG");
        assert_eq!(metadata.extension, Some("jpg".to_string()));
        assert_eq!(metadata.size, 4);
        assert!(metadata.is_supported_image());
    }

    #[test]
    fn test_unsupported_extension_is_not_an_image() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().join("note.txt");
        fs::write(&path, b"data").unwrap();

        assert!(!get_file_info(&path).unwrap().is_supported_image());
    }

    #[test]
    fn test_missing_file_is_reported_as_not_found() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().join("absent.png");

        assert!(matches!(get_file_info(&path), Err(FileError::NotFound(_))));
    }
}
