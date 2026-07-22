# ADR-0006 — Versioning & release : SSOT 4 fichiers, CI deux tiers, cask auto

Statut : accepté · 2026-07-22

## Contexte

Plume est une **app desktop Tauri** (pas un package npm, pas un service). Sa version vit dans
**quatre fichiers** qui doivent rester alignés :

- `package.json` — version front + nom des scripts ;
- `src-tauri/tauri.conf.json` — Tauri l'utilise pour nommer les binaires (`Plume_X.Y.Z_*`) et le
  titre de release (`Plume vX.Y.Z`) ;
- `src-tauri/Cargo.toml` — version du crate ;
- `src-tauri/Cargo.lock` — entrée du crate `plume` (souvent oubliée).

Le bump était **manuel**, fichier par fichier, documenté comme « CRITICAL » dans le CLAUDE.md. En
oublier un (typiquement `Cargo.lock`) produit des binaires mal versionnés ou une CI incohérente :
c'est une **classe de bug** récurrente, pas un incident ponctuel.

Côté distribution : release = GitHub Release + builds 4 plateformes (macOS arm64/x64, Ubuntu,
Windows) via `tauri-action`, **plus** un cask Homebrew (`Axiome-Apps/homebrew-tap`) dont les SHA256
étaient recalculés et poussés à la main après chaque release. La CI existante lançait lint +
type-check + clippy + `cargo test` sur **chaque** push, sans distinction push vs release.

## Options envisagées

- **Changesets** (comme echoppe, cf. son ADR-0023) — **rejeté** : Changesets sert à agréger des
  changelogs multi-contributeurs et à publier des packages npm. Plume est solo, non publié sur npm :
  la cérémonie « Version PR » et l'agrégation de changelog seraient de l'overhead pur.
- **Statu quo (bump manuel)** — **rejeté** : c'est précisément la classe de bug à supprimer.
- **Script de bump custom + CI deux tiers** — **retenu** : garde la _logique_ echoppe (SSOT de
  version, commande one-move, garde-fous, gate avancée avant builds, builds ⇔ release) **sans**
  l'outil.

## Décision

**SSOT = `package.json`.** Un script propage la version aux 3 autres fichiers + liens README ;
personne n'édite une version à la main.

- **`pnpm bump <patch|minor|major|X.Y.Z> [--dry]`** (`scripts/bump.mjs`) : garde-fous (branche
  `main`, working tree propre), propage aux 4 fichiers + README, commit `chore: release vX.Y.Z`,
  pose le tag `vX.Y.Z`, push `main` + tag.
- **`pnpm check-version [--expect vX.Y.Z]`** (`scripts/check-version.mjs`) : échoue si les 4 fichiers
  divergent, et — avec `--expect` — s'ils ne valent pas le tag. Garde anti-dérive.
- **CI deux tiers** :
  - **Basique** (push/PR), scindé par techno pour ne jamais lancer de job inutile :
    `ci.yml` (JS/TS : `check-version` + lint + type-check, toujours) et `rust.yml` (fmt + clippy,
    filtré sur les chemins `src-tauri/` → un commit docs/front ne paie pas la compilation native).
    Pas de tests ni de build → feedback en secondes.
  - **Avancé** (`release.yml`, tag `v*`) en 3 jobs enchaînés : `gate` (`check-version --expect` +
    tests front + `cargo test` + clippy strict) → `build` (4 plateformes → GitHub Release) →
    `homebrew` (SHA256 des DMG → `scripts/update-cask.mjs` → push le tap).
- **Builds ⇔ bump** : le tag `vX.Y.Z` n'est produit **que** par `pnpm bump`. Aucun binaire n'est
  construit hors de ce chemin.
- **Cask automatisé** : nécessite le secret `HOMEBREW_TAP_TOKEN` (PAT fine-grained, Contents R/W sur
  le tap). Ignoré pour les pré-releases (`alpha`/`beta`/`rc`/`test`).

## Conséquences

- **La classe de bug disparaît** : plus d'édition multi-fichiers à la main ; la garde CI attrape
  toute dérive résiduelle.
- **Pas d'agrégation de changelog** : accepté — en 0.x solo, les notes de GitHub Release suffisent.
  Un `major` reste réservé au passage 1.0 ; un changement cassant en 0.x = `minor`.
- **Dépendance à un secret** : `HOMEBREW_TAP_TOKEN` (rotation ~90 j). **Dégrade proprement** — sans
  lui, seul le job `homebrew` échoue ; bump + builds + GitHub Release passent.
- **Split des tests** : un test cassé n'est vu qu'au **bump**, pas au push (le push ne compile que
  via clippy). Compromis assumé pour garder le push rapide.
- **Dette** : `.claude/` est gitignoré alors que `CLAUDE.md`/`agents` sont trackés → un `git add`
  explicite émet un hint bénin. À lever au besoin par une négation `!.claude/CLAUDE.md`.

## Détail

→ [release/release-runbook.md](../release/release-runbook.md) — procédure opératoire complète
(cut d'une release, setup du secret, fallback manuel du cask, pré-releases).
