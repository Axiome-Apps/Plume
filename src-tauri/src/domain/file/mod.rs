// File Domain - Functional Architecture
//
// This module provides file metadata and path utilities using pure functions
// and data structures, following Rust idioms for safe file handling.

pub mod error;
pub mod metadata;
pub mod path;

// Re-export core types and functions for easy access
pub use error::{FileError, FileResult};
pub use metadata::{
    FileMetadata, SUPPORTED_IMAGE_EXTENSIONS, file_exists, get_file_info, is_supported_extension,
};
pub use path::{get_file_stem, validate_safe_path};

/// Largest input accepted for compression
const MAX_FILE_SIZE: u64 = 100 * 1024 * 1024;

/// Validate image file for processing
pub fn validate_image_file<P: AsRef<std::path::Path>>(path: P) -> FileResult<FileMetadata> {
    let metadata = get_file_info(&path)?;

    if !metadata.is_supported_image() {
        return Err(FileError::UnsupportedFormat(format!(
            "Unsupported image format: {:?}",
            metadata.extension
        )));
    }

    if metadata.size > MAX_FILE_SIZE {
        return Err(FileError::InvalidPath(format!(
            "File too large: {} bytes (max: {} bytes)",
            metadata.size, MAX_FILE_SIZE
        )));
    }

    Ok(metadata)
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_image_workflow() {
        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("test.jpg");
        let test_data = b"fake jpeg data";

        fs::write(&test_path, test_data).unwrap();

        let metadata = get_file_info(&test_path).unwrap();
        assert!(metadata.is_image);

        assert!(validate_image_file(&test_path).is_ok());

        // Unsupported format should fail
        let txt_path = temp_dir.path().join("test.txt");
        fs::write(&txt_path, b"not an image").unwrap();
        assert!(validate_image_file(&txt_path).is_err());
    }

    #[test]
    fn test_get_file_info_rejects_traversal() {
        let temp_dir = TempDir::new().unwrap();
        let traversal = temp_dir.path().join("../escaped.jpg");

        assert!(matches!(
            get_file_info(&traversal),
            Err(FileError::SecurityViolation(_))
        ));
    }
}
