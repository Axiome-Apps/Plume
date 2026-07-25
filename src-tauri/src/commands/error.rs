use crate::domain::compression::{CompressionError, StatsError};
use crate::domain::file::FileError;
use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};
use thiserror::Error;

/// Stable, machine-readable error kind sent to the frontend. The frontend maps
/// it to an i18n key — it must never change meaning across releases.
#[derive(Debug, Clone, Copy)]
pub enum ErrorKind {
    Validation,
    NotFound,
    Io,
    Security,
    Unsupported,
    Internal,
}

impl ErrorKind {
    fn as_str(self) -> &'static str {
        match self {
            ErrorKind::Validation => "validation",
            ErrorKind::NotFound => "not_found",
            ErrorKind::Io => "io",
            ErrorKind::Security => "security",
            ErrorKind::Unsupported => "unsupported",
            ErrorKind::Internal => "internal",
        }
    }
}

/// Frontier error returned by every Tauri command. Serialized to JS as
/// `{ kind, message }`: `kind` is the stable code the frontend maps to an i18n
/// key (what the user sees); `message` is a controlled, human-readable summary
/// for logs/diagnostics — never a raw internal error chain.
#[derive(Debug, Error)]
#[error("{message}")]
pub struct CommandError {
    kind: ErrorKind,
    message: String,
}

impl CommandError {
    pub fn new(kind: ErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Internal, message)
    }
}

impl Serialize for CommandError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("CommandError", 2)?;
        state.serialize_field("kind", self.kind.as_str())?;
        state.serialize_field("message", &self.message)?;
        state.end()
    }
}

impl From<FileError> for CommandError {
    fn from(error: FileError) -> Self {
        let kind = match error {
            FileError::NotFound(_) => ErrorKind::NotFound,
            FileError::PermissionDenied(_) | FileError::IoError(_) => ErrorKind::Io,
            FileError::InvalidPath(_) => ErrorKind::Validation,
            FileError::UnsupportedFormat(_) => ErrorKind::Unsupported,
            FileError::SecurityViolation(_) => ErrorKind::Security,
        };
        Self::new(kind, error.to_string())
    }
}

impl From<CompressionError> for CommandError {
    fn from(error: CompressionError) -> Self {
        let kind = match error {
            CompressionError::InvalidSettings(_) => ErrorKind::Validation,
            CompressionError::UnsupportedFormat(_) => ErrorKind::Unsupported,
            CompressionError::IoError(_) => ErrorKind::Io,
            CompressionError::ProcessingError(_) | CompressionError::InsufficientCompression(_) => {
                ErrorKind::Internal
            }
        };
        Self::new(kind, error.to_string())
    }
}

impl From<StatsError> for CommandError {
    fn from(error: StatsError) -> Self {
        let kind = match error {
            StatsError::DatabaseError(_) => ErrorKind::Io,
            StatsError::InvalidQuery(_) => ErrorKind::Validation,
            StatsError::NotAvailable => ErrorKind::NotFound,
            StatsError::SerializationError(_) => ErrorKind::Internal,
        };
        Self::new(kind, error.to_string())
    }
}
