// Domain modules with functional architecture
pub mod compression;
pub mod file;
pub mod image;
pub mod shared;

// Re-export core types from each domain for easy access

// Compression domain exports
pub use compression::{
    calculate_confidence, compress_batch_files, compress_file_to_file, create_compression_stat,
    create_prediction_query, create_stat, estimate_compression, get_size_range,
    CompressionError, CompressionOutput, CompressionPredictionService, CompressionResult,
    CompressionSettings, CompressionStat, EstimationQuery, EstimationResult, InputFormat,
    OutputFormat,
};

// File domain exports
pub use file::{
    cleanup_temp_files, copy_file, format_file_size, generate_output_path, get_file_extension,
    get_file_info, get_temp_file_path, is_supported_image_file, read_file, read_image_file,
    validate_image_file, write_file, FileError, FileMetadata, FileResult, PathUtils,
};

// Shared domain exports
pub use shared::{
    compression_completed_event, compression_failed_event, format_bytes, initialize, AppState,
    DomainError, DomainResult,
};
