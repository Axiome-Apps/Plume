use thiserror::Error;

/// Errors that can occur during file operations
#[derive(Debug, Clone, Error)]
pub enum FileError {
    #[error("File not found: {0}")]
    NotFound(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    #[error("IO error: {0}")]
    IoError(String),
    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),
    #[error("Security violation: {0}")]
    SecurityViolation(String),
}

/// Result type for file operations
pub type FileResult<T> = Result<T, FileError>;

/// Convert std::io::Error to FileError
impl From<std::io::Error> for FileError {
    fn from(error: std::io::Error) -> Self {
        match error.kind() {
            std::io::ErrorKind::NotFound => FileError::NotFound(error.to_string()),
            std::io::ErrorKind::PermissionDenied => FileError::PermissionDenied(error.to_string()),
            _ => FileError::IoError(error.to_string()),
        }
    }
}
