# ADR-0009 — Parallel compression: frontend-fired, backend-bounded

Status: proposed · 2026-07-25 (design for the next version's feature — not yet implemented)

## Context

Compression is currently **serial**: the store runs a `for … await` loop over the pending images,
calling `compress_image` one at a time. The next version turns this into **parallel** compression
(process several images at once). This ADR fixes the architecture *before* the feature is written so
the move is an addition, not a rewrite.

The ground is already prepared (audit, axe 8):

- `run_compression` is a **pure free function** (`domain/compression/pipeline.rs`) — owned inputs, no
  shared state → callable from N concurrent tasks as-is.
- `compress_image` already wraps it in `spawn_blocking` (CPU off the async-runtime workers, → [ADR-0008](./ADR-0008-error-model.md) neighbours / conventions.md §Concurrency).
- The database is a **managed singleton** whose `Mutex` serializes in-process stat writes, so N
  compressions finishing together cannot collide on SQLite.
- Progress is **frontend-only** ([ADR-0002](./ADR-0002-frontend-only-progress.md)): each image owns an
  `AdaptiveProgressManager`, a purely visual eased animation. The backend emits **no** progress events
  and holds **no** event bus.

Two axes have to be decided together: **who schedules/bounds concurrency**, and **whether progress is
simulated or measured**.

## Options considered

- **Option A — backend queue + worker pool + progress events.** The frontend sends one
  `compress_images(files)`; a backend `CompressionManager` owns a job queue, a worker pool, a
  concurrency limit, and **emits Tauri progress events** per job. Progress becomes *measured*.
  - Rejected as the default: it **revokes [ADR-0002](./ADR-0002-frontend-only-progress.md)**
    (frontend-only progress) and **reintroduces an event bus** (the "no event bus" stance of
    `architecture.md`). It is a large build (queue, worker pool, event protocol, per-job error/retry
    plumbing). Justified **only** if priority ordering, cross-job retries, or cross-job cancellation
    become real requirements — none are on the roadmap.

- **Option B — frontend fires N invokes, backend bounds with a Semaphore.** The store fires the
  pending `compress_image` invokes concurrently (no serial `await`). Each command **acquires a permit**
  from a **managed `tokio::sync::Semaphore`** (~`available_parallelism()` permits) before its
  `spawn_blocking`. Progress stays **frontend-only**, per-image, unchanged.
  - **Selected.** The semaphore *is* the queue: invokes beyond the permit count park on
    `acquire().await` (cheap async tasks, not blocked threads) and proceed as permits free. The
    frontend never learns the CPU limit — it just fires; the backend caps. Preserves ADR-0002, adds no
    event bus, and is a small diff.

## Decision

Adopt **Option B**.

- **Rust** — a small managed gate holds a `tokio::sync::Semaphore` sized to
  `std::thread::available_parallelism()` (fallback to a sane constant). `compress_image` acquires a
  permit at the top and holds it across the `spawn_blocking` await; the permit drops when the command
  returns. This bounds how many compressions run their CPU work simultaneously. Nothing else changes:
  `run_compression` stays the pure free function; the DB singleton keeps serializing stat writes.
- **Frontend** — the store stops awaiting each run sequentially and fires the pending compressions
  concurrently, each keeping its own `AdaptiveProgressManager`. Back-pressure comes entirely from the
  backend semaphore (the invokes queue on `acquire`). The `startCompression` reentrancy guard stays;
  per-image errors stay independent (`Image.toError`), as today.
- **Progress stays simulated** (per-image easing). Measured progress is explicitly *not* pursued —
  that is the Option A trade we decline.
- **Location** — any orchestration lives in `domain/compression/` (vertical slicing), **not** a
  horizontal `services/` layer. A stateful orchestrator, if one ever emerges, is an **actor struct**;
  the pure work stays the `run_compression` free function (no stateless "service" struct — `rust.md`
  §5, the `PathUtils` anti-pattern).

## Consequences

- **Bounded parallelism** protects CPU/RAM without the frontend knowing the limit.
- **[ADR-0002](./ADR-0002-frontend-only-progress.md) preserved**: no backend progress events, no event
  bus, N progress bars animate independently (the manager already supports multi-instance).
- **Small, additive diff**: ~a managed semaphore + one `acquire().await` in `compress_image`, minus
  the store's serial `await`. No new module tree, no rewrite of the pipeline.
- **Semaphore permit is held across `.await`** — this is fine: it is a `tokio::sync::Semaphore`
  (async-aware), *not* the database `Mutex`. The rule "never hold the **DB** lock across `.await`"
  (conventions.md §Concurrency) is unchanged and still holds — the stat save runs after the
  `spawn_blocking` await, briefly.
- **Simulated progress remains an approximation** — acceptable for fast per-image compression; if
  truthful progress is ever required, that is a *new* decision that would supersede this ADR toward
  Option A.
- **Reversible**: if priority/retries/cancellation later become real needs, a backend
  `CompressionManager` (Option A) can be introduced then, superseding this ADR — the pure
  `run_compression` core it would call is unchanged.

## Details

Concurrency rationale and the "simulated vs measured" / "frontend-fires vs backend-queue" framing →
[conventions.md](../conventions.md) §Concurrency & async. Progress model →
[ADR-0002](./ADR-0002-frontend-only-progress.md). Error contract per job →
[ADR-0008](./ADR-0008-error-model.md).
