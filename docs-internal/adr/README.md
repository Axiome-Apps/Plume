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

| N°                                       | Titre                                                            | Statut    | Détail                                              |
| ---------------------------------------- | ---------------------------------------------------------------- | --------- | --------------------------------------------------- |
| 0001                                     | Pipeline de compression (image → estimation → engine → stat)     | à rédiger | —                                                   |
| 0002                                     | Progression frontend-only (`AdaptiveProgressManager`)            | à rédiger | —                                                   |
| 0003                                     | Nommage de sortie (`{name}_{level}.{ext}`, écrase vs nouveau)    | à rédiger | —                                                   |
| 0004                                     | Frontière IPC Tauri (point d'entrée unique `src/lib/tauri.ts`)   | à rédiger | —                                                   |
| 0005                                     | Estimation adossée SQLite (`pixel_count` + timing)               | à rédiger | —                                                   |
| [0006](./ADR-0006-versioning-release.md) | Versioning & release : SSOT 4 fichiers, CI deux tiers, cask auto | accepté   | [release-runbook.md](../release/release-runbook.md) |

Les ADR 0001–0005 documentent des décisions **déjà en vigueur dans le code** mais pas encore
formalisées. Elles sont numérotées par ordre chronologique de décision et rédigées au fil de l'eau
(migration incrémentale du `.claude/CLAUDE.md` vers `docs-internal/`).
