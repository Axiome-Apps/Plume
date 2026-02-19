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

### Validation & Types

**TypeScript** : Zod schemas `domain/{feature}/schema.ts` • Inference `z.infer<typeof Schema>` • Suffix `Type` • Jamais dupliquer

**Rust** : Pure functions + data • Noms simples • Modules par responsabilité • snake_case/PascalCase • Composition > héritage

### Domain Architecture

**TypeScript DDD** : `/domain/{feature}/` → schema.ts • entity.ts • service.ts • index.ts • toJSON() sur entités

**Rust modules** : `/domain/{feature}/` → mod.rs • settings.rs • engine.rs • store.rs • error.rs • Struct + free fn

### React State & Logic

**Hooks** : useCallback dans deps • Custom hooks pour logique complexe
**Design** : Atomic (atoms → molecules → organisms → templates) • Séparation UI/logique/données
**Props** : Pas d'inline objects/arrays • Keys uniques et stables

## Architectural Patterns

**TypeScript DDD** : Structure par feature • Entités + toJSON() • Services pour use cases • Zod + inference

**Rust Fonctionnel** : Pure functions + data • Modules par responsabilité • Traits pour extensibilité

## Release Management

### Version Bump (CRITICAL)

**3 fichiers à synchroniser** lors d'un bump de version :
- `package.json` → `"version": "X.Y.Z"`
- `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`
- `src-tauri/Cargo.toml` → `version = "X.Y.Z"`

Tauri utilise ces versions pour nommer les binaires (`Plume_X.Y.Z_*`) et le titre de release (`Plume vX.Y.Z`). Si non bumped, les assets portent l'ancienne version.

### GitHub Releases

**Workflow** : Draft → CI builds → Verify → Publish • Tags après validation • Test dépendances Linux

```bash
gh release create v0.5.0 --draft --title "..." --notes "..."
gh release edit v0.5.0 --draft=false  # Publish when ready
```

## Commit Policy

### Commit Policy (CRITICAL)

**Attribution** : Vincent Cottalorda uniquement • Jamais Claude co-author • Jamais signatures AI • Histoire Git propre

**Format** : `feat/fix/docs: Brief description`
