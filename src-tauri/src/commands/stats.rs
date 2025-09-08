use crate::domain::{AppState, EstimationQuery, EstimationResult, SqliteStatsStore, StatsStore};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

// Global stats store - in a real app, this would be managed by AppState
static STATS_STORE: std::sync::LazyLock<Mutex<SqliteStatsStore>> = std::sync::LazyLock::new(|| {
    let db_path = std::env::temp_dir()
        .join("plume")
        .join("compression_stats.db");
    std::fs::create_dir_all(db_path.parent().unwrap()).unwrap();
    let store = SqliteStatsStore::new(db_path.to_str().unwrap()).unwrap();
    Mutex::new(store)
});

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

#[derive(Debug, Serialize, Deserialize)]
pub struct RecordStatWithTimeRequest {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub compression_time_ms: u64,
    pub tool_version: String,
}

/// Get compression estimation based on historical data
#[tauri::command]
pub async fn get_compression_estimation(
    request: GetEstimationRequest,
    _state: State<'_, AppState>,
) -> Result<EstimationResult, String> {
    let query = EstimationQuery {
        input_format: request.input_format,
        output_format: request.output_format,
        original_size: request.original_size,
        quality_setting: request.quality_setting,
        lossy_mode: request.lossy_mode,
    };

    let store = STATS_STORE
        .lock()
        .map_err(|_| "Failed to acquire stats store lock".to_string())?;

    store
        .get_estimation(&query)
        .map_err(|e| format!("Failed to get estimation: {}", e))
}

/// Record a compression statistic for learning
#[tauri::command]
pub async fn record_compression_stat(
    request: RecordStatRequest,
    _state: State<'_, AppState>,
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

    let mut store = STATS_STORE
        .lock()
        .map_err(|_| "Failed to acquire stats store lock".to_string())?;

    store
        .save_stat(stat)
        .map_err(|e| format!("Failed to save stat: {}", e))
}

// record_compression_result_with_time function removed - was unused

/// Reset all compression statistics
#[tauri::command]
pub async fn reset_compression_stats(_state: State<'_, AppState>) -> Result<(), String> {
    let mut store = STATS_STORE
        .lock()
        .map_err(|_| "Failed to acquire stats store lock".to_string())?;

    store
        .clear_all()
        .map_err(|e| format!("Failed to clear stats: {}", e))
}

/// Get total number of compression statistics
#[tauri::command]
pub async fn get_stats_count(_state: State<'_, AppState>) -> Result<u32, String> {
    let store = STATS_STORE
        .lock()
        .map_err(|_| "Failed to acquire stats store lock".to_string())?;

    store
        .count_stats()
        .map_err(|e| format!("Failed to count stats: {}", e))
}

/// Get compression statistics summary
#[tauri::command]
pub async fn get_stats_summary(_state: State<'_, AppState>) -> Result<StatsSummary, String> {
    let store = STATS_STORE
        .lock()
        .map_err(|_| "Failed to acquire stats store lock".to_string())?;

    let total_stats = store
        .count_stats()
        .map_err(|e| format!("Failed to count stats: {}", e))?;

    // Get some sample estimations to show the current state
    let webp_estimation = store
        .get_estimation(&EstimationQuery {
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
