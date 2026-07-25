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
pub use file::{get_file_info, get_file_stem, validate_image_file, validate_safe_path};
