# ADR-0003 — Nommage de sortie : `{name}_{level}.{ext}`, écrase vs nouveau fichier

Statut : accepté · 2026-07-22 (documenté a posteriori — décision déjà en vigueur dans le code)

## Contexte

Le fichier compressé doit avoir un nom **prévisible**, qui permette de recompresser sans accumuler
des doublons, tout en gardant la possibilité de comparer plusieurs niveaux de compression.

## Options envisagées

_(reconstruites depuis le code — à confirmer/compléter)_

- **Suffixe fixe unique** (`_compressed`) — écarté : impossible de comparer light/balanced/aggressive
  côte à côte.
- **Nommage anti-collision systématique** (`photo (1).webp`, jamais d'écrasement) — **du code avait
  été échafaudé** en ce sens (`generate_output_path` / `make_unique_filename`) mais n'était **pas
  branché** ; retiré (cf. la feature potentielle en roadmap).
- **`{name}_{level}.{ext}` déterministe, écrasement au même réglage** — **retenu**.

## Décision

Sortie par défaut (même dossier que l'entrée) : **`{stem}_{level}.{ext}`** avec
`level ∈ {light, balanced, aggressive}` (défaut : `balanced`).

- **Déterministe** → recompresser au **même** niveau **écrase** le fichier (pas de prolifération).
- Changer de niveau → **nouveau** fichier → comparaison côte à côte possible.
- Branche `output_path` custom : si c'est un **dossier**, `{stem}.{ext}` dedans ; si c'est un
  **fichier**, ce chemin exact.
- Garde « already optimized » : compressé ≥ original → suppression du compressé, on garde l'original
  (cf. [ADR-0001](./ADR-0001-compression-pipeline.md)).

## Conséquences

- **Pas de doublons** au même réglage ; **comparaison** possible entre niveaux.
- **Écrasement assumé** : pas de protection anti-collision. Un fichier utilisateur homonyme
  `{stem}_{level}.{ext}` serait écrasé — d'où la piste **collision-safe naming** notée en roadmap
  (à reconsidérer avec l'output folder selection).

## Détail

Source : `src-tauri/src/commands/compression.rs` (`compress_image`). La branche custom `output_path`
préfigure l'**output folder selection** de la roadmap.
