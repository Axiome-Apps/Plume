use crate::domain::compression::error::{StatsError, StatsResult};
use crate::domain::compression::stats::EstimationQuery;
use crate::domain::compression::store::StatsStore;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Progress estimation query parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEstimationQuery {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub quality_setting: u8,
    pub lossy_mode: bool,
}

/// Progress estimation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEstimation {
    pub estimated_duration_ms: u64,
    pub confidence: f64,
    pub sample_count: u32,
}

/// Default compression times by format and size (fallback values)
/// Basé sur des mesures réelles du système
pub const DEFAULT_COMPRESSION_TIMES: &[((&str, &str, &str), u64)] = &[
    // (input_format, output_format, size_range) -> duration_ms
    // PNG -> WebP: Plus rapide car WebP est optimisé pour les images PNG
    (("png", "webp", "small"), 300),   // ~300ms pour <1MB
    (("png", "webp", "medium"), 1200), // ~1.2s pour 1-5MB  
    (("png", "webp", "large"), 3000),  // ~3s pour >5MB
    // PNG -> PNG: Plus lent car réoptimisation via oxipng
    (("png", "png", "small"), 800),
    (("png", "png", "medium"), 2500),
    (("png", "png", "large"), 6000),
    // JPEG -> WebP: Rapide car JPEG se compresse bien en WebP
    (("jpeg", "webp", "small"), 200),
    (("jpeg", "webp", "medium"), 800),
    (("jpeg", "webp", "large"), 2000),
    // JPEG -> JPEG: Le plus rapide car pas de transcodage majeur
    (("jpeg", "jpeg", "small"), 150),
    (("jpeg", "jpeg", "medium"), 500),
    (("jpeg", "jpeg", "large"), 1200),
    // WebP -> WebP: Modéré, dépend du mode lossy/lossless
    (("webp", "webp", "small"), 250),
    (("webp", "webp", "medium"), 900),
    (("webp", "webp", "large"), 2200),
];

/// Service for estimating compression time based on historical data
pub struct ProgressEstimationService<'a> {
    store: &'a dyn StatsStore,
}

impl<'a> ProgressEstimationService<'a> {
    pub fn new(store: &'a dyn StatsStore) -> Self {
        Self { store }
    }

    /// Estimate compression duration based on historical data
    pub fn estimate_duration(
        &self,
        query: &ProgressEstimationQuery,
    ) -> StatsResult<ProgressEstimation> {
        // First, try to get estimation from historical data
        let estimation_query = EstimationQuery {
            input_format: query.input_format.clone(),
            output_format: query.output_format.clone(),
            original_size: query.original_size,
            quality_setting: query.quality_setting,
            lossy_mode: query.lossy_mode,
        };

        // Query the database for similar compression operations with timing data
        match self.get_time_estimation_from_db(&estimation_query) {
            Ok(Some(estimation)) => Ok(estimation),
            Ok(None) | Err(_) => {
                // Fallback to default timing estimates
                Ok(self.get_fallback_estimation(query))
            }
        }
    }

    /// Try to get time estimation from database
    fn get_time_estimation_from_db(
        &self,
        query: &EstimationQuery,
    ) -> StatsResult<Option<ProgressEstimation>> {
        // This would need to be implemented in the store trait as a new method
        // For now, return None to use fallback
        Ok(None)
    }

    /// Get fallback estimation based on default timing values
    fn get_fallback_estimation(&self, query: &ProgressEstimationQuery) -> ProgressEstimation {
        let size_range = crate::domain::compression::stats::get_size_range(query.original_size);
        let input_fmt = normalize_format(&query.input_format);
        let output_fmt = normalize_format(&query.output_format);

        // Find matching default time
        let mut default_time = DEFAULT_COMPRESSION_TIMES
            .iter()
            .find(|((inp, out, size), _)| {
                *inp == input_fmt && *out == output_fmt && *size == size_range
            })
            .map(|(_, time)| *time)
            .unwrap_or_else(|| {
                // Ultimate fallback based on size
                match size_range.as_str() {
                    "small" => 300,
                    "medium" => 1000,
                    "large" => 2500,
                    _ => 1000,
                }
            });

        // Ajuster le temps en fonction du mode WebP lossy/lossless
        if output_fmt == "webp" && input_fmt != "webp" {
            // WebP lossless est ~20-30% plus lent que lossy
            if !query.lossy_mode {
                default_time = (default_time as f64 * 1.25) as u64;
            }
        }

        ProgressEstimation {
            estimated_duration_ms: default_time,
            confidence: 0.4, // Low confidence for fallback estimates
            sample_count: 0,
        }
    }
}

