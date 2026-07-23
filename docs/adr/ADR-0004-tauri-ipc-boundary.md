# ADR-0004 — Tauri IPC boundary: single entry point `src/lib/tauri.ts`

Status: accepted · 2026-07-22 (documented after the fact — decision already in force in the code)

## Context

The frontend talks to the Rust backend through `invoke()`. Without discipline, `@tauri-apps/api`
calls scatter across components and hooks — ad hoc typing, inconsistent error handling, and a wide
change surface every time the API evolves.

## Options considered

_(reconstructed from the code — to be confirmed/completed)_

- **`invoke()` called directly wherever it is needed** — rejected: scattering, no centralized typing,
  hard to test and to log.
- **A single typed entry point** — **selected** (consistent with the global "single entry point"
  convention for IPC).

## Decision

**All** `invoke()` calls (and plugins such as `revealItemInDir`) go through **`src/lib/tauri.ts`**.
Never import `@tauri-apps/api/core` directly anywhere else.

- Request/response types are **centralized** in that module.
- Tauri 2 **auto-converts** camelCase ↔ snake_case → do **not** convert parameter names manually.
- Split of responsibilities: **the frontend displays, the backend acts and records** (stats,
  compression, file writing — see [ADR-0001](./ADR-0001-compression-pipeline.md)).

## Consequences

- **A single boundary** to type, test and log; an API change is concentrated in one place.
- The rest of the frontend is unaware of Tauri and manipulates ordinary typed functions.
- Discipline to uphold: a review must reject any `invoke` outside `tauri.ts`.

## Details

Source: `src/lib/tauri.ts`.
