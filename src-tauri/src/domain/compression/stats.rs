use crate::domain::compression::settings::CompressionSettings;
use serde::{Deserialize, Serialize};

/// Statistics about a compression operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionStat {
    pub id: Option<i64>,
    pub input_format: String,
    pub output_format: String,
    pub input_size_range: String, // 'small', 'medium', 'large'
    pub quality_setting: u8,
    pub lossy_mode: bool,
    pub size_reduction_percent: f64,
    pub original_size: u64,
    pub compressed_size: u64,
    pub compression_time_ms: Option<u64>,
    pub timestamp: String,
    pub image_type: Option<String>, // 'photo', 'logo', 'graphic'
}

/// Query parameters for compression estimation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstimationQuery {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub quality_setting: u8,
    pub lossy_mode: bool,
}

/// Result of a compression estimation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstimationResult {
    pub percent: f64,
    pub ratio: f64,
    pub confidence: f64, // 0.0 à 1.0
    pub sample_count: u32,
}

/// Determines the size range for a given file size in bytes
pub fn get_size_range(size_bytes: u64) -> String {
    match size_bytes {
        0..=1_000_000 => "small".to_string(),          // < 1MB
        1_000_001..=5_000_000 => "medium".to_string(), // 1-5MB
        _ => "large".to_string(),                      // > 5MB
    }
}

/// Estimates compression results based on format and settings.
/// The quality setting modulates the base estimation: lower quality → more compression.
pub fn estimate_compression(
    input_format: &str,
    output_format: &str,
    _original_size: u64,
    settings: &CompressionSettings,
) -> EstimationResult {
    let quality = settings.quality as f64;

    // Base estimation per format pair, then modulate by quality.
    // (base_percent_at_q80, confidence, quality_sensitivity)
    // quality_sensitivity: how much % changes per quality point around q80.
    let (base_percent, confidence, sensitivity) = match (
        input_format.to_lowercase().as_str(),
        output_format.to_lowercase().as_str(),
    ) {
        ("png", "webp") => {
            if quality >= 90.0 {
                // Lossless territory — much less compression, low sensitivity
                (43.0, 0.8, 0.2)
            } else {
                // Lossy — high base, responsive to quality
                (85.0, 0.9, 0.5)
            }
        }
        ("jpg" | "jpeg", "webp") => (8.0, 0.5, 0.15),
        ("png", "png") => (15.0, 0.9, 0.0), // oxipng lossless — quality has no effect
        ("jpg" | "jpeg", "jpg" | "jpeg") => (20.0, 0.8, 0.3),
        ("webp", "webp") => (10.0, 0.6, 0.2),
        ("heic" | "heif", "webp") => (70.0, 0.7, 0.5),
        ("heic" | "heif", "jpg" | "jpeg") => (50.0, 0.7, 0.4),
        ("heic" | "heif", "png") => (10.0, 0.5, 0.0), // Lossless target — no quality effect
        _ => (5.0, 0.3, 0.1),
    };

    // Modulate: lower quality → more compression (negative delta increases %)
    // Reference point is quality=80.
    let quality_delta = quality - 80.0;
    let percent = (base_percent - quality_delta * sensitivity).clamp(0.0, 99.0);

    let ratio = (100.0 - percent) / 100.0;

    EstimationResult {
        percent,
        ratio,
        confidence,
        sample_count: if confidence > 0.7 { 100 } else { 10 },
    }
}

/// Calculates the confidence level based on available data
pub fn calculate_confidence(sample_count: u32, variance: f64) -> f64 {
    let base_confidence = match sample_count {
        0 => 0.0,
        1..=5 => 0.3,
        6..=20 => 0.6,
        21..=50 => 0.8,
        _ => 0.9,
    };

    // Adjust confidence based on variance (lower variance = higher confidence)
    let variance_factor = if variance > 0.0 {
        (1.0 / (1.0 + variance)).min(1.0)
    } else {
        1.0
    };

    (base_confidence * variance_factor).min(1.0)
}

/// Creates a compression statistic record
pub fn create_stat(
    input_format: String,
    output_format: String,
    original_size: u64,
    compressed_size: u64,
    settings: &CompressionSettings,
) -> CompressionStat {
    let size_reduction_percent = if original_size > 0 && original_size >= compressed_size {
        ((original_size - compressed_size) as f64 / original_size as f64) * 100.0
    } else if original_size > 0 {
        -((compressed_size - original_size) as f64 / original_size as f64) * 100.0
    } else {
        0.0
    };

    CompressionStat {
        id: None,
        input_format,
        output_format,
        input_size_range: get_size_range(original_size),
        quality_setting: settings.quality,
        lossy_mode: settings.quality < 90, // Simplified heuristic
        size_reduction_percent,
        original_size,
        compressed_size,
        compression_time_ms: None, // Will be set when the stat is recorded with timing
        timestamp: chrono::Utc::now().to_rfc3339(),
        image_type: None, // Could be determined by analysis
    }
}

/// Creates a compression statistic record with timing information
pub fn create_stat_with_time(
    input_format: String,
    output_format: String,
    original_size: u64,
    compressed_size: u64,
    compression_time_ms: u64,
    settings: &CompressionSettings,
    _tool_version: String,
) -> CompressionStat {
    let mut stat = create_stat(
        input_format,
        output_format,
        original_size,
        compressed_size,
        settings,
    );
    stat.compression_time_ms = Some(compression_time_ms);
    stat
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::compression::formats::OutputFormat;

    #[test]
    fn test_size_range() {
        assert_eq!(get_size_range(500_000), "small");
        assert_eq!(get_size_range(3_000_000), "medium");
        assert_eq!(get_size_range(10_000_000), "large");
    }

    #[test]
    fn test_estimate_compression() {
        let settings = CompressionSettings::new(80, OutputFormat::WebP);
        let result = estimate_compression("png", "webp", 1000000, &settings);

        assert!(result.percent > 50.0); // Should be significant compression
        assert!(result.confidence > 0.5); // Should have reasonable confidence
        assert_eq!(result.ratio, (100.0 - result.percent) / 100.0);
    }

    #[test]
    fn test_calculate_confidence() {
        assert_eq!(calculate_confidence(0, 0.0), 0.0);
        assert!(calculate_confidence(100, 0.1) > 0.8);
        assert!(calculate_confidence(3, 0.0) < 0.5);
    }
}
