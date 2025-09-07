use crate::domain::{SqliteStatsStore};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use crate::domain::compression::{
    EasingFunction, ProgressConfig, ProgressEstimation, ProgressEstimationQuery,
    ProgressEstimationService,
};

// Global stats store for progress estimation (same as in stats.rs)
static STATS_STORE: std::sync::LazyLock<Mutex<SqliteStatsStore>> = std::sync::LazyLock::new(|| {
    let db_path = std::env::temp_dir()
        .join("plume")
        .join("compression_stats.db");
    std::fs::create_dir_all(db_path.parent().unwrap()).unwrap();
    let store = SqliteStatsStore::new(db_path.to_str().unwrap()).unwrap();
    Mutex::new(store)
});

/// Request parameters for getting compression time estimation
#[derive(Debug, Serialize, Deserialize)]
pub struct GetProgressEstimationRequest {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub quality_setting: u8,
    pub lossy_mode: bool,
}

/// Response with progress estimation details
#[derive(Debug, Serialize, Deserialize)]
pub struct GetProgressEstimationResponse {
    pub estimated_duration_ms: u64,
    pub confidence: f64,
    pub sample_count: u32,
    pub progress_config: ProgressConfigResponse,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressConfigResponse {
    pub estimated_duration_ms: u64,
    pub update_interval_ms: u64,
    pub easing_function: String,
    pub completion_threshold: f64,
}

/// Get compression time estimation based on historical data and fallbacks
#[tauri::command]
pub async fn get_progress_estimation(
    request: GetProgressEstimationRequest,
) -> Result<GetProgressEstimationResponse, String> {
    println!(
        "🎯 get_progress_estimation called for {}->({}) size: {} bytes",
        request.input_format, request.output_format, request.original_size
    );

    let store = STATS_STORE.lock().unwrap();

    let estimation_query = ProgressEstimationQuery {
        input_format: request.input_format.clone(),
        output_format: request.output_format.clone(),
        original_size: request.original_size,
        quality_setting: request.quality_setting,
        lossy_mode: request.lossy_mode,
    };

    let service = ProgressEstimationService::new(&*store);
    let estimation = service
        .estimate_duration(&estimation_query)
        .map_err(|e| format!("Failed to estimate duration: {}", e))?;

    // Create progress configuration
    let progress_config = ProgressConfig {
        estimated_duration_ms: estimation.estimated_duration_ms,
        update_interval_ms: 50, // Smooth 20fps updates
        easing_function: EasingFunction::EaseOut,
        completion_threshold: 92.0, // Réduire le seuil pour moins de délai
    };

    let response = GetProgressEstimationResponse {
        estimated_duration_ms: estimation.estimated_duration_ms,
        confidence: estimation.confidence,
        sample_count: estimation.sample_count,
        progress_config: ProgressConfigResponse {
            estimated_duration_ms: progress_config.estimated_duration_ms,
            update_interval_ms: progress_config.update_interval_ms,
            easing_function: match progress_config.easing_function {
                EasingFunction::Linear => "linear".to_string(),
                EasingFunction::EaseOut => "ease_out".to_string(),
                EasingFunction::Bezier(_, _, _, _) => "bezier".to_string(),
            },
            completion_threshold: progress_config.completion_threshold,
        },
    };

    println!(
        "📊 Progress estimation: {}ms (confidence: {:.2}, samples: {})",
        response.estimated_duration_ms, response.confidence, response.sample_count
    );

    Ok(response)
}

/// Create a new progress configuration with custom parameters
#[tauri::command]
pub async fn create_progress_config(
    estimated_duration_ms: u64,
    update_interval_ms: Option<u64>,
    easing_function: Option<String>,
    completion_threshold: Option<f64>,
) -> Result<ProgressConfigResponse, String> {
    let easing = match easing_function.as_deref() {
        Some("linear") => EasingFunction::Linear,
        Some("bezier") => EasingFunction::Bezier(0.25, 0.1, 0.25, 1.0), // Default cubic bezier
        _ => EasingFunction::EaseOut,                                   // Default
    };

    let config = ProgressConfig {
        estimated_duration_ms,
        update_interval_ms: update_interval_ms.unwrap_or(50),
        easing_function: easing,
        completion_threshold: completion_threshold.unwrap_or(92.0),
    };

    Ok(ProgressConfigResponse {
        estimated_duration_ms: config.estimated_duration_ms,
        update_interval_ms: config.update_interval_ms,
        easing_function: match config.easing_function {
            EasingFunction::Linear => "linear".to_string(),
            EasingFunction::EaseOut => "ease_out".to_string(),
            EasingFunction::Bezier(_, _, _, _) => "bezier".to_string(),
        },
        completion_threshold: config.completion_threshold,
    })
}

/// Get default compression timing estimates (fallback values)
#[tauri::command]
pub async fn get_default_compression_times() -> Result<Vec<(String, String, String, u64)>, String> {
    use crate::domain::compression::progress::DEFAULT_COMPRESSION_TIMES;

    let times = DEFAULT_COMPRESSION_TIMES
        .iter()
        .map(|((input, output, size), duration)| {
            (
                input.to_string(),
                output.to_string(),
                size.to_string(),
                *duration,
            )
        })
        .collect();

    Ok(times)
}