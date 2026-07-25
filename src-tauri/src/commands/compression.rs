use crate::commands::CommandError;
use crate::database::DatabaseManager;
use crate::domain::compression::{CompressionSummary, run_compression};
use crate::domain::{CompressionLevel, validate_image_file};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Semaphore;

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressImageRequest {
    pub file_path: String,
    pub quality: Option<u8>,
    pub format: Option<String>,
    pub level: Option<CompressionLevel>,
}

/// Bounds how many CPU-bound compressions run at once. The frontend fires one
/// `compress_image` invoke per image and lets them run in parallel; without a
/// limit a large batch would spawn as many heavy codec jobs as there are images,
/// exhausting memory and thrashing the CPU. Held as managed state so every
/// invoke shares the same permit pool.
pub struct CompressionLimiter(Arc<Semaphore>);

impl CompressionLimiter {
    /// Half the available cores (min 1) — a conservative default for heavy image
    /// codecs where each job holds large decode/encode buffers. A named constant
    /// to revisit, not a hard rule (could later be RAM-aware or user-configurable).
    pub fn new() -> Self {
        let permits = std::thread::available_parallelism()
            .map(|cores| (cores.get() / 2).max(1))
            .unwrap_or(1);
        Self(Arc::new(Semaphore::new(permits)))
    }

    fn handle(&self) -> Arc<Semaphore> {
        Arc::clone(&self.0)
    }
}

impl Default for CompressionLimiter {
    fn default() -> Self {
        Self::new()
    }
}

/// Thin adapter: validate the input, delegate the orchestration to
/// `run_compression`, persist the stat best-effort, and return the summary.
/// Business failures surface as `Err(CommandError)` — there is no `success:false`
/// payload channel.
#[tauri::command]
pub async fn compress_image(
    request: CompressImageRequest,
    db: State<'_, DatabaseManager>,
    limiter: State<'_, CompressionLimiter>,
) -> Result<CompressionSummary, CommandError> {
    let metadata = validate_image_file(Path::new(&request.file_path))?;

    // The frontend fires these invokes in parallel; the permit bounds how many
    // heavy jobs run at once. Acquired on the async side and held across the
    // blocking work, so the CPU/memory ceiling holds regardless of batch size.
    let permit = limiter
        .handle()
        .acquire_owned()
        .await
        .map_err(|e| CommandError::internal(format!("compression limiter closed: {e}")))?;

    // The command is `async` so Tauri runs it off the main/UI thread. But the
    // work itself is CPU-bound (codec decode/encode + file I/O) with nothing to
    // await, so it must not sit on an async-runtime worker (rust.md §8.1):
    // `spawn_blocking` moves it to the dedicated blocking pool.
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

    // Compression is done — free the permit before the DB write so a queued
    // image can start; the stat save below is fast and off the critical path.
    drop(permit);

    // Stats are backend-only and best-effort: a DB failure must not fail the
    // compression the user just obtained.
    if let Err(e) = db.save_compression_stat(&outcome.stat) {
        log::warn!("Failed to save compression stat: {e}");
    }

    Ok(outcome.summary)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn limiter_grants_at_least_one_permit() {
        // Whatever the core count (even a reported 0 or 1), the pool must allow
        // at least one compression to run, never deadlock at zero.
        let limiter = CompressionLimiter::new();
        assert!(limiter.0.available_permits() >= 1);
    }
}
