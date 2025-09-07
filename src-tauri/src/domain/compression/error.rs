use serde::{Deserialize, Serialize};
use std::fmt;

/// Errors that can occur during compression operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CompressionError {
    /// Invalid compression settings
    InvalidSettings(String),
    /// Unsupported image format
    UnsupportedFormat(String),
    /// Image processing failed
    ProcessingFailed(String),
    /// Image processing error (more generic)
    ProcessingError(String),
    /// I/O error during compression
    IoError(String),
    /// Compression ratio too low
    InsufficientCompression(f64),
}

impl fmt::Display for CompressionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CompressionError::InvalidSettings(msg) => {
                write!(f, "Invalid compression settings: {}", msg)
            }
            CompressionError::UnsupportedFormat(format) => {
                write!(f, "Unsupported image format: {}", format)
            }
            CompressionError::ProcessingFailed(msg) => {
                write!(f, "Image processing failed: {}", msg)
            }
            CompressionError::ProcessingError(msg) => {
                write!(f, "Image processing error: {}", msg)
            }
            CompressionError::IoError(msg) => {
                write!(f, "I/O error: {}", msg)
            }
            CompressionError::InsufficientCompression(ratio) => {
                write!(f, "Compression ratio too low: {:.2}%", ratio * 100.0)
            }
        }
    }
}

impl std::error::Error for CompressionError {}

/// Errors that can occur during statistics operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum StatsError {
    /// Database connection failed
    DatabaseError(String),
    /// Invalid query parameters
    InvalidQuery(String),
    /// Statistics not available
    NotAvailable,
    /// Serialization error
    SerializationError(String),
}

impl fmt::Display for StatsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StatsError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            StatsError::InvalidQuery(msg) => write!(f, "Invalid query: {}", msg),
            StatsError::NotAvailable => write!(f, "Statistics not available"),
            StatsError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
        }
    }
}

impl std::error::Error for StatsError {}

/// Result type for compression operations
pub type CompressionResult<T> = Result<T, CompressionError>;

/// Result type for statistics operations
pub type StatsResult<T> = Result<T, StatsError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = CompressionError::InvalidSettings("Quality out of range".to_string());
        assert!(error.to_string().contains("Invalid compression settings"));

        let error = StatsError::NotAvailable;
        assert_eq!(error.to_string(), "Statistics not available");
    }
}
