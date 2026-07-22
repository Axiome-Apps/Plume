# Release runbook — Plume

Procédure opératoire de release. La décision et le rationale sont dans
[ADR-0006](../adr/ADR-0006-versioning-release.md).

## Cut d'une release (le geste unique)

Depuis `main`, working tree propre, tout le travail déjà committé :

```bash
pnpm bump patch          # 0.6.0 → 0.6.1
pnpm bump minor          # 0.6.0 → 0.7.0   (changement cassant en 0.x = minor)
pnpm bump major          # → 1.0.0          (réservé au passage 1.0)
pnpm bump 0.7.0-beta.1   # version explicite (pré-release)
pnpm bump minor --dry    # prévisualise, n'écrit rien
```

`pnpm bump` (`scripts/bump.mjs`) :

1. **Garde-fous** : refuse hors `main` ou si le working tree est sale.
2. Propage la version aux **4 fichiers** — `package.json`, `src-tauri/tauri.conf.json`,
   `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` — + les liens de téléchargement du `README.md`.
3. `git commit -m "chore: release vX.Y.Z"`, pose le tag `vX.Y.Z`, push `main` + tag.

Le push du tag — **et lui seul** — déclenche `release.yml`. Rien d'autre à lancer.

## Ce que fait la CI ensuite

`release.yml` (tag `v*`), 3 jobs enchaînés :

1. **`gate`** — `check-version --expect <tag>` (les 4 fichiers == le tag) + lint + type-check +
   `pnpm test` + clippy strict + `cargo test`. **Un échec bloque tout** : aucun binaire ne part.
2. **`build`** — matrice 4 plateformes (macOS arm64/x64, Ubuntu, Windows) via `tauri-action` →
   GitHub Release avec les assets (`.dmg`, `.msi`, `.exe`, `.AppImage`, `.deb`, `.rpm`).
3. **`homebrew`** — télécharge les DMG, calcule les SHA256, réécrit le cask via
   `scripts/update-cask.mjs` et push `Axiome-Apps/homebrew-tap`. **Ignoré** pour les pré-releases.

Le tier **basique** tourne en parallèle sur push/PR, scindé par techno : `ci.yml` (garde de
version + lint + type-check, toujours) et `rust.yml` (fmt + clippy, **filtré sur `src-tauri/**`** →
un commit docs/front ne déclenche pas la compilation Rust). Pas de tests ni de build (ils sont dans
`gate`).

## Setup du secret Homebrew (une fois)

Le job `homebrew` a besoin d'un PAT avec write sur le tap :

1. Créer un **fine-grained PAT** : https://github.com/settings/personal-access-tokens/new
   - Resource owner : `Axiome-Apps` · Repository access : _Only_ `homebrew-tap`
   - Permissions : Contents → **Read and write** · Expiration : 90 j (renouvelable)
   - Nom du token : `plume-homebrew-tap`
2. L'enregistrer comme secret Actions sur le repo Plume :
   ```bash
   gh secret set HOMEBREW_TAP_TOKEN --repo Axiome-Apps/Plume   # coller la valeur
   gh secret list --repo Axiome-Apps/Plume                     # vérifier
   ```

Sans ce secret : bump + builds + GitHub Release fonctionnent, seul le push du cask échoue.

## Fallback manuel du cask

Si le job `homebrew` échoue (secret expiré, etc.) :

```bash
cd /tmp
gh release download vX.Y.Z --repo Axiome-Apps/Plume --pattern "*.dmg" --clobber
shasum -a 256 Plume_X.Y.Z_aarch64.dmg Plume_X.Y.Z_x64.dmg
# depuis le repo Plume :
node scripts/update-cask.mjs <clone-tap>/Casks/plume.rb X.Y.Z <armSha> <intelSha>
cd <clone-tap>
git add Casks/plume.rb && git commit -m "chore: update plume to vX.Y.Z" && git push
```

Clone local du tap (commodité de lecture) : `../../homebrew/` (repo `Axiome-Apps/homebrew-tap`).
Utilisateurs : `brew install --cask axiome-apps/tap/plume` · `brew upgrade plume`.

## Pré-releases

Un tag contenant `alpha`/`beta`/`rc`/`test` (ex. `v0.7.0-beta.1`) → GitHub Release marquée
**prerelease**, et le job `homebrew` est **sauté** (les utilisateurs stables ne reçoivent pas la
pré-release).
