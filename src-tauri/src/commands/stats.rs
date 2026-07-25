// The progress-duration heuristic casts sizes and millisecond estimates between
// f64 and u64; the values are approximate by design and bounded by wall-clock
// time. Scoped deviation — see docs/conventions.md (pedantic-cast).
#![allow(
    clippy::cast_precision_loss,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]

use crate::commands::CommandError;
use crate::database::DatabaseManager;
use crate::domain::{EstimationQuery, EstimationResult};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct GetEstimationRequest {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub quality_setting: u8,
    pub lossy_mode: bool,
}

#[tauri::command]
pub async fn get_compression_estimation(
    request: GetEstimationRequest,
    db: State<'_, DatabaseManager>,
) -> Result<EstimationResult, CommandError> {
    let query = EstimationQuery {
        input_format: request.input_format,
        output_format: request.output_format,
        original_size: request.original_size,
        quality_setting: request.quality_setting,
        lossy_mode: request.lossy_mode,
    };

    db.get_compression_estimation(&query)
        .map_err(CommandError::internal)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressEstimationRequest {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressEstimationResult {
    pub estimated_duration_ms: u64,
    pub confidence: f64,
    pub sample_count: u32,
}

#[tauri::command]
pub async fn get_progress_estimation(
    request: ProgressEstimationRequest,
    db: State<'_, DatabaseManager>,
) -> Result<ProgressEstimationResult, CommandError> {
    if let Some((avg_ms, count)) = db
        .get_time_estimation(
            &request.input_format,
            &request.output_format,
            request.original_size,
            None, // pixel_count not available from frontend yet — DB matches by size_range fallback
        )
        .map_err(CommandError::internal)?
    {
        let confidence = (f64::from(count) / 20.0).min(1.0);
        return Ok(ProgressEstimationResult {
            estimated_duration_ms: avg_ms,
            confidence,
            sample_count: count,
        });
    }

    // Fallback heuristic when DB has no data
    let size_mb = request.original_size as f64 / (1024.0 * 1024.0);
    let is_heic = matches!(
        request.input_format.to_lowercase().as_str(),
        "heic" | "heif"
    );
    let is_png = request.output_format.to_lowercase() == "png";

    let mut estimated_ms: u64 = 2000;
    if size_mb > 1.0 {
        estimated_ms += (size_mb * 1500.0) as u64;
    }
    if size_mb > 5.0 {
        estimated_ms += (size_mb * 1000.0) as u64;
    }
    if is_heic {
        estimated_ms = (estimated_ms as f64 * 1.5) as u64;
    }
    if is_png {
        estimated_ms *= 2;
    }

    Ok(ProgressEstimationResult {
        estimated_duration_ms: estimated_ms,
        confidence: 0.0,
        sample_count: 0,
    })
}
