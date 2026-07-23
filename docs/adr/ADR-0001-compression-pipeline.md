# ADR-0001 — Compression pipeline: estimation → engine → stat → result

Status: accepted · 2026-07-22 (documented after the fact — decision already in force in the code)

## Context

Plume compresses images **locally** (no upload). We need a clear flow, from the prediction shown to
the user through to the learning that refines subsequent predictions, without the frontend and the
backend stepping on each other over who computes and who records.

## Options considered

_(reconstructed from the code — to be confirmed/completed)_

- **Static estimations** (fixed heuristics per format pair) — insufficient: does not reflect the
  user's actual images. Kept only as a **fallback** (see
  [ADR-0005](./ADR-0005-db-backed-estimation.md)).
- **Stats computed on the frontend** — rejected: would duplicate the source of truth and expose
  business logic to the frontend (see [ADR-0004](./ADR-0004-tauri-ipc-boundary.md) — the backend acts
  and records).
- **Pipeline estimation(DB) → engine → stat(DB) → result** — **selected**.

## Decision

A four-stage flow:

1. **Estimation (DB)** — the frontend queries a SQLite-backed estimation (size + duration) to display
   a prediction **and** to feed the progress bar duration. It is a query, not part of
   `compress_image`. Details: [ADR-0005](./ADR-0005-db-backed-estimation.md).
2. **Compression (Rust engine)** — `compress_image` validates the file, picks the output format
   (explicit / `auto` / optimal for the input), then compresses through the native engine (MozJPEG,
   oxipng, libwebp, libheif).
3. **Recorded stat (DB)** — the backend writes a **real** stat to SQLite: formats, sizes,
   `processing_time_ms`, `pixel_count`, settings. **Backend-only** — the frontend does not duplicate
   it. This accumulation is what improves future estimations.
4. **Result to the frontend** — sizes, `savings_percent`, `output_path`.

**"Already optimized" guard**: if the compressed file is **≥** the original, it is deleted and the
original is kept (`savings = 0`). Plume never produces a larger file.

## Consequences

- **Adaptive learning**: predictions sharpen with real usage (through the stats).
- **Clean separation**: the frontend displays, the backend acts and records — a single source of
  truth.
- **Never a size regression**: the "already optimized" guard protects the user.
- A stat write failure is **non-blocking** (`warn` log) — compression takes precedence over
  measurement.

## Details

Estimation → [ADR-0005](./ADR-0005-db-backed-estimation.md) · Progress →
[ADR-0002](./ADR-0002-frontend-only-progress.md) · Output naming →
[ADR-0003](./ADR-0003-output-naming.md).
