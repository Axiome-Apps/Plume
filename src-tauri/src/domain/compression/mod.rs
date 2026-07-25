// Compression Domain - Functional Architecture
//
// This module provides image compression functionality using pure functions
// and data structures, following Rust idioms for zero-cost abstractions.

pub mod engine;
pub mod error;
pub mod formats;
pub mod naming;
pub mod pipeline;
pub mod settings;
pub mod stats;

// Re-export core types and functions for easy access
pub use error::{CompressionError, CompressionResult, StatsError};
pub use formats::OutputFormat;
pub use naming::{CompressionLevel, resolve_output_path};
pub use settings::CompressionSettings;

// Engine functions - core compression operations
pub use engine::{CompressionOutput, compress_file_to_file};

// Pipeline - orchestrates a single compression (thin command adapter above it)
pub use pipeline::{CompressionOutcome, CompressionSummary, run_compression};

// Statistics types and functions
pub use stats::{
    CompressionStat, EstimationQuery, EstimationResult, calculate_confidence, estimate_compression,
    get_size_range, pixel_count_from_path,
};
