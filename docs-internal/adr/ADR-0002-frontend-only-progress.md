# ADR-0002 — Progression frontend-only (`AdaptiveProgressManager`)

Statut : accepté · 2026-07-22 (documenté a posteriori — décision déjà en vigueur dans le code)

## Contexte

Il faut une barre de progression **fluide** pendant la compression. Or les encodeurs natifs
(MozJPEG, oxipng, libwebp, libheif) ne fournissent **pas** de callback de progression : la
compression d'une image est une opération courte et atomique, sans étapes observables de l'extérieur.

## Options envisagées

_(reconstruites depuis le code — à confirmer/compléter)_

- **Événements de progression backend** (streaming Rust → front) — rejeté : les encodeurs n'exposent
  aucun avancement, il faudrait le simuler côté backend ; plomberie d'événements pour rien.
- **Barre indéterminée (spinner)** — écarté : UX moins bonne, ne donne aucun repère de durée.
- **Progression synthétique côté front, calée sur la durée estimée** — **retenu**.

## Décision

`AdaptiveProgressManager` (frontend) pilote une progression synthétique en trois phases :

1. **0 → 85 %** — ease-out sur la **durée estimée** (issue de la DB, cf.
   [ADR-0005](./ADR-0005-db-backed-estimation.md)). Départ rapide, décélération à l'approche du cap.
   Ne recule jamais.
2. **Hold à 85 %** — attend le **signal de complétion réel** du backend (`onCompressionCompleted`).
3. **85 → 100 %** — ease-out final en **350 ms** une fois la complétion confirmée.

Le backend n'émet **qu'un signal binaire « done »**, pas de progression. Tick de rafraîchissement :
50 ms.

## Conséquences

- **UX fluide sans streaming backend** — toute la logique vit côté front.
- **Justesse dépendante de l'estimation** ([ADR-0005](./ADR-0005-db-backed-estimation.md)) : si la
  durée est sous-estimée, la barre **hold à 85 %** jusqu'au signal (jamais de blocage à 100 % faux).
- Le cap est **85 %** (et non 95 % comme l'indiquait le CLAUDE.md par erreur — corrigé).

## Détail

Source : `src/domain/progress/adaptiveProgress.ts`. S'insère dans le pipeline
[ADR-0001](./ADR-0001-compression-pipeline.md).
