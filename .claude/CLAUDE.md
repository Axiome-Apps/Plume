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

**Progress** : Frontend-only (`AdaptiveProgressManager`) — smooth ease-out jusqu'à 85%, hold, puis 350ms ease to 100% sur signal backend. Pas d'événements de progression backend.

**Output naming** : `{name}_{level}.{ext}` (balanced, light, aggressive) — même params = écrase, params différents = nouveau fichier

## Release Management

**Release = une commande** : `pnpm bump <patch|minor|major|X.Y.Z>` depuis `main`, working tree propre.
Propage la version aux 4 fichiers (SSOT `package.json`) + README, commit, tag, push. Le tag déclenche
la CI de release (gate → build 4 plateformes → cask Homebrew). **Ne JAMAIS éditer une version à la main.**

Décision + rationale → [ADR-0006](../docs-internal/adr/ADR-0006-versioning-release.md).
Procédure complète (setup secret, fallback cask, pré-releases) → [release-runbook.md](../docs-internal/release/release-runbook.md).

**Toolchain** : `rust-toolchain.toml` à la racine avec channel + components (rustfmt, clippy)
**Dev perf** : `profile.dev.package."*"` opt-level 3 pour les libs de compression (sinon 10-50x plus lent)

## Commit Policy

### Commit Policy (CRITICAL)

**Attribution** : Vincent Cottalorda uniquement • Jamais Claude co-author • Jamais signatures AI • Histoire Git propre

**Format** : `feat/fix/docs/refactor/test/ci/chore: Brief description`
