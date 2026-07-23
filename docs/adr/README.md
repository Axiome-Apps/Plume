# ADR — Architecture Decision Records

The **single, central** reference for Plume's structural decisions. Each decision is one numbered
ADR. ADRs are the **entry point**; when the operational detail is dense, an ADR _links_ to a file
that survives on its own (runbook, reference).

These documents capture the **project's truths** (choice + rationale + consequences) — not personal
preferences or global idioms. `AGENTS.md` at the root is only a **short operating manual** that
points here.

## Format

```
# ADR-000X — <title>
Status: accepted | proposed | superseded by ADR-00YY   ·   Date
## Context             the problem / the constraint
## Options considered
## Decision
## Consequences        impact, debt, follow-ups
## Details (optional)  → link to the detailed file
```

## Index

| No.                                          | Title                                                          | Status   | Details                                             |
| -------------------------------------------- | -------------------------------------------------------------- | -------- | --------------------------------------------------- |
| [0001](./ADR-0001-compression-pipeline.md)   | Compression pipeline (estimation → engine → stat → result)     | accepted | —                                                   |
| [0002](./ADR-0002-frontend-only-progress.md) | Frontend-only progress (`AdaptiveProgressManager`)             | accepted | —                                                   |
| [0003](./ADR-0003-output-naming.md)          | Output naming (`{name}_{level}.{ext}`, overwrite vs new)       | accepted | —                                                   |
| [0004](./ADR-0004-tauri-ipc-boundary.md)     | Tauri IPC boundary (single entry point `src/lib/tauri.ts`)     | accepted | —                                                   |
| [0005](./ADR-0005-db-backed-estimation.md)   | SQLite-backed estimation (`pixel_count` + timing)              | accepted | —                                                   |
| [0006](./ADR-0006-versioning-release.md)     | Versioning & release: 4-file SSOT, two-tier CI, automated cask | accepted | [release-runbook.md](../release/release-runbook.md) |

ADRs 0001–0005 document decisions **already in force in the code**, formalized after the fact.

- **0002** and **0005**: options considered are **confirmed** — taken from the original research note
  on the progress system (`docs/technical/features/PROGRESS_SYSTEM.md`, absorbed then deleted).
- **0001**, **0003**, **0004**: options considered are **reconstructed from the code**, to be
  confirmed/completed by the author of the original decisions (see the debt item in the
  [ROADMAP](../../ROADMAP.md)).

## Neighbourhood

- [`../reference/`](../reference/) — internal reference for the current state of the code (the
  "what"), including [architecture.md](../reference/architecture.md).
- [`../release/`](../release/) — release runbook.
