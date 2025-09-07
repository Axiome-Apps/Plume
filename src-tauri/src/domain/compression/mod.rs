// Compression Domain - Functional Architecture
//
// This module provides image compression functionality using pure functions
// and data structures, following Rust idioms for zero-cost abstractions.

pub mod engine;
pub mod error;
pub mod formats;
pub mod prediction;
pub mod progress;
pub mod settings;
pub mod stats;
pub mod store;

// Re-export core types and functions for easy access
pub use error::{CompressionError, CompressionResult, StatsError, StatsResult};
pub use formats::OutputFormat;
pub use settings::CompressionSettings;

// Engine functions - core compression operations
pub use engine::{
    compress_batch_files, compress_file_to_file, create_compression_stat, CompressionOutput,
};

// Statistics types and functions
pub use stats::{
    calculate_confidence, create_stat, estimate_compression, get_size_range, CompressionStat,
    EstimationQuery, EstimationResult,
};

// Storage trait and implementations
pub use store::{SqliteStatsStore, StatsStore};

// Prediction service for size estimation
pub use prediction::{create_prediction_query, CompressionPredictionService};

// Progress estimation service for timing predictions
pub use progress::{
    EasingFunction, ProgressCalculator, ProgressConfig, ProgressEstimation,
    ProgressEstimationQuery, ProgressEstimationService,
};

// Convenience functions for common operations

/// Create default compression settings for web optimization
pub fn web_optimized_settings() -> CompressionSettings {
    CompressionSettings::new(85, OutputFormat::WebP).with_alpha_optimization(true)
}

/// Create settings for high quality compression
pub fn high_quality_settings() -> CompressionSettings {
    CompressionSettings::new(95, OutputFormat::WebP).with_metadata_preservation(true)
}

/// Create settings for maximum compression
pub fn max_compression_settings() -> CompressionSettings {
    CompressionSettings::new(70, OutputFormat::WebP).with_alpha_optimization(true)
}

/// Quick file-to-file compression with default settings
pub fn quick_compress_file<P: AsRef<std::path::Path>>(
    input_path: P,
    output_path: P,
) -> CompressionResult<CompressionOutput> {
    let settings = web_optimized_settings();
    compress_file_to_file(input_path, output_path, &settings)
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_estimation_workflow() {
        let settings = CompressionSettings::new(80, OutputFormat::WebP);
        let estimate = estimate_compression("png", "webp", 1000000, &settings);

        assert!(estimate.percent > 0.0);
        assert!(estimate.ratio < 1.0);
        assert!(estimate.confidence >= 0.0 && estimate.confidence <= 1.0);
    }

    #[test]
    fn test_store_integration() {
        let mut store = SqliteStatsStore::in_memory().unwrap();

        // Create and save a stat
        let settings = CompressionSettings::new(80, OutputFormat::WebP);
        let stat = create_stat(
            "png".to_string(),
            "webp".to_string(),
            1000000,
            400000,
            &settings,
        );

        let id = store.save_stat(stat).unwrap();
        assert!(id > 0);

        // Query for estimation
        let query = EstimationQuery {
            input_format: "png".to_string(),
            output_format: "webp".to_string(),
            original_size: 1000000,
            quality_setting: 80,
            lossy_mode: true,
        };

        let estimation = store.get_estimation(&query).unwrap();
        assert!(estimation.sample_count > 0);
    }
}
