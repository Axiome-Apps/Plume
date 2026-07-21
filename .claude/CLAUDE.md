# Plume - Development Conventions & Best Practices

Immutable conventions and best practices guide for Plume development.

## Language Strategy

**Code/Dev** : English uniquement (variables, fonctions, commentaires, docs techniques)
**User docs** : French (utilisateurs français) • **Public docs** : English (open source)
**UI** : Français par défaut • Messages d'erreur en français • Traduction future prévue

## Code Conventions

### Code Quality Rules

**Général** : Jamais `any` • Jamais `as` pour renommer • Imports `@` depuis src/

**Rust** : Jamais `as` imports • Noms explicites • `crate::` imports • Pas de `super::` • Séparation logique/infra/commands

**Logging** : `log::debug!`/`log::info!`/`log::warn!` côté Rust (jamais `println!`) • Aucun `console.log` en prod côté frontend (uniquement `console.error` dans les catch)

### Validation & Types

**TypeScript** : Zod schemas `domain/{feature}/schema.ts` • Inference `z.infer<typeof Schema>` • Suffix `Type` • Jamais dupliquer

**Rust** : Pure functions + data • Noms simples • Modules par responsabilité • snake_case/PascalCase • Composition > héritage

### Domain Architecture

**TypeScript DDD** : `/domain/{feature}/` → schema.ts • entity.ts • service.ts • index.ts • toJSON() sur entités

**Rust modules** : `/domain/{feature}/` → mod.rs • settings.rs • engine.rs • stats.rs • error.rs • Struct + free fn

### React State & Logic

**Hooks** : useCallback dans deps • Custom hooks pour logique complexe
**Design** : Atomic (atoms → molecules → organisms → templates) • Séparation UI/logique/données
**Props** : Pas d'inline objects/arrays • Keys uniques et stables

### Tauri IPC Boundary

**Single entry point** : Tous les appels `invoke()` passent par `src/lib/tauri.ts` — jamais d'import direct de `@tauri-apps/api/core` ailleurs
**Naming** : Tauri 2 auto-convertit camelCase ↔ snake_case — ne PAS convertir manuellement les noms de paramètres
**Responsabilité** : Le front affiche, le back agit et enregistre (stats, compression, écriture fichier)

## Architectural Patterns

**TypeScript DDD** : Structure par feature • Entités + toJSON() • Services pour use cases • Zod + inference

**Rust Fonctionnel** : Pure functions + data • Modules par responsabilité • Traits pour extensibilité

**Compression pipeline** : Image → estimation (DB) → compression (Rust engine) → stat enregistrée (DB avec pixel_count + timing) → résultat au frontend

**Progress** : Frontend-only (`AdaptiveProgressManager`) — smooth ease-out à 95%, hold, 350ms ease to 100% sur signal backend. Pas d'événements de progression backend.

**Output naming** : `{name}_{level}.{ext}` (balanced, light, aggressive) — même params = écrase, params différents = nouveau fichier

## Release Management

### Version Bump — `pnpm bump` (JAMAIS à la main)

**Une seule commande** propage la version aux **4 fichiers** (SSOT = `package.json`) + liens README, commit, tag et push :

```bash
pnpm bump patch          # 0.6.0 → 0.6.1
pnpm bump minor          # 0.6.0 → 0.7.0
pnpm bump major          # → 1.0.0
pnpm bump 0.7.0-beta.1   # version explicite
pnpm bump minor --dry    # prévisualise, n'écrit rien
```

**4 fichiers synchronisés** (ne JAMAIS éditer à la main — c'est la classe de bug supprimée) :
`package.json` • `src-tauri/tauri.conf.json` • `src-tauri/Cargo.toml` • `src-tauri/Cargo.lock` (entrée du crate `plume`).

**Garde-fous** (`scripts/bump.mjs`) : refuse hors `main` ou working tree sale. Le push du tag `vX.Y.Z` — **et lui seul** — déclenche la release. `scripts/check-version.mjs` vérifie l'accord des 4 fichiers (garde CI sur push + gate release avec `--expect <tag>`).

### CI/CD — deux tiers

**Tier basique** (`ci.yml`, push/PR) : version-guard + lint + type-check + `cargo fmt --check` + clippy. **Pas de tests ni de build** → feedback en secondes.

**Tier avancé** (`release.yml`, tag `v*`) — 3 jobs enchaînés :
1. `gate` : `check-version --expect <tag>` + lint + type-check + `pnpm test` + clippy strict + `cargo test`. Échec ⇒ rien ne se construit.
2. `build` : matrice 4 plateformes (macOS arm64/x64, Ubuntu, Windows) → GitHub Release.
3. `homebrew` : download DMG → SHA256 → `scripts/update-cask.mjs` → push le tap. Nécessite le secret **`HOMEBREW_TAP_TOKEN`** (PAT write sur `Axiome-Apps/homebrew-tap`). Ignoré pour les pré-releases.

Builds ⇔ bump : aucun binaire n'est construit hors du chemin `pnpm bump`.

**Toolchain** : `rust-toolchain.toml` à la racine avec channel + components (rustfmt, clippy)
**Dev perf** : `profile.dev.package."*"` opt-level 3 pour les libs de compression (sinon 10-50x plus lent)

### Homebrew Cask

**Repo tap** : `Axiome-Apps/homebrew-tap` (cask `Casks/plume.rb`) — mis à jour **automatiquement** par le job `homebrew` de `release.yml`. Le clone local `../../homebrew/` reste une commodité de lecture.

## Commit Policy

### Commit Policy (CRITICAL)

**Attribution** : Vincent Cottalorda uniquement • Jamais Claude co-author • Jamais signatures AI • Histoire Git propre

**Format** : `feat/fix/docs/refactor/test/ci/chore: Brief description`
