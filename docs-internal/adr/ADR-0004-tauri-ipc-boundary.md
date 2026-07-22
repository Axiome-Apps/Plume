# ADR-0004 — Frontière IPC Tauri : point d'entrée unique `src/lib/tauri.ts`

Statut : accepté · 2026-07-22 (documenté a posteriori — décision déjà en vigueur dans le code)

## Contexte

Le frontend dialogue avec le backend Rust via `invoke()`. Sans discipline, les appels
`@tauri-apps/api` se dispersent dans les composants et hooks — typage ad hoc, gestion d'erreur
incohérente, surface de changement large à chaque évolution d'API.

## Options envisagées

_(reconstruites depuis le code — à confirmer/compléter)_

- **`invoke()` appelé directement là où on en a besoin** — rejeté : dispersion, pas de typage
  centralisé, difficile à tester/logger.
- **Point d'entrée unique typé** — **retenu** (cohérent avec la convention globale « single entry
  point » de l'IPC).

## Décision

**Tous** les appels `invoke()` (et les plugins comme `revealItemInDir`) passent par
**`src/lib/tauri.ts`**. Jamais d'import direct de `@tauri-apps/api/core` ailleurs.

- Les types de requête/réponse sont **centralisés** dans ce module.
- Tauri 2 **auto-convertit** camelCase ↔ snake_case → on ne convertit **pas** manuellement les noms
  de paramètres.
- Répartition des responsabilités : **le front affiche, le back agit et enregistre** (stats,
  compression, écriture fichier — cf. [ADR-0001](./ADR-0001-compression-pipeline.md)).

## Conséquences

- **Une seule frontière** à typer, tester et logger ; un changement d'API se concentre en un point.
- Le reste du frontend ignore Tauri et manipule des fonctions typées ordinaires.
- Discipline à tenir : une revue doit refuser tout `invoke` hors de `tauri.ts`.

## Détail

Source : `src/lib/tauri.ts`.
