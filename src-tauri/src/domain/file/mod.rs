// File Domain - Functional Architecture
//
// This module provides file I/O operations and path utilities using pure functions
// and data structures, following Rust idioms for safe file handling.

pub mod error;
pub mod metadata;
pub mod operations;
pub mod path;

// Re-export core types and functions for easy access
pub use error::{FileError, FileResult};
pub use metadata::{format_file_size, get_file_extension, is_supported_image_file, FileMetadata};
pub use path::{generate_output_path, PathUtils};

// File operations - core I/O functions
pub use operations::{
    batch_copy_files, cleanup_temp_files, copy_file, create_backup, delete_file, file_exists,
    get_file_info, move_file, read_file, write_file, FileOperation, OperationType,
};

// Convenience functions for common operations

/// Read image file data with validation
pub fn read_image_file<P: AsRef<std::path::Path>>(path: P) -> FileResult<Vec<u8>> {
    let metadata = get_file_info(&path)?;

    if !metadata.is_supported_image() {
        return Err(FileError::UnsupportedFormat(
            metadata.extension.unwrap_or_else(|| "unknown".to_string()),
        ));
    }

    read_file(path)
}

/// Write compressed image with auto-naming
pub fn write_compressed_image<P: AsRef<std::path::Path>>(
    original_path: P,
    compressed_data: &[u8],
    output_format: &str,
    output_dir: Option<P>,
) -> FileResult<String> {
    let output_path = generate_output_path(&original_path, output_format, output_dir.as_ref())?;

    write_file(&output_path, compressed_data)?;

    Ok(output_path.to_string_lossy().to_string())
}

/// Get safe temp file path
pub fn get_temp_file_path(prefix: &str, extension: &str) -> std::path::PathBuf {
    let temp_dir = std::env::temp_dir();
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S_%3f");
    let filename = format!("{}_{}.{}", prefix, timestamp, extension);
    temp_dir.join(filename)
}

/// Validate image file for processing
pub fn validate_image_file<P: AsRef<std::path::Path>>(path: P) -> FileResult<FileMetadata> {
    let metadata = get_file_info(&path)?;

    if !metadata.is_supported_image() {
        return Err(FileError::UnsupportedFormat(format!(
            "Unsupported image format: {:?}",
            metadata.extension
        )));
    }

    // Check file size limits (e.g., max 100MB)
    const MAX_FILE_SIZE: u64 = 100 * 1024 * 1024;
    if metadata.size > MAX_FILE_SIZE {
        return Err(FileError::InvalidPath(format!(
            "File too large: {} bytes (max: {} bytes)",
            metadata.size, MAX_FILE_SIZE
        )));
    }

    Ok(metadata)
}

/// Process multiple image files
pub fn process_image_files<P: AsRef<std::path::Path>>(
    paths: &[P],
    processor: impl Fn(&std::path::Path, &FileMetadata) -> FileResult<()>,
) -> Vec<FileResult<String>> {
    paths
        .iter()
        .map(|path| {
            let path_ref = path.as_ref();
            match validate_image_file(path_ref) {
                Ok(metadata) => match processor(path_ref, &metadata) {
                    Ok(()) => Ok(path_ref.to_string_lossy().to_string()),
                    Err(e) => Err(e),
                },
                Err(e) => Err(e),
            }
        })
        .collect()
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

        // Write test file
        fs::write(&test_path, test_data).unwrap();

        // Validate (will pass basic checks even with fake data)
        let metadata = get_file_info(&test_path).unwrap();
        assert!(metadata.is_image);

        // Read as image file
        let data = read_file(&test_path).unwrap();
        assert_eq!(data, test_data);

        // Write compressed version
        let compressed_data = b"fake compressed data";
        let output_path =
            write_compressed_image(&test_path, compressed_data, "webp", Some(temp_dir.path()))
                .unwrap();

        assert!(std::path::Path::new(&output_path).exists());
        assert!(output_path.ends_with(".webp"));
    }

    #[test]
    fn test_file_operations_workflow() {
        let temp_dir = TempDir::new().unwrap();
        let source_path = temp_dir.path().join("source.txt");
        let test_data = b"Test file content";

        // Create source file
        let write_result = write_file(&source_path, test_data).unwrap();
        assert!(write_result.success);

        // Get file info
        let metadata = get_file_info(&source_path).unwrap();
        assert_eq!(metadata.size, test_data.len() as u64);
        assert_eq!(metadata.name, "source.txt");

        // Create backup
        let backup_path = create_backup(&source_path).unwrap();
        assert!(std::path::Path::new(&backup_path).exists());

        // Copy to new location
        let target_path = temp_dir.path().join("copy.txt");
        let copy_result = copy_file(&source_path, &target_path).unwrap();
        assert!(copy_result.success);

        // Move to another location
        let final_path = temp_dir.path().join("final.txt");
        let move_result = move_file(&target_path, &final_path).unwrap();
        assert!(move_result.success);
        assert!(!file_exists(&target_path));
        assert!(file_exists(&final_path));

        // Clean up
        delete_file(&final_path).unwrap();
        assert!(!file_exists(&final_path));
    }

    #[test]
    fn test_temp_file_generation() {
        let temp_path = get_temp_file_path("test", "jpg");

        // Should be in system temp directory
        assert!(temp_path.to_string_lossy().contains("test_"));
        assert!(temp_path.to_string_lossy().ends_with(".jpg"));

        // Multiple calls should generate different paths
        let temp_path2 = get_temp_file_path("test", "jpg");
        assert_ne!(temp_path, temp_path2);
    }

    #[test]
    fn test_batch_operations() {
        let temp_dir = TempDir::new().unwrap();
        let target_dir = temp_dir.path().join("targets");
        fs::create_dir(&target_dir).unwrap();

        // Create test files
        let files = vec!["file1.txt", "file2.txt", "file3.txt"];
        let file_paths: Vec<_> = files
            .iter()
            .map(|name| {
                let path = temp_dir.path().join(name);
                fs::write(&path, format!("Content of {}", name)).unwrap();
                path
            })
            .collect();

        // Batch copy
        let results = batch_copy_files(&file_paths, &target_dir);
        assert_eq!(results.len(), 3);
        assert!(results.iter().all(|r| r.is_ok()));

        // Verify all files were copied
        for name in files {
            assert!(target_dir.join(name).exists());
        }
    }
}
