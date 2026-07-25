# Architecture — internal reference

The **current** state of the code (the "what"). The "why" lives in the [ADRs](../adr/README.md) —
this file contradicts none of them and links out to them.

## Overview

**Tauri 2** desktop application: a React frontend that displays, a Rust backend that acts.

```
React (Vite)  ──invoke()──►  Rust (Tauri)  ──►  native encoders
     ▲                            │
     │                            └──►  SQLite (stats + estimation)
     └── src/lib/tauri.ts: single IPC entry point (ADR-0004)
```

Split of responsibilities (→ [ADR-0004](../adr/ADR-0004-tauri-ipc-boundary.md)): the frontend
displays and orchestrates the UI, the backend validates, compresses, writes to disk and records
stats.

---

## Frontend — `src/`

```
src/
├── components/
│   ├── atoms/       Button, LanguageSelector, ProgressBar, SegmentedControl,
│   │                StatusBadge, Tooltip
│   ├── molecules/   ImageActions, ImagePreview, ImageRow
│   ├── organisms/   BatchKpiCard, CompressionSuccess, DropZone, ErrorBoundary,
│   │                ImageList, PlumeHeader, SettingsPanel
│   ├── templates/   AppLayout
│   ├── brand/       LogoPlume, Stroke
│   └── icons/       SVG icon set + types.ts
├── domain/          business slices (see below)
├── hooks/           useDragDropGlobal, useTranslation
├── lib/             tauri.ts (single IPC boundary), cn.ts (clsx + tailwind-merge),
│                    format.ts (byte formatting)
├── store/           imageStore (Zustand)
└── locales/         fr / en
```

### `src/domain/` slices

| Slice              | Contents                                 | Role                                                                                 |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `compression/`     | `schema.ts`                              | output formats, levels (light / balanced / aggressive)                               |
| `image/`           | `schema.ts`, `entity.ts`, `batch.ts`     | queued image, state, result, batch aggregation                                       |
| `drag-drop/`       | `schema.ts`, `entity.ts`                 | drop events, supported-extension filtering                                           |
| `progress/`        | `adaptiveProgress.ts`                    | `AdaptiveProgressManager` (→ [ADR-0002](../adr/ADR-0002-frontend-only-progress.md))  |
| `size-prediction/` | `schema.ts`, `service.ts`                | estimation + static fallback (→ [ADR-0005](../adr/ADR-0005-db-backed-estimation.md)) |
| `i18n/`            | `config.ts`, `schema.ts`, `translate.ts` | FR/EN internationalization; `translate()` serves code outside React                  |

Validation: **Zod** within each slice, types via `z.infer`. Every IPC response is parsed once in
`lib/tauri.ts` and trusted from there on — no revalidation internally.

### State

`src/store/imageStore.ts` (Zustand) holds the image queue, the compression settings (`quality`,
`outputFormat`, `level`), the compression state (`idle | processing | completed | error`) and the
current view (`drop | list | success`).

### IPC boundary — `src/lib/tauri.ts`

The only module that imports `@tauri-apps/api/core`. It exposes: `initDatabase`, `selectImageFiles`,
`getFileInformation`, `revealInFolder`, `compressImage`, `getProgressEstimation`,
`getCompressionEstimation`.

Each response is validated against a Zod schema owned by the matching domain slice
(`CompressImageResponseSchema`, `FileInfoSchema`, `ProgressEstimationSchema`,
`EstimationResultSchema`, `SelectedFilesSchema`). Fields backed by a Rust `Option` are `nullish`,
since serde serializes `None` as `null`.

Tauri 2 converts camelCase ↔ snake_case automatically: do **not** rename parameters by hand.

---

## Backend — `src-tauri/src/`

```
src-tauri/src/
├── main.rs
├── lib.rs                 command registration (invoke_handler)
├── commands/              IPC layer: compression, file, stats, database
├── database/              connection.rs, migrations.rs (SQLite)
└── domain/
    ├── compression/       engine, formats, naming, settings, stats, error
    └── file/              metadata, path, error
```

Style: **pure functions + data**, modules by responsibility, per-domain typed errors (`thiserror`).
Production imports go through `crate::`, never `super::`. Every command returns
`Result<T, CommandError>` — a typed `{ kind, message }` frontier error, never a raw string
(→ [ADR-0008](../adr/ADR-0008-error-model.md)).

The backend holds no domain state machine and no event bus. It manages **one** piece of
infrastructure state: a single `DatabaseManager`, created in `setup` and shared through Tauri managed
state (`State<'_, DatabaseManager>`). Its internal `Mutex` serializes SQLite access **from this
instance**, so in-process commands never collide and it is opened once rather than per command (it
does not protect against another process touching the file). The absence of domain events follows
[ADR-0002](../adr/ADR-0002-frontend-only-progress.md); the concurrency rationale lives in
[conventions.md](../conventions.md).

Every path that reaches the disk is checked by `validate_safe_path` (free function in
`domain/file/path.rs`) — input paths through `get_file_info`, output paths explicitly in
`run_compression` before the engine writes. The allowed directory roots are the single source of
truth `allowed_roots()` in the same module; the asset-protocol scope in `tauri.conf.json` mirrors
that list. Least-privilege security surface (CSP, asset scope, capability, allow-list) →
[ADR-0007](../adr/ADR-0007-least-privilege-security.md).

