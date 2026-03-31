use crate::database::DatabaseManager;
use crate::domain::compression::{EstimationQuery, EstimationResult};
use crate::domain::shared::DomainResult;
use tauri::AppHandle;

/// Service for predicting compression results based on historical data
pub struct CompressionPredictionService {
    db_manager: DatabaseManager,
}

impl CompressionPredictionService {
    /// Creates a new prediction service instance
    pub fn new(app: &AppHandle) -> DomainResult<Self> {
        let db_manager =
            DatabaseManager::new(app).map_err(crate::domain::shared::DomainError::Internal)?;

        db_manager
            .connect()
            .map_err(crate::domain::shared::DomainError::Internal)?;

        Ok(Self { db_manager })
    }

    /// Predicts compression results based on historical statistics
    pub fn predict_compression(
        &self,
        input_format: &str,
        output_format: &str,
        original_size: i64,
    ) -> DomainResult<EstimationResult> {
        let query = EstimationQuery {
            input_format: input_format.to_string(),
            output_format: output_format.to_string(),
            original_size: original_size as u64,
            quality_setting: 80,
            lossy_mode: true,
        };

        self.db_manager
            .get_compression_estimation(&query)
            .map_err(crate::domain::shared::DomainError::Internal)
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
