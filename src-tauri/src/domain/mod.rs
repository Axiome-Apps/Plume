// Domain modules with functional architecture
pub mod compression;
pub mod file;

// Re-export core types from each domain for easy access

// Compression domain exports
pub use compression::{
    CompressionError, CompressionLevel, CompressionOutput, CompressionResult, CompressionSettings,
    CompressionStat, EstimationQuery, EstimationResult, InputFormat, OutputFormat,
    calculate_confidence, compress_file_to_file, create_stat, estimate_compression, get_size_range,
    resolve_output_path,
};

// File domain exports
pub use file::{FileMetadata, PathUtils, get_file_info, validate_image_file};
