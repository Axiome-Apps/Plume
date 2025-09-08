use serde::{Deserialize, Serialize};

/// Legacy progress estimation query parameters (kept for potential future use)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEstimationQuery {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub quality_setting: u8,
    pub lossy_mode: bool,
}

/// Legacy progress estimation result (kept for potential future use)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEstimation {
    pub estimated_duration_ms: u64,
    pub confidence: f64,
    pub sample_count: u32,
}

/// Default compression times by format and size (still used by the system)
/// Based on real system measurements
pub const DEFAULT_COMPRESSION_TIMES: &[((&str, &str, &str), u64)] = &[
    // (input_format, output_format, size_range) -> duration_ms
    // PNG -> WebP: Faster because WebP is optimized for PNG images
    (("png", "webp", "small"), 300),   // ~300ms for <1MB
    (("png", "webp", "medium"), 1200), // ~1.2s for 1-5MB
    (("png", "webp", "large"), 3000),  // ~3s for >5MB
    // PNG -> PNG: Slower due to oxipng re-optimization
    (("png", "png", "small"), 800),
    (("png", "png", "medium"), 2500),
    (("png", "png", "large"), 6000),
    // JPEG -> WebP: Fast because JPEG compresses well to WebP
    (("jpeg", "webp", "small"), 200),
    (("jpeg", "webp", "medium"), 800),
    (("jpeg", "webp", "large"), 2000),
    // JPEG -> JPEG: Fastest because no major transcoding
    (("jpeg", "jpeg", "small"), 150),
    (("jpeg", "jpeg", "medium"), 500),
    (("jpeg", "jpeg", "large"), 1200),
    // WebP -> WebP: Moderate, depends on lossy/lossless mode
    (("webp", "webp", "small"), 250),
    (("webp", "webp", "medium"), 900),
    (("webp", "webp", "large"), 2200),
];

/// Legacy configuration types (kept for potential future API compatibility)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressConfig {
    pub estimated_duration_ms: u64,
    pub update_interval_ms: u64,
    pub easing_function: EasingFunction,
    pub completion_threshold: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EasingFunction {
    Linear,
    EaseOut,
    Bezier(f64, f64, f64, f64),
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