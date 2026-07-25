use crate::commands::CommandError;
use crate::database::DatabaseManager;
use crate::domain::compression::{CompressionSummary, run_compression};
use crate::domain::{CompressionLevel, validate_image_file};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressImageRequest {
    pub file_path: String,
    pub quality: Option<u8>,
    pub format: Option<String>,
    pub level: Option<CompressionLevel>,
}

/// Thin adapter: validate the input, delegate the orchestration to
/// `run_compression`, persist the stat best-effort, and return the summary.
/// Business failures surface as `Err(CommandError)` — there is no `success:false`
/// payload channel.
#[tauri::command]
pub async fn compress_image(
    request: CompressImageRequest,
    db: State<'_, DatabaseManager>,
) -> Result<CompressionSummary, CommandError> {
    let metadata = validate_image_file(Path::new(&request.file_path))?;

    // The command is `async` so Tauri runs it off the main/UI thread. But the
    // work itself is CPU-bound (codec decode/encode + file I/O) with nothing to
    // await, so it must not sit on an async-runtime worker (rust.md §8.1):
    // `spawn_blocking` moves it to the dedicated blocking pool. When compression
    // becomes parallel, a Semaphore (~num_cpus) will bound how many run at once.
    let file_path = request.file_path.clone();
    let format = request.format.clone();
    let quality = request.quality;
    let level = request.level.unwrap_or(CompressionLevel::Balanced);
    let outcome = tauri::async_runtime::spawn_blocking(move || {
        run_compression(
            Path::new(&file_path),
            &metadata,
            format.as_deref(),
            quality,
            level,
        )
    })
    .await
    .map_err(|e| CommandError::internal(format!("compression task failed: {e}")))??;

    // Stats are backend-only and best-effort: a DB failure must not fail the
    // compression the user just obtained.
    if let Err(e) = db.save_compression_stat(&outcome.stat) {
        log::warn!("Failed to save compression stat: {e}");
    }

    Ok(outcome.summary)
}
