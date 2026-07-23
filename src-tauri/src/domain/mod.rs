// Domain modules with functional architecture
pub mod compression;
pub mod file;

// Re-export core types from each domain for easy access

// Compression domain exports
pub use compression::{
    CompressionLevel, CompressionSettings, EstimationQuery, EstimationResult, OutputFormat,
    resolve_output_path,
};

// File domain exports
pub use file::{PathUtils, get_file_info, validate_image_file};
