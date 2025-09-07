use crate::database::{models::CompressionRecord, DatabaseManager};
use crate::domain::compression::{get_size_range, EstimationQuery, EstimationResult};
use crate::domain::shared::DomainResult;
use tauri::AppHandle;

/// Service for predicting compression results based on historical data
pub struct CompressionPredictionService {
    db_manager: DatabaseManager,
}

impl CompressionPredictionService {
    /// Creates a new prediction service instance
    pub fn new(app: &AppHandle) -> DomainResult<Self> {
        let db_manager = DatabaseManager::new(app)
            .map_err(|e| crate::domain::shared::DomainError::Internal(e))?;

        db_manager
            .connect()
            .map_err(|e| crate::domain::shared::DomainError::Internal(e))?;

        Ok(Self { db_manager })
    }

    /// Predicts compression results based on historical statistics
    pub fn predict_compression(
        &self,
        input_format: &str,
        output_format: &str,
        original_size: i64,
    ) -> DomainResult<EstimationResult> {
        // Get historical average
        let historical_avg = self
            .db_manager
            .get_average_compression(input_format, output_format)
            .map_err(|e| crate::domain::shared::DomainError::Internal(e))?;

        // If no historical data, use conservative defaults
        let (base_reduction, confidence) = if historical_avg == 0.0 {
            let default_reduction = match (input_format, output_format) {
                ("PNG", "WebP") => 70.0,
                ("JPEG", "WebP") => 25.0,
                ("PNG", "PNG") => 15.0,
                ("JPEG", "JPEG") => 20.0,
                _ => 10.0,
            };
            (default_reduction, 0.3) // Low confidence for defaults
        } else {
            (historical_avg, 0.8) // High confidence for historical data
        };

        // Adjust prediction based on file size
        let size_adjusted_reduction = self.adjust_for_size(base_reduction, original_size as u64);

        // Calculate results
        let percent = size_adjusted_reduction;
        let ratio = (100.0 - percent) / 100.0;

        // Get sample count (approximate for confidence calculation)
        let sample_count = self.estimate_sample_count(input_format, output_format);

        Ok(EstimationResult {
            percent,
            ratio,
            confidence: self.calculate_confidence(confidence, sample_count),
            sample_count,
        })
    }

    /// Records a compression result for future predictions
    pub fn record_compression_result(
        &self,
        input_format: String,
        output_format: String,
        original_size: i64,
        compressed_size: i64,
        tool_version: Option<String>,
    ) -> DomainResult<i64> {
        let record = CompressionRecord::new(
            input_format,
            output_format,
            original_size,
            compressed_size,
            tool_version,
            "actual".to_string(),
        );

        let id = self
            .db_manager
            .insert_compression_record(&record)
            .map_err(|e| crate::domain::shared::DomainError::Internal(e))?;

        // Auto-cleanup old records to prevent database growth
        let _ = self.db_manager.cleanup_old_records(1000);

        Ok(id)
    }

    /// Gets compression statistics for a format combination
    pub fn get_compression_stats(
        &self,
        input_format: &str,
        output_format: &str,
    ) -> DomainResult<(f64, u32)> {
        let avg_compression = self
            .db_manager
            .get_average_compression(input_format, output_format)
            .map_err(|e| crate::domain::shared::DomainError::Internal(e))?;

        let sample_count = self.estimate_sample_count(input_format, output_format);

        Ok((avg_compression, sample_count))
    }

    /// Adjusts compression prediction based on file size
    fn adjust_for_size(&self, base_reduction: f64, file_size: u64) -> f64 {
        let size_range = get_size_range(file_size);

        match size_range.as_str() {
            "small" => {
                // Small files often compress less efficiently
                base_reduction * 0.8
            }
            "medium" => {
                // Medium files are optimal for compression
                base_reduction
            }
            "large" => {
                // Large files may compress slightly better
                base_reduction * 1.1
            }
            _ => base_reduction,
        }
    }

    /// Estimates sample count for confidence calculation
    fn estimate_sample_count(&self, input_format: &str, output_format: &str) -> u32 {
        // This is a simplified estimation - in a real implementation,
        // you might query the database for actual counts
        match (input_format, output_format) {
            ("PNG", "WebP") | ("JPEG", "WebP") => 50, // Common conversions
            ("PNG", "PNG") | ("JPEG", "JPEG") => 30,  // Same-format optimizations
            _ => 10,                                  // Less common conversions
        }
    }

    /// Calculates confidence score based on available data
    fn calculate_confidence(&self, base_confidence: f64, sample_count: u32) -> f64 {
        let sample_factor = match sample_count {
            0..=5 => 0.3,
            6..=20 => 0.6,
            21..=50 => 0.8,
            _ => 1.0,
        };

        (base_confidence * sample_factor).min(1.0)
    }
}

/// Create a compression prediction query
pub fn create_prediction_query(
    input_format: String,
    output_format: String,
    original_size: u64,
    quality_setting: u8,
    lossy_mode: bool,
) -> EstimationQuery {
    EstimationQuery {
        input_format,
        output_format,
        original_size,
        quality_setting,
        lossy_mode,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_size_adjustment() {
        let service = CompressionPredictionService {
            db_manager: DatabaseManager::new(&mock_app_handle()).unwrap(),
        };

        // Small files should have reduced compression
        let small_result = service.adjust_for_size(70.0, 500_000); // 0.5MB
        assert!(small_result < 70.0);

        // Medium files should keep base compression
        let medium_result = service.adjust_for_size(70.0, 2_000_000); // 2MB
        assert_eq!(medium_result, 70.0);

        // Large files should have increased compression
        let large_result = service.adjust_for_size(70.0, 8_000_000); // 8MB
        assert!(large_result > 70.0);
    }

    #[test]
    fn test_confidence_calculation() {
        let service = CompressionPredictionService {
            db_manager: DatabaseManager::new(&mock_app_handle()).unwrap(),
        };

        // Low sample count should reduce confidence
        let low_confidence = service.calculate_confidence(0.8, 3);
        assert!(low_confidence < 0.8);

        // High sample count should maintain confidence
        let high_confidence = service.calculate_confidence(0.8, 100);
        assert!(high_confidence >= 0.8);
    }

    fn mock_app_handle() -> AppHandle {
        // This would need to be implemented with a proper mock
        // For now, this test will fail but shows the intended structure
        unimplemented!("Mock app handle needed for tests")
    }
}
