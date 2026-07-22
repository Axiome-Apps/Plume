# ADR-0001 — Pipeline de compression : estimation → engine → stat → résultat

Statut : accepté · 2026-07-22 (documenté a posteriori — décision déjà en vigueur dans le code)

## Contexte

Plume compresse des images **localement** (aucun upload). Il faut un flux clair, de la prédiction
affichée à l'utilisateur jusqu'à l'apprentissage qui affine les prédictions suivantes, sans que le
frontend et le backend ne se marchent dessus sur qui calcule et qui enregistre.

## Options envisagées

_(reconstruites depuis le code — à confirmer/compléter)_

- **Estimations statiques** (heuristiques figées par couple de formats) — insuffisant : ne reflète
  pas les images réelles de l'utilisateur. Conservé uniquement comme **fallback** (cf.
  [ADR-0005](./ADR-0005-db-backed-estimation.md)).
- **Stats calculées côté frontend** — rejeté : dupliquerait la vérité et exposerait la logique
  métier au front (cf. [ADR-0004](./ADR-0004-tauri-ipc-boundary.md) — le back agit et enregistre).
- **Pipeline estimation(DB) → engine → stat(DB) → résultat** — **retenu**.

## Décision

Flux en quatre temps :

1. **Estimation (DB)** — le frontend interroge une estimation adossée SQLite (taille + durée) pour
   afficher une prédiction **et** alimenter la durée de la barre de progression. Requête, pas partie
   de `compress_image`. Détail : [ADR-0005](./ADR-0005-db-backed-estimation.md).
2. **Compression (Rust engine)** — `compress_image` valide le fichier, choisit le format de sortie
   (explicite / `auto` / optimal selon l'entrée), puis compresse via l'engine natif (MozJPEG,
   oxipng, libwebp, libheif).
3. **Stat enregistrée (DB)** — le backend écrit une stat **réelle** en SQLite : formats, tailles,
   `processing_time_ms`, `pixel_count`, settings. **Backend-only** — le front ne la duplique pas.
   C'est cette accumulation qui améliore les estimations futures.
4. **Résultat au frontend** — tailles, `savings_percent`, `output_path`.

**Garde « already optimized »** : si le fichier compressé est **≥** l'original, on le supprime et on
garde l'original (`savings = 0`). Plume ne produit jamais un fichier plus gros.

## Conséquences

- **Apprentissage adaptatif** : les prédictions s'affinent avec l'usage réel (via les stats).
- **Séparation nette** : le front affiche, le back agit et enregistre — une seule source de vérité.
- **Jamais de régression de taille** : la garde « already optimized » protège l'utilisateur.
- L'échec d'écriture de stat est **non bloquant** (log `warn`) — la compression prime sur la mesure.

## Détail

Estimation → [ADR-0005](./ADR-0005-db-backed-estimation.md) · Progression →
[ADR-0002](./ADR-0002-frontend-only-progress.md) · Nommage de sortie →
[ADR-0003](./ADR-0003-output-naming.md).
