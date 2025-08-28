pub mod compression_service;
pub mod file_service;

pub use compression_service::{
    CompressionError, CompressionOutput, CompressionResult, CompressionService, ImageCompressor,
};
pub use file_service::{FileService, FileServiceError};
