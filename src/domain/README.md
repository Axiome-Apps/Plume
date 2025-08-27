# Domain Layer - Clean Architecture

Cette couche contient la logique métier pure, indépendante de l'infrastructure et des détails d'implémentation.

## 📁 Structure

```
domain/
├── entities/           # Entités métier avec logique encapsulée
├── schemas/           # Schemas Zod + inférence de types
├── services/          # Services métier (use cases)
└── README.md
```

## 🏗️ Entités

### `Image`
Entité centrale représentant une image avec ses états et transitions.

```typescript
// Créer une image pending
const image = Image.createPending(baseData, estimatedCompression);

// Transitions d'état
const processing = image.toProcessing(0);
const completed = processing.toCompleted(compressedSize, outputPath);

// Méthodes utilitaires
image.isPending(); // Type guards
image.getFormattedOriginalSize(); // "2.5 MB"
image.getEstimatedCompressedSize(settings); // Calcul intelligent
```

### `CompressionSettings`
Entité pour les paramètres de compression avec validation et logique.

```typescript
// Création
const settings = CompressionSettings.createDefault();
const custom = CompressionSettings.fromPartial({ quality: 90 });

// Transformations (immutables)
const withWebP = settings.withKeepOriginalFormat(false);
const withQuality = settings.withQuality(85);

// Logique métier
settings.shouldConvertToWebP(); // boolean
settings.getQualityForFormat("png"); // Qualité adaptée au format
settings.getOutputFormatForImage("test.jpg"); // Format de sortie optimal
```

## 📋 Schemas Zod

### `imageSchemas.ts`
Types et validation pour les images avec inférence automatique.

```typescript
import { ImageDataSchema, type ImageData } from './schemas/imageSchemas';

// Validation runtime
const validatedImage = ImageDataSchema.parse(unknownData);

// Types inférés automatiquement
type ImageData = z.infer<typeof ImageDataSchema>; // ✅ Auto-généré
```

### `compressionSchemas.ts`
Types et validation pour la compression.

```typescript
// Validation des requêtes Tauri
const request = CompressImageRequestSchema.parse({
  file_path: "/path/to/image.png",
  quality: 85,
  format: "webp"
});
```

## 🔧 Services

### `ImageCompressionService`
Service de bas niveau pour la compression d'images.

```typescript
const service = new ImageCompressionService(tauriCommands);

// Traitement des fichiers
await service.processFilePaths(filePaths, settings);
await service.compressImage(image, settings);
await service.downloadAllImages(images);

// Statistiques
const stats = service.calculateStats(images);
```

### `ImageManagementService`
Orchestrateur de haut niveau pour la gestion globale.

```typescript
const management = new ImageManagementService(compressionService);

// Gestion complète
await management.handleFileSelection(files, settings);
await management.startCompression(images, settings, callbacks);
await management.downloadAllImages(images);
```

## ✨ Avantages

### 🛡️ **Type Safety**
- Validation runtime avec Zod
- Types inférés automatiquement
- Pas de duplication type/schema

### 🏗️ **Séparation des responsabilités**
- Entités = État + Comportement
- Services = Use cases + Orchestration
- Schemas = Contrats + Validation

### 🧪 **Testabilité**
- Logique métier isolée
- Injection de dépendances
- Mocking facilité

### 🚀 **Extensibilité**
- Ajout de nouveaux formats simple
- Nouveaux use cases sans impact
- Architecture évolutive

### 📖 **Maintenabilité**
- Code auto-documenté
- Logique centralisée
- Refactoring sécurisé

## 🔄 Migration

L'ancienne architecture coexiste avec la nouvelle :

```typescript
// ✅ Nouveau (recommandé)
import { useImageManagement } from './presentation/hooks/useImageManagement';

// ⚠️ Ancien (legacy)
import { ImageData } from './types/image'; // Re-dirigé vers domain/schemas
```

## 📚 Exemples

Voir `src/presentation/components/ExampleNewArchitecture.tsx` pour un exemple complet d'utilisation.

## 🎯 Prochaines étapes

1. Migrer `App.tsx` vers `useImageManagement`
2. Migrer les composants vers les nouvelles entités
3. Ajouter des tests unitaires pour le domain
4. Supprimer l'ancienne couche `utils/tauri.ts`
5. Documentation API complète