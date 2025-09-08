// This module has been replaced by the AdaptiveProgressManager in TypeScript
// All progress-related functionality is now handled on the frontend
// keeping only the module structure for potential future use

use serde::{Deserialize, Serialize};

/// Legacy progress types kept for potential future API compatibility
#[derive(Debug, Serialize, Deserialize)]
pub struct GetProgressEstimationRequest {
    pub input_format: String,
    pub output_format: String,
    pub original_size: u64,
    pub quality_setting: u8,
    pub lossy_mode: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressConfigResponse {
    pub estimated_duration_ms: u64,
    pub update_interval_ms: u64,
    pub easing_function: String,
    pub completion_threshold: f64,
}