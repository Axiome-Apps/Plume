use crate::database::DatabaseManager;
use crate::domain::{EstimationQuery, EstimationResult};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct GetEstimationRequest {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub quality_setting: u8,
    pub lossy_mode: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecordStatRequest {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub quality_setting: u8,
    pub lossy_mode: bool,
}

/// Get compression estimation based on historical data
#[tauri::command]
pub async fn get_compression_estimation(
    request: GetEstimationRequest,
    app: AppHandle,
) -> Result<EstimationResult, String> {
    let query = EstimationQuery {
        input_format: request.input_format,
        output_format: request.output_format,
        original_size: request.original_size,
        quality_setting: request.quality_setting,
        lossy_mode: request.lossy_mode,
    };

    let db = DatabaseManager::new(&app)?;
    db.connect()?;
    db.get_compression_estimation(&query)
}

/// Record a compression statistic for learning
#[tauri::command]
pub async fn record_compression_stat(
    request: RecordStatRequest,
    app: AppHandle,
) -> Result<i64, String> {
    let output_format_enum = match request.output_format.to_lowercase().as_str() {
        "webp" => crate::domain::OutputFormat::WebP,
        "png" => crate::domain::OutputFormat::Png,
        "jpg" | "jpeg" => crate::domain::OutputFormat::Jpeg,
        _ => crate::domain::OutputFormat::WebP,
    };

    let stat = crate::domain::create_stat(
        request.input_format,
        request.output_format,
        request.original_size,
        request.compressed_size,
        &crate::domain::CompressionSettings::new(request.quality_setting, output_format_enum),
    );

    let db = DatabaseManager::new(&app)?;
    db.connect()?;
    db.save_compression_stat(&stat)
}

/// Reset all compression statistics
#[tauri::command]
pub async fn reset_compression_stats(app: AppHandle) -> Result<(), String> {
    let db = DatabaseManager::new(&app)?;
    db.connect()?;
    db.clear_compression_stats()
}

/// Get total number of compression statistics
#[tauri::command]
pub async fn get_stats_count(app: AppHandle) -> Result<u32, String> {
    let db = DatabaseManager::new(&app)?;
    db.connect()?;
    db.count_compression_stats()
}

/// Get compression statistics summary
#[tauri::command]
pub async fn get_stats_summary(app: AppHandle) -> Result<StatsSummary, String> {
    let db = DatabaseManager::new(&app)?;
    db.connect()?;

    let total_stats = db.count_compression_stats()?;

    let webp_estimation = db
        .get_compression_estimation(&EstimationQuery {
            input_format: "png".to_string(),
            output_format: "webp".to_string(),
            original_size: 1000000,
            quality_setting: 80,
            lossy_mode: true,
        })
        .unwrap_or(EstimationResult {
            percent: 0.0,
            ratio: 1.0,
            confidence: 0.0,
            sample_count: 0,
        });

    Ok(StatsSummary {
        total_compressions: total_stats,
        webp_estimation_percent: webp_estimation.percent,
        webp_confidence: webp_estimation.confidence,
        sample_count: webp_estimation.sample_count,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatsSummary {
    pub total_compressions: u32,
    pub webp_estimation_percent: f64,
    pub webp_confidence: f64,
    pub sample_count: u32,
}
