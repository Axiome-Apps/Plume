# ADR — Architecture Decision Records

Référence **unique et centrale** des décisions structurantes de Plume. Chaque décision = un ADR
numéroté. Les ADR sont la **porte d'entrée** ; quand le détail opérationnel est dense, un ADR _lie_
un fichier qui, lui, survit (runbook, référence).

Ces documents captent les **vérités du projet** (choix + rationale + conséquences) — pas les
préférences personnelles ni les idiomes globaux, qui vivent dans `~/.claude/CLAUDE.md` et la SSOT
`~/.code-conform/docs/`. Le `.claude/CLAUDE.md` du repo n'est qu'un **manuel opératoire court** qui
pointe ici.

## Format

```
# ADR-000X — <titre>
Statut : accepté | proposé | remplacé par ADR-00YY   ·   Date
## Contexte            le problème / la contrainte
## Options envisagées
## Décision
## Conséquences        impacts, dette, suivis
## Détail (optionnel)  → lien vers le fichier détaillé
```

## Index

| N°                                           | Titre                                                            | Statut  | Détail                                              |
| -------------------------------------------- | ---------------------------------------------------------------- | ------- | --------------------------------------------------- |
| [0001](./ADR-0001-compression-pipeline.md)   | Pipeline de compression (estimation → engine → stat → résultat)  | accepté | —                                                   |
| [0002](./ADR-0002-frontend-only-progress.md) | Progression frontend-only (`AdaptiveProgressManager`)            | accepté | —                                                   |
| [0003](./ADR-0003-output-naming.md)          | Nommage de sortie (`{name}_{level}.{ext}`, écrase vs nouveau)    | accepté | —                                                   |
| [0004](./ADR-0004-tauri-ipc-boundary.md)     | Frontière IPC Tauri (point d'entrée unique `src/lib/tauri.ts`)   | accepté | —                                                   |
| [0005](./ADR-0005-db-backed-estimation.md)   | Estimation adossée SQLite (`pixel_count` + timing)               | accepté | —                                                   |
| [0006](./ADR-0006-versioning-release.md)     | Versioning & release : SSOT 4 fichiers, CI deux tiers, cask auto | accepté | [release-runbook.md](../release/release-runbook.md) |

Les ADR 0001–0005 documentent des décisions **déjà en vigueur dans le code**, formalisées a
posteriori. Leurs _options envisagées_ sont **reconstruites depuis le code** (à confirmer/compléter
par l'auteur des décisions d'origine).
