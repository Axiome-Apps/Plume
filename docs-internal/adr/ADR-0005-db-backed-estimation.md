# ADR-0005 — Estimation adossée SQLite (`pixel_count` + timing, apprentissage)

Statut : accepté · 2026-07-22 (documenté a posteriori — décision déjà en vigueur dans le code)

## Contexte

Avant de compresser, Plume affiche à l'utilisateur une **prédiction** (gain de taille + durée). Des
heuristiques figées seraient fausses : le gain réel dépend du contenu des images de l'utilisateur,
du couple de formats et des réglages.

## Options envisagées

_(reconstruites depuis le code — à confirmer/compléter)_

- **Heuristiques statiques par couple de formats** — insuffisant seul, mais **conservé comme
  fallback** (cold start, échec DB).
- **Modèle appris hors-ligne** — surdimensionné pour une app desktop locale.
- **Estimation adossée SQLite, affinée par l'usage réel** — **retenu**.

## Décision

Estimation adossée à **SQLite**, qui **s'améliore avec l'usage** : chaque compression enregistre une
stat (ratio, `processing_time_ms`, `pixel_count`, formats, settings — cf.
[ADR-0001](./ADR-0001-compression-pipeline.md)).

Deux requêtes exposées :

- **`get_compression_estimation`** → `{ percent, ratio, confidence, sample_count }` (gain de taille).
- **`get_progress_estimation`** → durée estimée (alimente la barre de progression,
  [ADR-0002](./ADR-0002-frontend-only-progress.md)).

Côté front (`CompressionEstimationService`) : en cas d'échec/absence de données →
**`getFallbackEstimation`** (heuristiques par couple de formats, `confidence` 0.3). `is_learning =
sample_count > 0` distingue « basé sur N compressions similaires » d'« estimation de référence ».

## Conséquences

- **Prédictions qui s'affinent** au fil de l'usage, spécifiques aux images de l'utilisateur.
- **Robustesse** : le fallback statique garantit toujours une estimation, même à froid.
- **`pixel_count`** améliore la justesse de la **durée** (une image lourde en Mo mais peu de pixels ≠
  une image très pixelisée) → meilleure barre de progression.

## Détail

Sources : `src/domain/size-prediction/service.ts` (front, fallback) ·
`src-tauri/src/domain/compression/prediction.rs` + `stats.rs` (back, DB).
