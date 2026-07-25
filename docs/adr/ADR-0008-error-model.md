# ADR-0008 — Error model: typed `CommandError` at the IPC boundary

Status: accepted · 2026-07-25

## Context

Every Tauri command returned `Result<_, String>` and exposed the **raw internal error chain** to JS
(`format!("Failed…: {e}")`). The frontend had no typed contract, so it recovered meaning by
**matching English substrings** of that string (`compressionErrorKey`) — a fragile coupling that
broke the moment a backend message was reworded. The domain's typed error enums
(`CompressionError`, `FileError`, `StatsError`) were flattened to `String` at the boundary, and
`thiserror` (a declared dependency) was unused — the enums implemented `Display`/`Error` by hand.
`compress_image` additionally carried a **dead `Err` channel**: it was `always Ok` with business
failures in a `success:false` payload, so its `Result<_, String>` signature was misleading. No React
error boundary existed, so an uncaught render error blanked the window.

## Options considered

- **Keep `String` at the boundary** — rejected: perpetuates substring matching and leaks internals.
- **Typed `CommandError` on the Rust side only** (stop leaking internals) but no discriminated union
  on the frontend — rejected: the frontend would still map loosely; half a contract.
- **Typed `CommandError { kind, message }` + a frontend discriminated union keyed on `kind`** —
  **selected** (`rust.md` §11.1 + `typescript.md` §6 option C).

## Decision

- **Rust** — domain enums use `thiserror`. A boundary enum `CommandError`
  (`commands/error.rs`) serializes to JS as `{ kind, message }`: `kind` is a stable machine code
  (`validation | not_found | io | security | unsupported | internal`), `message` a controlled
  diagnostic string (never the raw internal chain). Domain errors convert via `From`.
- **Every command** returns `Result<T, CommandError>`. `compress_image` is **unified** onto this
  contract — the `success:false` payload channel is removed. Its orchestration is extracted into the
  domain free function `run_compression` (`domain/compression/pipeline.rs`); the command is a thin
  adapter (validate → delegate → record stat best-effort → return). The "already optimized" guard
  moves into the domain and is unit-tested there.
- **Frontend** — the single IPC boundary (`src/lib/tauri.ts`) parses a rejection into a typed
  `CommandError` (`src/domain/errors`); consumers branch on `kind` and map it to an i18n key. A root
  `ErrorBoundary` catches exceptional render errors.

## Consequences

- The frontend never inspects error strings; `kind` is the contract, i18n messages live in
  `locales/{fr,en}.json` under `errors.*` keyed by kind.
- The command layer is thin and the compression orchestration is testable without Tauri.
- Contract change: `compress_image` now **rejects** on failure instead of resolving with
  `success:false` — supersedes the "always Ok" note of [ADR-0001](./ADR-0001-compression-pipeline.md).
- Discipline: `kind` values are stable API — renaming one is a breaking change for the i18n map.
- The `message` field is diagnostic only; a reviewer must reject showing it to the user in place of
  the `kind`-mapped i18n text.

## Details

Project error rules → [conventions.md](../conventions.md). Source: `src-tauri/src/commands/error.rs`,
`src-tauri/src/domain/compression/pipeline.rs`, `src/domain/errors/`, `src/lib/tauri.ts`.
