use crate::domain::file::{
    error::{FileError, FileResult},
    metadata::FileMetadata,
    path::PathUtils,
};
use std::path::Path;

/// File operation result
#[derive(Debug, Clone)]
pub struct FileOperation {
    pub source_path: String,
    pub target_path: String,
    pub operation_type: OperationType,
    pub bytes_processed: u64,
    pub success: bool,
}

#[derive(Debug, Clone)]
pub enum OperationType {
    Read,
    Write,
    Copy,
    Move,
    Delete,
}

/// Read file data
pub fn read_file<P: AsRef<Path>>(path: P) -> FileResult<Vec<u8>> {
    PathUtils::validate_safe_path(&path)?;

    let data = std::fs::read(&path)?;
    Ok(data)
}

/// Write file data
pub fn write_file<P: AsRef<Path>>(path: P, data: &[u8]) -> FileResult<FileOperation> {
    PathUtils::validate_safe_path(&path)?;

    // Ensure parent directory exists
    if let Some(parent) = path.as_ref().parent() {
        PathUtils::ensure_dir_exists(parent)?;
    }

    std::fs::write(&path, data)?;

    Ok(FileOperation {
        source_path: String::new(),
        target_path: path.as_ref().to_string_lossy().to_string(),
        operation_type: OperationType::Write,
        bytes_processed: data.len() as u64,
        success: true,
    })
}

/// Copy file to new location
pub fn copy_file<P: AsRef<Path>, Q: AsRef<Path>>(
    source: P,
    target: Q,
) -> FileResult<FileOperation> {
    PathUtils::validate_safe_path(&source)?;
    PathUtils::validate_safe_path(&target)?;

    // Ensure target directory exists
    if let Some(parent) = target.as_ref().parent() {
        PathUtils::ensure_dir_exists(parent)?;
    }

    let bytes_copied = std::fs::copy(&source, &target)?;

    Ok(FileOperation {
        source_path: source.as_ref().to_string_lossy().to_string(),
        target_path: target.as_ref().to_string_lossy().to_string(),
        operation_type: OperationType::Copy,
        bytes_processed: bytes_copied,
        success: true,
    })
}

/// Move file to new location
pub fn move_file<P: AsRef<Path>, Q: AsRef<Path>>(
    source: P,
    target: Q,
) -> FileResult<FileOperation> {
    PathUtils::validate_safe_path(&source)?;
    PathUtils::validate_safe_path(&target)?;

    // Get file size before moving
    let metadata = FileMetadata::from_path(&source)?;
    let file_size = metadata.size;

    // Ensure target directory exists
    if let Some(parent) = target.as_ref().parent() {
        PathUtils::ensure_dir_exists(parent)?;
    }

    std::fs::rename(&source, &target)?;

    Ok(FileOperation {
        source_path: source.as_ref().to_string_lossy().to_string(),
        target_path: target.as_ref().to_string_lossy().to_string(),
        operation_type: OperationType::Move,
        bytes_processed: file_size,
        success: true,
    })
}

/// Delete file
pub fn delete_file<P: AsRef<Path>>(path: P) -> FileResult<FileOperation> {
    PathUtils::validate_safe_path(&path)?;

    // Get file size before deletion
    let metadata = FileMetadata::from_path(&path)?;
    let file_size = metadata.size;

    std::fs::remove_file(&path)?;

    Ok(FileOperation {
        source_path: path.as_ref().to_string_lossy().to_string(),
        target_path: String::new(),
        operation_type: OperationType::Delete,
        bytes_processed: file_size,
        success: true,
    })
}

/// Check if file exists
pub fn file_exists<P: AsRef<Path>>(path: P) -> bool {
    path.as_ref().exists() && path.as_ref().is_file()
}

/// Get file info
pub fn get_file_info<P: AsRef<Path>>(path: P) -> FileResult<FileMetadata> {
    PathUtils::validate_safe_path(&path)?;

    if !file_exists(&path) {
        return Err(FileError::NotFound(
            path.as_ref().to_string_lossy().to_string(),
        ));
    }

    FileMetadata::from_path(path)
}

