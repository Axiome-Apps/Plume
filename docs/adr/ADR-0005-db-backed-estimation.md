# ADR-0005 — SQLite-backed estimation (`pixel_count` + timing, learning)

Status: accepted · 2026-07-22 (documented after the fact — decision already in force in the code)

## Context

Before compressing, Plume shows the user a **prediction** (size savings + duration). Fixed
heuristics would be wrong: the real savings depend on the content of the user's images, on the
format pair, and on the settings.

## Options considered

- **Static heuristics per format pair** — insufficient on their own: the default values
  (`PNG→WebP`, `PNG→PNG`, `JPEG→WebP` bucketed small/medium/large) do not match any given user's
  actual images. **Kept as a fallback** (cold start, DB failure).
- **A complexity score computed on the image before compression** — more accurate, but requires
  calibration and adds processing cost before every compression. Set aside for v1; remains the
  identified improvement path if accuracy becomes a problem.
- **A model trained offline** — oversized for a local desktop app, and would not benefit from the
  user's own images.
- **SQLite-backed estimation, refined by real usage** — **selected**: statistical aggregation over
  the local history, therefore specific to the user's images, with no pre-analysis cost.

## Decision

Estimation backed by **SQLite**, which **improves with usage**: every compression records a stat
(ratio, `processing_time_ms`, `pixel_count`, formats, settings — see
[ADR-0001](./ADR-0001-compression-pipeline.md)).

Two queries are exposed:

- **`get_compression_estimation`** → `{ percent, ratio, confidence, sample_count }` (size savings).
- **`get_progress_estimation`** → estimated duration (feeds the progress bar,
  [ADR-0002](./ADR-0002-frontend-only-progress.md)).

On the frontend (`CompressionEstimationService`): on failure or missing data →
**`getFallbackEstimation`** (per-format-pair heuristics, `confidence` 0.3). `is_learning =
sample_count > 0` distinguishes "based on N similar compressions" from "reference estimate".

## Consequences

- **Predictions sharpen** with usage, specific to the user's own images.
- **Robustness**: the static fallback always guarantees an estimate, even from cold.
- **`pixel_count`** improves **duration** accuracy (an image that is heavy in MB but low in pixel
  count behaves differently from a highly pixelated one) → a better progress bar.

## Details

Sources: `src/domain/size-prediction/service.ts` (frontend, fallback) ·
`src-tauri/src/domain/compression/prediction.rs` + `stats.rs` (backend, DB).
