use crate::domain::compression::formats::OutputFormat;
use crate::domain::compression::settings::CompressionSettings;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionStat {
    pub id: Option<i64>,
    pub input_format: String,
    pub output_format: String,
    pub input_size_range: String,
    pub quality_setting: u8,
    pub lossy_mode: bool,
    pub size_reduction_percent: f64,
    pub original_size: u64,
    pub compressed_size: u64,
    pub pixel_count: Option<u64>,
    pub compression_time_ms: Option<u64>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstimationQuery {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub quality_setting: u8,
    pub lossy_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstimationResult {
    pub percent: f64,
    pub ratio: f64,
    pub confidence: f64,
    pub sample_count: u32,
}

pub fn get_size_range(size_bytes: u64) -> String {
    match size_bytes {
        0..=1_000_000 => "small".to_string(),
        1_000_001..=5_000_000 => "medium".to_string(),
        _ => "large".to_string(),
    }
}

/// Determines if the compression is lossy based on the output format and settings.
/// PNG output is always lossless. WebP at quality 100 is lossless.
fn is_lossy(output_format: &OutputFormat, quality: u8) -> bool {
    match output_format {
        OutputFormat::Png => false,
        OutputFormat::WebP => quality < 100,
        OutputFormat::Jpeg => true,
    }
}

pub fn estimate_compression(
    input_format: &str,
    output_format: &str,
    _original_size: u64,
    settings: &CompressionSettings,
) -> EstimationResult {
    let quality = settings.quality as f64;

    let (base_percent, confidence, sensitivity) = match (
        input_format.to_lowercase().as_str(),
        output_format.to_lowercase().as_str(),
    ) {
        ("png", "webp") => {
            if quality >= 90.0 {
                (43.0, 0.8, 0.2)
            } else {
                (85.0, 0.9, 0.5)
            }
        }
        ("jpg" | "jpeg", "webp") => (8.0, 0.5, 0.15),
        ("png", "png") => (15.0, 0.9, 0.0),
        ("jpg" | "jpeg", "jpg" | "jpeg") => (20.0, 0.8, 0.3),
        ("webp", "webp") => (10.0, 0.6, 0.2),
        ("heic" | "heif", "webp") => (70.0, 0.7, 0.5),
        ("heic" | "heif", "jpg" | "jpeg") => (50.0, 0.7, 0.4),
        ("heic" | "heif", "png") => (10.0, 0.5, 0.0),
        _ => (5.0, 0.3, 0.1),
    };

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

pub fn calculate_confidence(sample_count: u32, variance: f64) -> f64 {
    let base_confidence = match sample_count {
        0 => 0.0,
        1..=5 => 0.3,
        6..=20 => 0.6,
        21..=50 => 0.8,
        _ => 0.9,
    };

    let variance_factor = if variance > 0.0 {
        (1.0 / (1.0 + variance)).min(1.0)
    } else {
        1.0
    };

    (base_confidence * variance_factor).min(1.0)
}

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
        lossy_mode: is_lossy(&settings.format, settings.quality),
        size_reduction_percent,
        original_size,
        compressed_size,
        pixel_count: None,
        compression_time_ms: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }
}

pub fn create_stat_with_time(
    input_format: String,
    output_format: String,
    original_size: u64,
    compressed_size: u64,
    compression_time_ms: u64,
    pixel_count: Option<u64>,
    settings: &CompressionSettings,
) -> CompressionStat {
    let mut stat = create_stat(
        input_format,
        output_format,
        original_size,
        compressed_size,
        settings,
    );
    stat.compression_time_ms = Some(compression_time_ms);
    stat.pixel_count = pixel_count;
    stat
}

#[cfg(test)]
mod tests {
    use super::*;

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

        assert!(result.percent > 50.0);
        assert!(result.confidence > 0.5);
        assert_eq!(result.ratio, (100.0 - result.percent) / 100.0);
    }

    #[test]
    fn test_calculate_confidence() {
        assert_eq!(calculate_confidence(0, 0.0), 0.0);
        assert!(calculate_confidence(100, 0.1) > 0.8);
        assert!(calculate_confidence(3, 0.0) < 0.5);
    }

    #[test]
    fn test_lossy_mode() {
        assert!(!is_lossy(&OutputFormat::Png, 80));
        assert!(!is_lossy(&OutputFormat::Png, 60));
        assert!(is_lossy(&OutputFormat::Jpeg, 80));
        assert!(is_lossy(&OutputFormat::WebP, 80));
        assert!(!is_lossy(&OutputFormat::WebP, 100));
    }
}