/// Normalize format names for consistent lookup
fn normalize_format(format: &str) -> String {
    match format.to_lowercase().as_str() {
        "jpg" => "jpeg".to_string(),
        other => other.to_string(),
    }
}

/// Configuration for smooth progress animation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressConfig {
    pub estimated_duration_ms: u64,
    pub update_interval_ms: u64, // e.g., 50ms for smooth animation
    pub easing_function: EasingFunction,
    pub completion_threshold: f64, // e.g., 95% - wait for real completion after this
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EasingFunction {
    Linear,
    EaseOut,
    Bezier(f64, f64, f64, f64), // Control points for cubic bezier
}

impl Default for ProgressConfig {
    fn default() -> Self {
        Self {
            estimated_duration_ms: 1000,
            update_interval_ms: 50,
            easing_function: EasingFunction::EaseOut,
            completion_threshold: 95.0,
        }
    }
}

/// Progress calculator for smooth animation
pub struct ProgressCalculator {
    config: ProgressConfig,
    start_time: std::time::Instant,
}

impl ProgressCalculator {
    pub fn new(config: ProgressConfig) -> Self {
        Self {
            config,
            start_time: std::time::Instant::now(),
        }
    }

    /// Calculate current progress percentage (0.0 to 100.0)
    pub fn current_progress(&self) -> f64 {
        let elapsed_ms = self.start_time.elapsed().as_millis() as u64;
        let progress_ratio = if self.config.estimated_duration_ms > 0 {
            (elapsed_ms as f64 / self.config.estimated_duration_ms as f64).min(1.0)
        } else {
            0.0
        };

        // Apply easing function
        let eased_ratio = self.apply_easing(progress_ratio);

        // Cap at completion threshold
        let capped_progress = eased_ratio * (self.config.completion_threshold / 100.0);

        (capped_progress * 100.0).min(self.config.completion_threshold)
    }

    /// Apply easing function to progress ratio
    fn apply_easing(&self, ratio: f64) -> f64 {
        match &self.config.easing_function {
            EasingFunction::Linear => ratio,
            EasingFunction::EaseOut => 1.0 - (1.0 - ratio).powf(3.0), // Cubic ease-out
            EasingFunction::Bezier(_, _, _, _) => {
                // Simplified bezier - could implement full cubic bezier if needed
                1.0 - (1.0 - ratio).powf(2.0) // Quadratic ease-out
            }
        }
    }

    /// Check if we should continue updating progress
    pub fn should_continue_updates(&self) -> bool {
        self.current_progress() < self.config.completion_threshold
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_format() {
        assert_eq!(normalize_format("JPG"), "jpeg");
        assert_eq!(normalize_format("jpg"), "jpeg");
        assert_eq!(normalize_format("png"), "png");
        assert_eq!(normalize_format("webp"), "webp");
    }

    #[test]
    fn test_progress_calculator() {
        let config = ProgressConfig {
            estimated_duration_ms: 1000,
            update_interval_ms: 50,
            easing_function: EasingFunction::Linear,
            completion_threshold: 95.0,
        };

        let calculator = ProgressCalculator::new(config);
        let progress = calculator.current_progress();

        // Should start at 0 or very low
        assert!(progress >= 0.0);
        assert!(progress <= 5.0); // Should be very low initially
    }

    #[test]
    fn test_fallback_estimation() {
        use crate::domain::compression::stats::{CompressionStat, EstimationResult};
        use crate::domain::compression::store::StatsStore;

        // Mock store that returns no data
        struct MockStore;
        impl StatsStore for MockStore {
            fn save_stat(&mut self, _: CompressionStat) -> StatsResult<i64> {
                Ok(0)
            }
            fn get_estimation(&self, _: &EstimationQuery) -> StatsResult<EstimationResult> {
                Err(StatsError::DatabaseError("No data".to_string()))
            }
            fn clear_all(&mut self) -> StatsResult<()> {
                Ok(())
            }
            fn count_stats(&self) -> StatsResult<u32> {
                Ok(0)
            }
        }

        let store = MockStore;
        let service = ProgressEstimationService::new(&store);

        let query = ProgressEstimationQuery {
            input_format: "png".to_string(),
            output_format: "webp".to_string(),
            original_size: 500_000, // small
            quality_setting: 80,
            lossy_mode: true,
        };

        let estimation = service.estimate_duration(&query).unwrap();
        assert_eq!(estimation.estimated_duration_ms, 200); // Should match default for png->webp small
        assert!(estimation.confidence < 0.5); // Fallback should have low confidence
    }
}
