# ADR-0003 — Output naming: `{name}_{level}.{ext}`, overwrite vs new file

Status: accepted · 2026-07-22 (documented after the fact — decision already in force in the code)

## Context

The compressed file needs a **predictable** name, one that allows recompressing without piling up
duplicates while still making it possible to compare several compression levels.

## Options considered

_(reconstructed from the code — to be confirmed/completed)_

- **A single fixed suffix** (`_compressed`) — dismissed: makes it impossible to compare
  light/balanced/aggressive side by side.
- **Systematic collision-safe naming** (`photo (1).webp`, never overwrite) — **code had been
  scaffolded** for this (`generate_output_path` / `make_unique_filename`) but was **never wired up**;
  removed (see the potential feature on the roadmap).
- **Deterministic `{name}_{level}.{ext}`, overwriting at the same setting** — **selected**.

## Decision

Default output (same folder as the input): **`{stem}_{level}.{ext}`** with
`level ∈ {light, balanced, aggressive}` (default: `balanced`).

- **Deterministic** → recompressing at the **same** level **overwrites** the file (no proliferation).
- Changing level → **new** file → side-by-side comparison is possible.
- Custom `output_path` branch: if it is a **directory**, `{stem}.{ext}` inside it; if it is a
  **file**, that exact path.
- "Already optimized" guard: compressed ≥ original → the compressed file is deleted and the original
  is kept (see [ADR-0001](./ADR-0001-compression-pipeline.md)).

## Consequences

- **No duplicates** at the same setting; **comparison** possible across levels.
- **Overwriting is deliberate**: there is no collision protection. A user file that happens to be
  named `{stem}_{level}.{ext}` would be overwritten — hence the **collision-safe naming** item noted
  on the roadmap (to be reconsidered alongside output folder selection).

## Details

Source: `src-tauri/src/commands/compression.rs` (`compress_image`). The custom `output_path` branch
foreshadows the **output folder selection** on the roadmap.
