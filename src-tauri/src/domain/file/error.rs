use std::fmt;

/// Errors that can occur during file operations
#[derive(Debug, Clone)]
pub enum FileError {
    /// File not found
    NotFound(String),
    /// Permission denied
    PermissionDenied(String),
    /// Invalid path
    InvalidPath(String),
    /// IO operation failed
    IoError(String),
    /// File format not supported
    UnsupportedFormat(String),
    /// Path traversal or security violation
    SecurityViolation(String),
}

impl fmt::Display for FileError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FileError::NotFound(path) => write!(f, "File not found: {}", path),
            FileError::PermissionDenied(path) => write!(f, "Permission denied: {}", path),
            FileError::InvalidPath(path) => write!(f, "Invalid path: {}", path),
            FileError::IoError(msg) => write!(f, "IO error: {}", msg),
            FileError::UnsupportedFormat(format) => write!(f, "Unsupported format: {}", format),
            FileError::SecurityViolation(msg) => write!(f, "Security violation: {}", msg),
        }
    }
}

impl std::error::Error for FileError {}

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
