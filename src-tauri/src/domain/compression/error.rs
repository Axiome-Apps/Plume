use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Errors that can occur during compression operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Error)]
pub enum CompressionError {
    #[error("Invalid compression settings: {0}")]
    InvalidSettings(String),
    #[error("Unsupported image format: {0}")]
    UnsupportedFormat(String),
    #[error("Image processing failed: {0}")]
    ProcessingError(String),
    #[error("I/O error: {0}")]
    IoError(String),
    #[error("Compression ratio too low: {:.2}%", .0 * 100.0)]
    InsufficientCompression(f64),
}

/// Errors that can occur during statistics operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Error)]
pub enum StatsError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Invalid query: {0}")]
    InvalidQuery(String),
    #[error("Statistics not available")]
    NotAvailable,
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Result type for compression operations
pub type CompressionResult<T> = Result<T, CompressionError>;

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
