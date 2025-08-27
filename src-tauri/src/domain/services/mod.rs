pub mod compression_service;
pub mod file_service;

pub use compression_service::{CompressionService, CompressionOutput, CompressionError, CompressionResult, ImageCompressor};
pub use file_service::{FileService, FileServiceError};