/// Create backup of file
pub fn create_backup<P: AsRef<Path>>(path: P) -> FileResult<String> {
    PathUtils::validate_safe_path(&path)?;

    if !file_exists(&path) {
        return Err(FileError::NotFound(
            path.as_ref().to_string_lossy().to_string(),
        ));
    }

    let backup_path = generate_backup_path(&path)?;
    copy_file(&path, &backup_path)?;

    Ok(backup_path.to_string_lossy().to_string())
}

/// Generate backup file path
fn generate_backup_path<P: AsRef<Path>>(path: P) -> FileResult<std::path::PathBuf> {
    let path_ref = path.as_ref();
    let stem = PathUtils::get_file_stem(path_ref)?;
    let extension = path_ref
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| format!(".{}", s))
        .unwrap_or_default();

    let parent = PathUtils::get_parent_dir(path_ref)?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");

    let backup_name = format!("{}_backup_{}{}", stem, timestamp, extension);
    Ok(parent.join(backup_name))
}

/// Batch file operations
pub fn batch_copy_files<P: AsRef<Path>, Q: AsRef<Path>>(
    files: &[P],
    target_dir: Q,
) -> Vec<FileResult<FileOperation>> {
    files
        .iter()
        .map(|file| {
            let file_name = file
                .as_ref()
                .file_name()
                .ok_or_else(|| FileError::InvalidPath("Invalid file name".to_string()))?;

            let target_path = target_dir.as_ref().join(file_name);
            copy_file(file, target_path)
        })
        .collect()
}

/// Cleanup temporary files matching a pattern
pub fn cleanup_temp_files<P: AsRef<Path>>(dir: P, pattern: &str) -> FileResult<Vec<String>> {
    let mut cleaned_files = Vec::new();

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.contains(pattern) {
                    delete_file(&path)?;
                    cleaned_files.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(cleaned_files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_read_write_file() {
        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("test.txt");
        let test_data = b"Hello, World!";

        // Write file
        let write_result = write_file(&test_path, test_data).unwrap();
        assert!(write_result.success);
        assert_eq!(write_result.bytes_processed, test_data.len() as u64);

        // Read file
        let read_data = read_file(&test_path).unwrap();
        assert_eq!(read_data, test_data);
    }

    #[test]
    fn test_copy_file() {
        let temp_dir = TempDir::new().unwrap();
        let source_path = temp_dir.path().join("source.txt");
        let target_path = temp_dir.path().join("target.txt");
        let test_data = b"Test data";

        fs::write(&source_path, test_data).unwrap();

        let copy_result = copy_file(&source_path, &target_path).unwrap();
        assert!(copy_result.success);
        assert_eq!(copy_result.bytes_processed, test_data.len() as u64);

        assert!(file_exists(&target_path));
        let copied_data = read_file(&target_path).unwrap();
        assert_eq!(copied_data, test_data);
    }

    #[test]
    fn test_move_file() {
        let temp_dir = TempDir::new().unwrap();
        let source_path = temp_dir.path().join("source.txt");
        let target_path = temp_dir.path().join("target.txt");
        let test_data = b"Test data";

        fs::write(&source_path, test_data).unwrap();

        let move_result = move_file(&source_path, &target_path).unwrap();
        assert!(move_result.success);

        assert!(!file_exists(&source_path));
        assert!(file_exists(&target_path));
    }

    #[test]
    fn test_delete_file() {
        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("test.txt");
        let test_data = b"Test data";

        fs::write(&test_path, test_data).unwrap();
        assert!(file_exists(&test_path));

        let delete_result = delete_file(&test_path).unwrap();
        assert!(delete_result.success);
        assert!(!file_exists(&test_path));
    }

    #[test]
    fn test_create_backup() {
        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("test.txt");
        let test_data = b"Test data";

        fs::write(&test_path, test_data).unwrap();

        let backup_path = create_backup(&test_path).unwrap();
        assert!(file_exists(&test_path));
        assert!(std::path::Path::new(&backup_path).exists());

        let backup_data = read_file(&backup_path).unwrap();
        assert_eq!(backup_data, test_data);
    }
}
