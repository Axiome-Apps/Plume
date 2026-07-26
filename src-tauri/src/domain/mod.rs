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
pub use file::{
    SUPPORTED_IMAGE_EXTENSIONS, ScanOutcome, collect_image_paths, get_file_info, get_file_stem,
    is_supported_extension, validate_image_file, validate_safe_path,
};