### Exposed commands

Declared in `lib.rs`:

| Command                      | Role                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- |
| `compress_image`             | validates, compresses, writes the file, records the stat                  |
| `select_image_files`         | native file picker (title supplied by the frontend, translated there)     |
| `get_file_information`       | path, name, size, extension, is_image                                     |
| `get_compression_estimation` | estimated size savings (`percent`, `ratio`, `confidence`, `sample_count`) |
| `get_progress_estimation`    | estimated duration (feeds the progress bar)                               |
| `init_database`              | creates tables / indexes at startup                                       |

Stats are recorded by `compress_image` itself, so no command exposes stat writing.

`compress_image` returns a `CompressionSummary` on success and **rejects with a typed `CommandError`**
on failure — like every command (→ [ADR-0008](../adr/ADR-0008-error-model.md)). Its orchestration
lives in the domain free function `run_compression` (`domain/compression/pipeline.rs`); the command is
a thin adapter that validates, delegates, records the stat best-effort, and returns. It is `async`
only to run off the main/UI thread and wraps the CPU-bound `run_compression` in `spawn_blocking` so it
never occupies an async-runtime worker (concurrency rationale →
[conventions.md](../conventions.md)).

### Formats

| Direction | Formats                                                             |
| --------- | ------------------------------------------------------------------- |
| Input     | PNG, JPEG, WebP, HEIC/HEIF (transcoded)                             |
| Output    | PNG (`oxipng`, always lossless), JPEG (`mozjpeg`), WebP (`libwebp`) |

ICC profiles are preserved across all conversions.

### Compression pipeline

Detail and rationale → [ADR-0001](../adr/ADR-0001-compression-pipeline.md).

```
image → estimation (DB) → Rust engine → recorded stat → result to the frontend
```

Output naming `{name}_{level}.{ext}` lives in `domain/compression/naming.rs` as the pure function
`resolve_output_path`; the level is a `CompressionLevel` enum, so an unknown value fails the request
rather than silently producing a misnamed file → [ADR-0003](../adr/ADR-0003-output-naming.md). If the
compressed file would be larger than the original, Plume keeps the original ("already optimized").

---

## Persistence — SQLite

A single table, created by `database/migrations.rs`:

```sql
CREATE TABLE IF NOT EXISTS compression_stats (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    input_format          TEXT    NOT NULL,
    output_format         TEXT    NOT NULL,
    input_size_range      TEXT    NOT NULL,
    quality_setting       INTEGER NOT NULL,
    lossy_mode            BOOLEAN NOT NULL,
    size_reduction_percent REAL   NOT NULL,
    original_size         INTEGER NOT NULL,
    compressed_size       INTEGER NOT NULL,
    pixel_count           INTEGER,
    compression_time_ms   INTEGER,
    timestamp             TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compression_formats
    ON compression_stats(input_format, output_format, quality_setting);
```

`pixel_count` is added by a failure-tolerant `ALTER TABLE` for databases created before it existed.
There is no migration framework: `CREATE TABLE IF NOT EXISTS` + idempotent `ALTER`.

The role of this table → [ADR-0005](../adr/ADR-0005-db-backed-estimation.md).

---

## Progress

Frontend-only. `AdaptiveProgressManager`: ease-out from 0 → 85% over the estimated duration, hold at
85% until the backend completion signal, then a 350 ms ease-out to 100%. 50 ms tick, never goes
backwards. **The backend emits no progress events.**

→ [ADR-0002](../adr/ADR-0002-frontend-only-progress.md).

---

## Build, tests, release

- Rust toolchain pinned by `rust-toolchain.toml` (rustfmt + clippy); Node pinned by `.nvmrc`, with
  `engines.node` as the advisory floor (→ [conventions.md](../conventions.md) §Versioning).
- Both lockfiles committed (`pnpm-lock.yaml`, `src-tauri/Cargo.lock`); CI installs strictly
  (`pnpm install --frozen-lockfile`, `cargo … --locked`) so the lock is never silently regenerated.
- `profile.dev.package."*"` at `opt-level = 3`: without it the compression libraries are 10–50×
  slower in dev.
- Lightweight CI on PRs (lint + clippy + tests), full 4-platform build on release tags.
- Release in one command: `pnpm bump <patch|minor|major|X.Y.Z>`.
  → [ADR-0006](../adr/ADR-0006-versioning-release.md) · [runbook](../release/release-runbook.md).
- Tests: `cargo test` on the Rust side, `pnpm test` (Vitest) on the frontend, where the suites sit
  in `src/**/__tests__/` next to the module they cover. The design layer (markup, classes) is
  deliberately not tested — only logic is, which is why `src/components/` has no suite and the
  global coverage figure stays low on purpose.

---

## Licensing note

Plume is distributed under the GPL-3.0-or-later. The HEIC/HEIF import path statically links
**libheif** and **libde265**, both LGPL-3.0, vendored under
`src-tauri/patches/libheif-sys/vendor/`. Any move to a permissive license would have to address that
static linking. See [THIRD-PARTY-NOTICES.md](../../THIRD-PARTY-NOTICES.md).
