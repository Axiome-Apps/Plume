# ADR-0006 — Versioning & release: 4-file SSOT, two-tier CI, automated cask

Status: accepted · 2026-07-22

## Context

Plume is a **Tauri desktop app** (not an npm package, not a service). Its version lives in **four
files** that must stay aligned:

- `package.json` — frontend version + script names;
- `src-tauri/tauri.conf.json` — Tauri uses it to name the binaries (`Plume_X.Y.Z_*`) and the release
  title (`Plume vX.Y.Z`);
- `src-tauri/Cargo.toml` — crate version;
- `src-tauri/Cargo.lock` — the `plume` crate entry (frequently forgotten).

Bumping was **manual**, file by file, documented as "CRITICAL" in CLAUDE.md. Forgetting one
(typically `Cargo.lock`) produces mis-versioned binaries or an inconsistent CI: this is a **class of
bug**, not a one-off incident.

On the distribution side: a release means a GitHub Release + builds for 4 platforms (macOS
arm64/x64, Ubuntu, Windows) via `tauri-action`, **plus** a Homebrew cask
(`Axiome-Apps/homebrew-tap`) whose SHA256 hashes were recomputed and pushed by hand after every
release. The existing CI ran lint + type-check + clippy + `cargo test` on **every** push, with no
distinction between push and release.

## Options considered

- **Changesets** (as used by echoppe, see its ADR-0023) — **rejected**: Changesets exists to
  aggregate multi-contributor changelogs and publish npm packages. Plume is a solo project and is
  not published to npm: the "Version PR" ceremony and changelog aggregation would be pure overhead.
- **Status quo (manual bump)** — **rejected**: this is precisely the class of bug to eliminate.
- **Custom bump script + two-tier CI** — **selected**: keeps the echoppe _logic_ (version SSOT,
  one-move command, guardrails, advanced gate before builds, builds ⇔ release) **without** the tool.

## Decision

**SSOT = `package.json`.** A script propagates the version to the 3 other files + README links;
nobody edits a version by hand.

- **`pnpm bump <patch|minor|major|X.Y.Z> [--dry]`** (`scripts/bump.mjs`): guardrails (`main` branch,
  clean working tree), propagates to the 4 files + README, commits `chore: release vX.Y.Z`, creates
  the `vX.Y.Z` tag, pushes `main` + tag.
- **`pnpm check-version [--expect vX.Y.Z]`** (`scripts/check-version.mjs`): fails if the 4 files
  diverge, and — with `--expect` — if they do not match the tag. Anti-drift guard.
- **Two-tier CI**:
  - **Basic** (push/PR), split by technology so no useless job ever runs: `ci.yml` (JS/TS:
    `check-version` + lint + type-check, always) and `rust.yml` (fmt + clippy, path-filtered on
    `src-tauri/` → a docs or frontend commit does not pay for native compilation). No tests, no
    build → feedback in seconds.
  - **Advanced** (`release.yml`, tag `v*`) in 3 chained jobs: `gate` (`check-version --expect` +
    frontend tests + `cargo test` + strict clippy) → `build` (4 platforms → GitHub Release) →
    `homebrew` (SHA256 of the DMGs → `scripts/update-cask.mjs` → push to the tap).
- **Builds ⇔ bump**: the `vX.Y.Z` tag is produced **only** by `pnpm bump`. No binary is built outside
  that path.
- **Automated cask**: requires the `HOMEBREW_TAP_TOKEN` secret (fine-grained PAT, Contents R/W on the
  tap). Skipped for pre-releases (`alpha`/`beta`/`rc`/`test`).

## Consequences

- **The class of bug disappears**: no more manual multi-file editing; the CI guard catches any
  residual drift.
- **No changelog aggregation**: accepted — for a solo 0.x project, GitHub Release notes are enough. A
  `major` stays reserved for the 1.0 transition; a breaking change in 0.x is a `minor`.
- **Dependency on a secret**: `HOMEBREW_TAP_TOKEN` (~90-day rotation). **Degrades cleanly** — without
  it, only the `homebrew` job fails; bump, builds and GitHub Release still succeed.
- **Test split**: a broken test is only caught at **bump** time, not on push (a push only compiles
  through clippy). A deliberate trade-off to keep pushes fast.
- **Debt**: `.claude/` is gitignored while `agents/` is tracked → an explicit `git add` emits a
  harmless hint. Can be lifted with a `!.claude/agents` negation if needed.

## Details

→ [release/release-runbook.md](../release/release-runbook.md) — full operating procedure (cutting a
release, secret setup, manual cask fallback, pre-releases).
