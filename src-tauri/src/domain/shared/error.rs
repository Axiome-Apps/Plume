use std::fmt;

/// Common domain errors that can occur across all domains
#[derive(Debug, Clone)]
pub enum DomainError {
    /// Invalid input provided to a domain operation
    InvalidInput(String),
    /// Resource not found
    NotFound(String),
    /// Permission denied for operation
    PermissionDenied(String),
    /// Internal system error
    Internal(String),
    /// Configuration error
    Configuration(String),
    /// Network or external service error
    External(String),
    /// Rate limiting or resource exhaustion
    ResourceLimit(String),
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DomainError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            DomainError::NotFound(resource) => write!(f, "Not found: {}", resource),
            DomainError::PermissionDenied(operation) => {
                write!(f, "Permission denied: {}", operation)
            }
            DomainError::Internal(msg) => write!(f, "Internal error: {}", msg),
            DomainError::Configuration(msg) => write!(f, "Configuration error: {}", msg),
            DomainError::External(msg) => write!(f, "External service error: {}", msg),
            DomainError::ResourceLimit(msg) => write!(f, "Resource limit exceeded: {}", msg),
        }
    }
}

impl std::error::Error for DomainError {}

/// Result type for domain operations
pub type DomainResult<T> = Result<T, DomainError>;

/// Convert from file domain errors
impl From<crate::domain::file::FileError> for DomainError {
    fn from(error: crate::domain::file::FileError) -> Self {
        match error {
            crate::domain::file::FileError::NotFound(path) => DomainError::NotFound(path),
            crate::domain::file::FileError::PermissionDenied(path) => {
                DomainError::PermissionDenied(path)
            }
            crate::domain::file::FileError::InvalidPath(msg) => DomainError::InvalidInput(msg),
            crate::domain::file::FileError::SecurityViolation(msg) => {
                DomainError::PermissionDenied(msg)
            }
            crate::domain::file::FileError::UnsupportedFormat(format) => {
                DomainError::InvalidInput(format!("Unsupported format: {}", format))
            }
            crate::domain::file::FileError::IoError(msg) => DomainError::Internal(msg),
        }
    }
}

/// Convert from image domain errors
impl From<crate::domain::image::ImageError> for DomainError {
    fn from(error: crate::domain::image::ImageError) -> Self {
        match error {
            crate::domain::image::ImageError::InvalidFormat(msg) => DomainError::InvalidInput(msg),
            crate::domain::image::ImageError::UnsupportedFormat(format) => {
                DomainError::InvalidInput(format!("Unsupported format: {}", format))
            }
            crate::domain::image::ImageError::ProcessingError(msg) => DomainError::Internal(msg),
            crate::domain::image::ImageError::InvalidDimensions(msg) => {
                DomainError::InvalidInput(msg)
            }
            crate::domain::image::ImageError::ColorSpaceError(msg) => DomainError::Internal(msg),
            crate::domain::image::ImageError::MemoryError(msg) => DomainError::ResourceLimit(msg),
            crate::domain::image::ImageError::IoError(msg) => DomainError::Internal(msg),
        }
    }
}

/// Convert from compression domain errors  
impl From<crate::domain::compression::CompressionError> for DomainError {
    fn from(error: crate::domain::compression::CompressionError) -> Self {
        match error {
            crate::domain::compression::CompressionError::UnsupportedFormat(format) => {
                DomainError::InvalidInput(format!("Unsupported format: {}", format))
            }
            crate::domain::compression::CompressionError::InvalidSettings(msg) => {
                DomainError::InvalidInput(msg)
            }
            crate::domain::compression::CompressionError::ProcessingFailed(msg) => {
                DomainError::Internal(msg)
            }
            crate::domain::compression::CompressionError::IoError(msg) => {
                DomainError::Internal(msg)
            }
            crate::domain::compression::CompressionError::InsufficientCompression(_) => {
                DomainError::Internal("Insufficient compression achieved".to_string())
            }
            crate::domain::compression::CompressionError::ProcessingError(msg) => {
                DomainError::Internal(msg)
            }
        }
    }
}

/// Error recovery strategies
#[derive(Debug, Clone)]
pub enum ErrorRecovery {
    /// Retry the operation
    Retry { max_attempts: u32, backoff_ms: u64 },
    /// Use fallback approach
    Fallback(String),
    /// Skip and continue
    Skip,
    /// Abort operation
    Abort,
}

/// Create error recovery strategy based on error type
pub fn get_recovery_strategy(error: &DomainError) -> ErrorRecovery {
    match error {
        DomainError::External(_) => ErrorRecovery::Retry {
            max_attempts: 3,
            backoff_ms: 1000,
        },
        DomainError::ResourceLimit(_) => ErrorRecovery::Retry {
            max_attempts: 2,
            backoff_ms: 5000,
        },
        DomainError::Internal(_) => ErrorRecovery::Fallback("Using safe defaults".to_string()),
        DomainError::InvalidInput(_)
        | DomainError::NotFound(_)
        | DomainError::PermissionDenied(_)
        | DomainError::Configuration(_) => ErrorRecovery::Abort,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = DomainError::InvalidInput("test input".to_string());
        assert_eq!(error.to_string(), "Invalid input: test input");

        let error = DomainError::NotFound("resource".to_string());
        assert_eq!(error.to_string(), "Not found: resource");
    }

    #[test]
    fn test_error_recovery_strategies() {
        let external_error = DomainError::External("API down".to_string());
        match get_recovery_strategy(&external_error) {
            ErrorRecovery::Retry {
                max_attempts,
                backoff_ms,
            } => {
                assert_eq!(max_attempts, 3);
                assert_eq!(backoff_ms, 1000);
            }
            _ => panic!("Expected retry strategy"),
        }

        let invalid_input = DomainError::InvalidInput("bad data".to_string());
        match get_recovery_strategy(&invalid_input) {
            ErrorRecovery::Abort => (), // Expected
            _ => panic!("Expected abort strategy"),
        }
    }

    #[test]
    fn test_error_conversion() {
        let file_error = crate::domain::file::FileError::NotFound("test.jpg".to_string());
        let domain_error: DomainError = file_error.into();

        match domain_error {
            DomainError::NotFound(path) => assert_eq!(path, "test.jpg"),
            _ => panic!("Expected NotFound error"),
        }
    }
}
