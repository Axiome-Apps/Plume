use std::fmt;

/// Errors that can occur during image operations
#[derive(Debug, Clone)]
pub enum ImageError {
    /// Invalid image format or corrupted data
    InvalidFormat(String),
    /// Unsupported image format
    UnsupportedFormat(String),
    /// Image processing failed
    ProcessingError(String),
    /// Invalid dimensions
    InvalidDimensions(String),
    /// Color space conversion error
    ColorSpaceError(String),
    /// Memory allocation error
    MemoryError(String),
    /// File I/O error
    IoError(String),
}

impl fmt::Display for ImageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ImageError::InvalidFormat(msg) => write!(f, "Invalid image format: {}", msg),
            ImageError::UnsupportedFormat(format) => write!(f, "Unsupported format: {}", format),
            ImageError::ProcessingError(msg) => write!(f, "Processing error: {}", msg),
            ImageError::InvalidDimensions(msg) => write!(f, "Invalid dimensions: {}", msg),
            ImageError::ColorSpaceError(msg) => write!(f, "Color space error: {}", msg),
            ImageError::MemoryError(msg) => write!(f, "Memory error: {}", msg),
            ImageError::IoError(msg) => write!(f, "I/O error: {}", msg),
        }
    }
}

impl std::error::Error for ImageError {}

/// Result type for image operations
pub type ImageResult<T> = Result<T, ImageError>;

/// Convert from file domain errors
impl From<crate::domain::file::FileError> for ImageError {
    fn from(error: crate::domain::file::FileError) -> Self {
        match error {
            crate::domain::file::FileError::UnsupportedFormat(format) => {
                ImageError::UnsupportedFormat(format)
            }
            crate::domain::file::FileError::NotFound(path) => {
                ImageError::IoError(format!("File not found: {}", path))
            }
            crate::domain::file::FileError::IoError(msg) => ImageError::IoError(msg),
            _ => ImageError::ProcessingError(error.to_string()),
        }
    }
}
