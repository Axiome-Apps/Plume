// Compression Domain - Functional Architecture
//
// This module provides image compression functionality using pure functions
// and data structures, following Rust idioms for zero-cost abstractions.

pub mod engine;
pub mod error;
pub mod formats;
pub mod naming;
pub mod settings;
pub mod stats;

// Re-export core types and functions for easy access
pub use error::{CompressionError, CompressionResult, StatsError, StatsResult};
pub use formats::{InputFormat, OutputFormat};
pub use naming::{CompressionLevel, resolve_output_path};
pub use settings::CompressionSettings;

// Engine functions - core compression operations
pub use engine::{CompressionOutput, compress_file_to_file};

// Statistics types and functions
pub use stats::{
    CompressionStat, EstimationQuery, EstimationResult, calculate_confidence, create_stat,
    estimate_compression, get_size_range,
};
