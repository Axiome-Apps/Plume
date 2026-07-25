// `elapsed().as_millis()` is u128; a single compression never runs long enough
// to overflow u64. Scoped deviation — see docs/conventions.md (pedantic-cast).
#![allow(clippy::cast_possible_truncation)]

use std::path::Path;
use std::time::Instant;

use serde::{Deserialize, Serialize};

use crate::domain::compression::engine::{CompressionOutput, compress_file_to_file};
use crate::domain::compression::error::CompressionError;
use crate::domain::compression::formats::OutputFormat;
use crate::domain::compression::naming::{CompressionLevel, resolve_output_path};
use crate::domain::compression::settings::{CompressionSettings, DEFAULT_QUALITY};
use crate::domain::compression::stats::{CompressionStat, create_stat_with_time};
use crate::domain::file::{FileMetadata, validate_safe_path};

/// Summary of a successful compression, mirrored by the frontend schema.
#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionSummary {
    pub original_size: u64,
    pub compressed_size: u64,
    pub savings_percent: f64,
    pub output_path: String,
}

/// Everything a successful compression produces: the summary returned to the
/// frontend and the stat to persist. Building both here keeps the Tauri command
/// a thin adapter.
pub struct CompressionOutcome {
    pub summary: CompressionSummary,
    pub stat: CompressionStat,
}

/// Orchestrates a single compression: resolve the output format and path,
/// compress, then decide whether the compressed file is worth keeping. The input
/// is assumed already validated (see `validate_image_file`), so this returns a
/// `CompressionError` only for genuine processing failures.
pub fn run_compression(
    file_path: &Path,
    metadata: &FileMetadata,
    requested_format: Option<&str>,
    quality: Option<u8>,
    level: CompressionLevel,
) -> Result<CompressionOutcome, CompressionError> {
    let output_format = resolve_output_format(requested_format, metadata);
    let quality = quality.unwrap_or(DEFAULT_QUALITY);
    let settings = CompressionSettings::new(quality, output_format);

    let output_path = resolve_output_path(file_path, level, output_format.extension());

    // The output path is derived here and written by the engine through std::fs,
    // so it never passes through get_file_info. Validate it before writing.
    validate_safe_path(&output_path)
        .map_err(|e| CompressionError::ProcessingError(format!("Invalid output path: {e}")))?;

    let pixel_count = image::image_dimensions(file_path)
        .map(|(w, h)| u64::from(w) * u64::from(h))
        .ok();

    let started = Instant::now();
    let output = compress_file_to_file(file_path, output_path.as_path(), &settings)?;
    let processing_time = started.elapsed().as_millis() as u64;

    let input_format = metadata
        .extension
        .clone()
        .unwrap_or_else(|| "unknown".to_string());
    let stat = create_stat_with_time(
        input_format,
        output_format.extension().to_string(),
        output.original_size,
        output.compressed_size,
        processing_time,
        pixel_count,
        &settings,
    );

    let (keep_original, summary) = resolve_final_summary(&output, file_path);
    if keep_original {
        // Best-effort cleanup of the non-improving output; log rather than
        // discard the error, mirroring the stat-save best-effort in the command.
        if let Err(e) = std::fs::remove_file(&output.output_path) {
            log::warn!("Failed to remove non-improving compressed file: {e}");
        }
    }

    Ok(CompressionOutcome { summary, stat })
}

fn resolve_output_format(requested_format: Option<&str>, metadata: &FileMetadata) -> OutputFormat {
    match requested_format {
        Some("webp") => OutputFormat::WebP,
        Some("png") => OutputFormat::Png,
        Some("jpg" | "jpeg") => OutputFormat::Jpeg,
        Some("auto") => {
            let ext = metadata
                .extension
                .clone()
                .unwrap_or_else(|| "webp".to_string());
            match ext.as_str() {
                "heic" | "heif" => OutputFormat::Jpeg,
                _ => CompressionSettings::preserve_input_format(&ext),
            }
        }
        _ => {
            let ext = metadata
                .extension
                .clone()
                .unwrap_or_else(|| "webp".to_string());
            CompressionSettings::optimal_format_for_input(&ext)
        }
    }
}

/// When compression did not shrink the file, keep the original and report zero
/// savings; otherwise keep the compressed file. The bool tells the caller whether
/// the compressed output should be deleted.
fn resolve_final_summary(
    output: &CompressionOutput,
    input_path: &Path,
) -> (bool, CompressionSummary) {
    if output.compressed_size >= output.original_size {
        (
            true,
            CompressionSummary {
                original_size: output.original_size,
                compressed_size: output.original_size,
                savings_percent: 0.0,
                output_path: input_path.to_string_lossy().to_string(),
            },
        )
    } else {
        (
            false,
            CompressionSummary {
                original_size: output.original_size,
                compressed_size: output.compressed_size,
                savings_percent: output.savings_percent,
                output_path: output.output_path.to_string_lossy().to_string(),
            },
        )
    }
}

#[cfg(test)]
// Assertions compare against exact float literals produced by the same code path,
// so bit-equality is the intended check.
#[allow(clippy::float_cmp)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn output(original: u64, compressed: u64, savings: f64) -> CompressionOutput {
        CompressionOutput {
            output_path: PathBuf::from("/tmp/photo_balanced.webp"),
            original_size: original,
            compressed_size: compressed,
            format: OutputFormat::WebP,
            savings_percent: savings,
        }
    }

    #[test]
    fn keeps_the_original_when_compression_does_not_shrink() {
        let (keep, summary) =
            resolve_final_summary(&output(1000, 1200, -20.0), Path::new("/tmp/photo.png"));

        assert!(keep);
        assert_eq!(summary.compressed_size, 1000);
        assert_eq!(summary.savings_percent, 0.0);
        assert_eq!(summary.output_path, "/tmp/photo.png");
    }

    #[test]
    fn keeps_the_compressed_file_when_it_shrinks() {
        let (keep, summary) =
            resolve_final_summary(&output(1000, 400, 60.0), Path::new("/tmp/photo.png"));

        assert!(!keep);
        assert_eq!(summary.compressed_size, 400);
        assert_eq!(summary.savings_percent, 60.0);
        assert_eq!(summary.output_path, "/tmp/photo_balanced.webp");
    }
}
