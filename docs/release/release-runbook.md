# Release runbook — Plume

Operating procedure for cutting a release. The decision and its rationale live in
[ADR-0006](../adr/ADR-0006-versioning-release.md).

## Cutting a release (the single move)

From `main`, with a clean working tree and all work already committed:

```bash
pnpm bump patch          # 0.6.0 → 0.6.1
pnpm bump minor          # 0.6.0 → 0.7.0   (a breaking change in 0.x is a minor)
pnpm bump major          # → 1.0.0          (reserved for the 1.0 transition)
pnpm bump 0.7.0-beta.1   # explicit version (pre-release)
pnpm bump minor --dry    # preview, writes nothing
```

`pnpm bump` (`scripts/bump.mjs`):

1. **Guardrails**: refuses to run outside `main` or with a dirty working tree.
2. Propagates the version to the **4 files** — `package.json`, `src-tauri/tauri.conf.json`,
   `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` — plus the download links in `README.md`.
3. `git commit -m "chore: release vX.Y.Z"`, creates the `vX.Y.Z` tag, pushes `main` + tag.

Pushing the tag — **and only that** — triggers `release.yml`. Nothing else to run.

## What the CI does next

`release.yml` (tag `v*`), 3 chained jobs:

1. **`gate`** — `check-version --expect <tag>` (the 4 files must match the tag) + lint + type-check +
   `pnpm test` + strict clippy + `cargo test`. **Any failure blocks everything**: no binary ships.
2. **`build`** — 4-platform matrix (macOS arm64/x64, Ubuntu, Windows) via `tauri-action` → GitHub
   Release with the assets (`.dmg`, `.msi`, `.exe`, `.AppImage`, `.deb`, `.rpm`).
3. **`homebrew`** — downloads the DMGs, computes the SHA256 hashes, rewrites the cask via
   `scripts/update-cask.mjs` and pushes to `Axiome-Apps/homebrew-tap`. **Skipped** for pre-releases.

The **basic** tier runs in parallel on push/PR, split by technology: `ci.yml` (version guard + lint +
type-check, always) and `rust.yml` (fmt + clippy, path-filtered on `src-tauri/` → a docs or frontend
commit does not trigger Rust compilation). No tests and no build (those live in `gate`).

## Homebrew secret setup (one-off)

The `homebrew` job needs a PAT with write access to the tap:

1. Create a **fine-grained PAT**: https://github.com/settings/personal-access-tokens/new
   - Resource owner: `Axiome-Apps` · Repository access: _Only_ `homebrew-tap`
   - Permissions: Contents → **Read and write** · Expiration: 90 days (renewable)
   - Token name: `plume-homebrew-tap`
2. Store it as an Actions secret on the Plume repo:
   ```bash
   gh secret set HOMEBREW_TAP_TOKEN --repo Axiome-Apps/Plume   # paste the value
   gh secret list --repo Axiome-Apps/Plume                     # verify
   ```

Without this secret: bump, builds and the GitHub Release all work; only the cask push fails.

## Manual cask fallback

If the `homebrew` job fails (expired secret, etc.):

```bash
cd /tmp
gh release download vX.Y.Z --repo Axiome-Apps/Plume --pattern "*.dmg" --clobber
shasum -a 256 Plume_X.Y.Z_aarch64.dmg Plume_X.Y.Z_x64.dmg
# from the Plume repo:
node scripts/update-cask.mjs <clone-tap>/Casks/plume.rb X.Y.Z <armSha> <intelSha>
cd <clone-tap>
git add Casks/plume.rb && git commit -m "chore: update plume to vX.Y.Z" && git push
```

Local clone of the tap (for convenience when reading): `../../homebrew/` (repo
`Axiome-Apps/homebrew-tap`). For users: `brew install --cask axiome-apps/tap/plume` ·
`brew upgrade plume`.

## Pre-releases

A tag containing `alpha`/`beta`/`rc`/`test` (e.g. `v0.7.0-beta.1`) → a GitHub Release marked
**prerelease**, with the `homebrew` job **skipped** (stable users do not receive the pre-release).
