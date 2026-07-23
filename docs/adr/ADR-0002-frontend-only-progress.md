# ADR-0002 — Frontend-only progress (`AdaptiveProgressManager`)

Status: accepted · 2026-07-22 (documented after the fact — decision already in force in the code)

## Context

We need a **smooth** progress bar during compression. But the native encoders (MozJPEG, oxipng,
libwebp, libheif) provide **no** progress callback: compressing one image is a short, atomic
operation with no externally observable steps.

A constraint established during analysis: compression time depends mostly on **content complexity**,
not on file size — a 500 KB logo compresses in ~50 ms where a 500 KB photo takes ~500 ms. An
estimation of the form `(format, size) → duration` is therefore structurally imprecise. Survey of
prior art: TinyPNG combines real progress (upload/download) with simulated compression; Squoosh
accepts approximation in favor of smooth progress. Common finding: users expect **continuous**
progress before they expect **accurate** progress.

## Options considered

- **Backend progress events** (Rust → frontend streaming) — rejected: oxipng exposes no callback
  (blocking API), and neither do mozjpeg or libwebp. Progress would have to be simulated on the
  backend — event plumbing for a made-up value.
- **Watching the output file size** — rejected: compression does not write linearly, so the
  intermediate size says nothing about progress.
- **Indeterminate bar (spinner)** — dismissed: gives no sense of duration.
- **Image complexity analysis before compression** (a score weighting pixel count, unique colors,
  per-block variance, edge transitions) — more accurate on paper, but requires calibration and adds
  processing cost before every compression. Set aside for v1, not revisited since.
- **Separate compression thread + real-time adaptive progress** — dismissed: complexity and
  instability risk out of proportion for an operation lasting about a second.
- **Hybrid real + estimated** (real progress on I/O, estimated on encoding) — dismissed: in a local
  desktop app the I/O share is marginal, there is almost nothing "real" to display.
- **Synthetic frontend progress, paced by the estimated duration** — **selected** (the TinyPNG
  model: accept the approximation, guarantee smoothness).

## Decision

`AdaptiveProgressManager` (frontend) drives synthetic progress in three phases:

1. **0 → 85%** — ease-out over the **estimated duration** (from the DB, see
   [ADR-0005](./ADR-0005-db-backed-estimation.md)). Fast start, decelerating as it approaches the
   cap. Never goes backwards.
2. **Hold at 85%** — waits for the **real completion signal** from the backend
   (`onCompressionCompleted`).
3. **85 → 100%** — final ease-out over **350 ms** once completion is confirmed.

The backend emits **only a binary "done" signal**, no progress. Refresh tick: 50 ms.

## Consequences

- **Smooth UX with no backend streaming** — all the logic lives on the frontend.
- **Accuracy depends on the estimation** ([ADR-0005](./ADR-0005-db-backed-estimation.md)): if the
  duration is underestimated, the bar **holds at 85%** until the signal arrives (never a false stall
  at 100%).
- The cap is **85%** (not 95% as CLAUDE.md mistakenly stated — since corrected).

## Details

Source: `src/domain/progress/adaptiveProgress.ts`. Fits into the pipeline described in
[ADR-0001](./ADR-0001-compression-pipeline.md).
