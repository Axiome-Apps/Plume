# Architecture Technique - Plume

Documentation technique de l'état actuel de l'architecture et des systèmes implémentés.

## 🏗️ Architecture Actuelle

### Frontend (TypeScript/React)

```
src/
├── components/
│   ├── atoms/           # Composants de base (Icon, Button)
│   ├── molecules/       # Composants composés (ImageCard, FileUpload)
│   ├── organisms/       # Composants complexes (DropZone, UnifiedImageList)
│   └── templates/       # Layout (AppLayout)
├── domain/
│   ├── compression/     # Compression domain (DDD)
│   ├── file-io/         # File handling domain
│   ├── image/           # Image processing domain
│   ├── progress/        # Progress tracking domain
│   ├── size-prediction/ # Size estimation domain
│   ├── ui/              # UI state domain
│   └── workflow/        # Workflow orchestration domain
├── hooks/               # Custom React hooks
├── lib/                 # Shared utilities
└── types/               # Legacy types (en cours de migration)
```

### Backend (Rust/Tauri)

```
src-tauri/src/
├── commands/
│   ├── compression.rs   # Commandes de compression
│   ├── file.rs          # Commandes de gestion de fichiers
│   ├── stats.rs         # Commandes de statistiques
│   └── mod.rs
├── domain/
│   ├── compression/     # Domain compression
│   │   ├── engine.rs    # Moteur de compression
│   │   ├── settings.rs  # Configuration compression
│   │   ├── store.rs     # Persistance statistiques
│   │   └── error.rs     # Erreurs spécifiques
│   ├── file/            # Domain fichiers
│   │   ├── metadata.rs  # Métadonnées fichiers
│   │   ├── validation.rs # Validation fichiers
│   │   └── error.rs
│   ├── image/           # Domain images
│   │   ├── metadata.rs  # Métadonnées images
│   │   ├── analysis.rs  # Analyse images
│   │   ├── processing.rs # Traitement images
│   │   └── error.rs
│   └── shared/          # Types partagés
└── main.rs
```

## 🎯 Systèmes Implémentés

### Système d'estimation intelligente

**Principe :**

1. **Pré-remplissage** avec données de référence connues
2. **Apprentissage** des résultats de compression réels
3. **Estimation** basée sur historique avec confiance
4. **Fallback** statique en cas d'erreur

**Flux :**

```
Image → Service.getEstimation() → DB query → Estimation avec confiance
Compression → Service.recordCompressionResult() → Apprentissage
```

**Données trackées :**

- Format entrée/sortie
- Taille originale (par ranges: small/medium/large)
- Qualité, mode lossy/lossless
- Type d'image (photo/logo/graphic)
- Résultats réels de compression

### Base de données SQLite

- **Stockage** : Statistiques de compression
- **Apprentissage** : Enregistrement des résultats réels
- **Fallback** : Données statiques si DB indisponible

### Commandes Tauri Disponibles

- `compress_image` - Compression d'image unique
- `get_compression_estimation` - Estimation intelligente
- `record_compression_stat` - Enregistrement pour apprentissage
- `reset_compression_stats` - Reset des statistiques
- `validate_image_file` - Validation de fichier image
- `get_file_metadata` - Métadonnées de fichier

## 🔄 État des Migrations

### ✅ Complété

- Architecture domain TypeScript
- Service estimation intelligent
- Base SQLite avec pré-remplissage
- Commandes Tauri
- Architecture domain Rust (compression, file, image)

### 🔄 En Cours

- Migration complète de App.tsx vers domain architecture
- Tests unitaires pour les domains
- Documentation API complète

### 📋 À Faire

- Suppression de l'ancienne couche `utils/tauri.ts`
- Migration complète des composants
- Tests d'intégration

## 🏛️ Patterns Architecturaux

### TypeScript (DDD orienté objets)

- **Entités** avec logique encapsulée
- **Services** pour les use cases
- **Value Objects** pour les données immuables
- **Repositories** pour la persistance

### Rust (Architecture fonctionnelle)

- **Fonctions pures** + structures de données
- **Modules par domaine** (compression, file, image)
- **Traits** pour l'extensibilité
- **Error types** spécifiques par domaine

## 🐛 Debug & Logging

- **Logs structurés** avec emojis pour faciliter le debug
- **Fallbacks robustes** partout
- **Event tracking** pour drag & drop
- **Progress tracking** individuel par fichier

## 🔧 Configuration Tauri

### Capabilities & Permissions

- **Lecture/écriture** fichiers avec scope global
- **Path operations** pour manipulation de chemins
- **Dialog** pour sélection de fichiers
- **Asset protocol** pour preview des images

### Security

- **Sandbox** avec permissions explicites
- **CSP** désactivé pour développement
- **Drag & drop** activé sur la fenêtre principale

---

_Dernière mise à jour : $(date)_
_Ce fichier documente l'état technique actuel - voir TODO.md pour les évolutions planifiées_
