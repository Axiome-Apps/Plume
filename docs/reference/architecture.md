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
│   ├── molecules/   BatchKpiCard, CompressionSuccess, ImageActions,
│   │                ImagePreview, ImageRow, SettingsPanel
│   ├── organisms/   DropZone, ImageList, PlumeHeader
│   ├── templates/   AppLayout
│   ├── brand/       LogoPlume, Stroke
│   └── icons/       SVG icon set + types.ts
├── domain/          business slices (see below)
├── hooks/           useDragDropGlobal, useTranslation
├── lib/tauri.ts     single IPC boundary
├── store/           imageStore (Zustand)
└── locales/         fr / en
```

### `src/domain/` slices

| Slice              | Contents                  | Role                                                                                 |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------ |
| `compression/`     | `schema.ts`               | output formats, levels (light / balanced / aggressive)                               |
| `image/`           | `schema.ts`, `entity.ts`  | queued image, state, result                                                          |
| `drag-drop/`       | `schema.ts`, `entity.ts`  | drop events, supported-extension filtering                                           |
| `progress/`        | `adaptiveProgress.ts`     | `AdaptiveProgressManager` (→ [ADR-0002](../adr/ADR-0002-frontend-only-progress.md))  |
| `size-prediction/` | `schema.ts`, `service.ts` | estimation + static fallback (→ [ADR-0005](../adr/ADR-0005-db-backed-estimation.md)) |
| `i18n/`            | `config.ts`, `schema.ts`  | FR/EN internationalization                                                           |

Validation: **Zod** within each slice, types via `z.infer`. Single parsing boundary — no
revalidation internally.

### State

`src/store/imageStore.ts` (Zustand) holds the image queue, the compression settings (`quality`,
`outputFormat`, `level`), the compression state (`idle | processing | completed | error`) and the
current view (`drop | list | success`).

### IPC boundary — `src/lib/tauri.ts`

The only module that imports `@tauri-apps/api/core`. It exposes: `initDatabase`, `selectImageFiles`,
`getFileInformation`, `revealInFolder`, `compressImage`, `getProgressEstimation`,
`getCompressionEstimation`.

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
    ├── compression/       engine, formats, settings, prediction, stats, error
    ├── file/              metadata, operations, path, error
    └── shared/            config, error, utils
```

Style: **pure functions + data**, modules by responsibility, per-domain typed errors (`thiserror`).
No `super::` — imports go through `crate::`.

`AppState` (in `shared/mod.rs`) carries the application configuration only. There is no event bus:
the backend emits no domain events, in line with
[ADR-0002](../adr/ADR-0002-frontend-only-progress.md).

### Exposed commands

Declared in `lib.rs`:

| Command                      | Role                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- |
| `compress_image`             | validates, compresses, writes the file, records the stat                  |
| `select_image_files`         | native file picker                                                        |
| `get_file_information`       | file size                                                                 |
| `get_compression_estimation` | estimated size savings (`percent`, `ratio`, `confidence`, `sample_count`) |
| `get_progress_estimation`    | estimated duration (feeds the progress bar)                               |
| `record_compression_stat`    | records a stat                                                            |
| `reset_compression_stats`    | purges the history                                                        |
| `init_database`              | creates tables / indexes at startup                                       |

`compress_image` returns a `CompressImageResponse` that is **always `Ok`** at the Tauri level:
business failures are carried by `success: false` + `error`, not by an IPC `Err`.

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

Output naming `{name}_{level}.{ext}` → [ADR-0003](../adr/ADR-0003-output-naming.md). If the
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

- Rust toolchain pinned by `rust-toolchain.toml` (rustfmt + clippy).
- `profile.dev.package."*"` at `opt-level = 3`: without it the compression libraries are 10–50×
  slower in dev.
- Lightweight CI on PRs (lint + clippy + tests), full 4-platform build on release tags.
- Release in one command: `pnpm bump <patch|minor|major|X.Y.Z>`.
  → [ADR-0006](../adr/ADR-0006-versioning-release.md) · [runbook](../release/release-runbook.md).
- Tests: Vitest on the frontend, `cargo test` on the Rust side. The design layer (markup, classes)
  is not tested — only logic is.

---

## Licensing note

Plume is distributed under the GPL-3.0-or-later. The HEIC/HEIF import path statically links
**libheif** and **libde265**, both LGPL-3.0, vendored under
`src-tauri/patches/libheif-sys/vendor/`. Any move to a permissive license would have to address that
static linking. See [THIRD-PARTY-NOTICES.md](../../THIRD-PARTY-NOTICES.md).
