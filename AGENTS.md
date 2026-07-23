# Plume - Development Conventions & Best Practices

Immutable conventions and best practices guide for Plume development.

> **This file is the SSOT for agent instructions**, whatever the tool (Claude Code, Cursor, Copilot,
> Codex…). `CLAUDE.md` is only a pointer to it (`@AGENTS.md`) — never write anything there, all
> edits happen here.

**Project truths**: [`docs/adr/`](./docs/adr/README.md) (decisions + rationale) and
[`docs/reference/architecture.md`](./docs/reference/architecture.md) (current state of the code).
This file is only a short operating manual that points there.
**Product & debt**: [`ROADMAP.md`](./ROADMAP.md) — single SSOT, there is no TODO.md anymore.

## Language Strategy

**Everything developer-facing is English** — code, comments, technical docs, ADRs, commit messages,
this file. Rationale: contributors may not read French, and models are better calibrated on English
instructions.

**UI is French by default** (error messages included), with FR/EN i18n under `src/locales/`. This is
a product decision, not a documentation one — do not "translate" UI strings into the codebase
language.

## Code Conventions

### Code Quality Rules

**General**: Never `any` • Never `as` for renaming • `@` imports from src/

**Rust**: Never `as` imports • Explicit names • `crate::` imports • No `super::` • Separate
logic/infra/commands

**Logging**: `log::debug!`/`log::info!`/`log::warn!` on the Rust side (never `println!`) • No
`console.log` in production on the frontend (only `console.error` inside catch blocks)

### Validation & Types

**TypeScript**: Zod schemas in `domain/{feature}/schema.ts` • Inference via `z.infer<typeof Schema>`
• `Type` suffix • Never duplicate

**Rust**: Pure functions + data • Simple names • Modules by responsibility • snake_case/PascalCase •
Composition over inheritance

### Domain Architecture

**TypeScript DDD**: `/domain/{feature}/` → schema.ts • entity.ts • service.ts • index.ts • `toJSON()`
on entities

**Rust modules**: `/domain/{feature}/` → mod.rs • settings.rs • engine.rs • stats.rs • error.rs •
Struct + free fn

### React State & Logic

**Hooks**: useCallback in deps • Custom hooks for complex logic
**Design**: Atomic (atoms → molecules → organisms → templates) • Separate UI/logic/data
**Props**: No inline objects/arrays • Unique and stable keys

### Tauri IPC Boundary

**Single entry point**: All `invoke()` calls go through `src/lib/tauri.ts` — never import
`@tauri-apps/api/core` directly anywhere else
**Naming**: Tauri 2 auto-converts camelCase ↔ snake_case — do NOT convert parameter names manually
**Responsibility**: The frontend displays, the backend acts and records (stats, compression, file
writing)
Decision + rationale → [ADR-0004](./docs/adr/ADR-0004-tauri-ipc-boundary.md)

## Architectural Patterns

**TypeScript DDD**: Structure by feature • Entities + `toJSON()` • Services for use cases • Zod +
inference

**Rust functional**: Pure functions + data • Modules by responsibility • Traits for extensibility

**Compression pipeline**: Image → estimation (DB) → compression (Rust engine) → recorded stat (DB
with pixel_count + timing) → result to the frontend — → [ADR-0001](./docs/adr/ADR-0001-compression-pipeline.md),
estimation [ADR-0005](./docs/adr/ADR-0005-db-backed-estimation.md)

**Progress**: Frontend-only (`AdaptiveProgressManager`) — smooth ease-out up to 85%, hold, then
350ms ease to 100% on the backend signal. No backend progress events. →
[ADR-0002](./docs/adr/ADR-0002-frontend-only-progress.md)

**Output naming**: `{name}_{level}.{ext}` (balanced, light, aggressive) — same params = overwrite,
different params = new file — → [ADR-0003](./docs/adr/ADR-0003-output-naming.md)

## Release Management

**Release = one command**: `pnpm bump <patch|minor|major|X.Y.Z>` from `main`, with a clean working
tree. It propagates the version to the 4 files (SSOT `package.json`) + README, commits, tags, pushes.
The tag triggers the release CI (gate → build 4 platforms → Homebrew cask). **NEVER edit a version
by hand.**

Decision + rationale → [ADR-0006](./docs/adr/ADR-0006-versioning-release.md).
Full procedure (secret setup, cask fallback, pre-releases) → [release-runbook.md](./docs/release/release-runbook.md).

**Toolchain**: `rust-toolchain.toml` at the root with channel + components (rustfmt, clippy)
**Dev perf**: `profile.dev.package."*"` opt-level 3 for the compression libraries (otherwise 10-50x
slower)

## Commit Policy

### Commit Policy (CRITICAL)

**Attribution**: the human author only. **No agent ever co-signs**, whichever it is — no
`Co-Authored-By` from an assistant, no `Generated with`, no mention of AI, tool or model in the
message. Clean Git history.

**Format**: `feat/fix/docs/refactor/test/ci/chore: Brief description`
