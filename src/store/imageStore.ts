import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { ImageEntity } from '@/domain/image/entity';
import { ImageType } from '@/domain/image/schema';
import { detectImageFormat } from '@/domain/constants';
import { AdaptiveProgressManager } from '@/domain/progress/adaptiveProgress';
import { sizePredictionService } from '@/domain/size-prediction';
import {
  type OutputFormatType,
  type CompressionLevelType,
  resolveCompressionParams,
} from '@/domain/compression/schema';
import {
  compressImage as tauriCompressImage,
  getFileInformation,
  getProgressEstimation,
  recordCompressionStat,
} from '@/lib/tauri';

// Types pour les événements de progression Tauri
interface CompressionProgressEvent {
  image_id: string;
  image_name: string;
  stage: 'Loading' | 'Compressing' | 'Saving' | 'Complete' | 'Error';
  progress: number; // 0.0 to 1.0
  estimated_time_remaining?: number; // seconds
}

// Types pour la gestion d'état
type CompressionState = 'idle' | 'processing' | 'completed' | 'error';
type AppView = 'drop' | 'list' | 'success';

interface CompressionSettings {
  outputFormat: OutputFormatType;
  compressionLevel: CompressionLevelType;
}

interface ImageStore {
  // État principal
  images: ImageEntity[];
  compressionState: CompressionState;
  isProcessing: boolean;
  compressionSettings: CompressionSettings;
  progressManagers: Record<string, AdaptiveProgressManager>;

  // Actions internes
  initializeProgressListener: () => void;

  // Computed getters - Fonctions au lieu de propriétés
  currentView: () => AppView;
  stats: () => {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    totalSize: number;
    totalCompressedSize: number;
    averageSavings: number;
  };

  // Actions pour les images
  addImages: (filePaths: string[]) => Promise<void>;
  removeImage: (imageId: string) => void;
  clearImages: () => void;

  // Actions pour la compression
  startCompression: () => Promise<void>;
  compressImage: (imageId: string) => Promise<void>;
  // Actions pour les paramètres
  setCompressionSettings: (settings: Partial<CompressionSettings>) => void;
  setOutputFormat: (format: OutputFormatType) => void;
  setCompressionLevel: (level: CompressionLevelType) => void;
  recalculateEstimations: () => Promise<void>;

  // Actions pour le drag & drop
  handleExternalDrop: (filePaths: string[]) => Promise<void>;

  // Actions internes
  updateImageProgress: (imageId: string, progress: number) => void;
}

export const useImageStore = create<ImageStore>((set, get) => ({
  // État initial
  images: [],
  compressionState: 'idle',
  isProcessing: false,
  compressionSettings: {
    outputFormat: 'webp',
    compressionLevel: 'balanced',
  },
  progressManagers: {},

  // Computed getters - Utiliser des fonctions au lieu de getters
  currentView: (): AppView => {
    const state = get();
    if (state.images.length === 0) return 'drop';
    if (state.compressionState === 'completed' && state.images.every(img => img.isCompleted()))
      return 'success';
    return 'list';
  },

  stats: () => {
    const state = get();
    const pending = state.images.filter(img => img.isPending()).length;
    const processing = state.images.filter(img => img.isProcessing()).length;
    const completed = state.images.filter(img => img.isCompleted()).length;
    const totalSize = state.images.reduce((sum, img) => sum + img.originalSize, 0);
    const totalCompressedSize = state.images
      .filter(img => img.hasCompressedData())
      .reduce((sum, img) => sum + (img.compressedSize || 0), 0);

    return {
      total: state.images.length,
      pending,
      processing,
      completed,
      totalSize,
      totalCompressedSize,
      averageSavings:
        completed > 0
          ? state.images
              .filter(img => img.hasCompressedData())
              .reduce((sum, img) => sum + (img.savings || 0), 0) / completed
          : 0,
    };
  },

  // Actions pour les images
  addImages: async (filePaths: string[]) => {
    try {
      const { images } = get();
      const existingPaths = new Set(images.map(img => img.path));
      const uniqueFilePaths = filePaths.filter(path => !existingPaths.has(path));

      if (uniqueFilePaths.length === 0) {
        return;
      }

      const newImages: ImageEntity[] = [];

      for (const filePath of uniqueFilePaths) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const fileName = filePath.split('/').pop() || filePath.split('\\\\').pop() || 'unknown';

        let fileSize = 0;
        try {
          const fileInfo = await getFileInformation(filePath);
          fileSize = fileInfo.size;
        } catch {
          // Non-blocking — file info is best-effort
        }

        // Obtenir l'estimation de compression depuis le service
        let estimatedCompression;
        try {
          const format = detectImageFormat(fileName);
          const { compressionSettings: currentSettings } = get();
          const resolved = resolveCompressionParams(
            currentSettings.outputFormat,
            currentSettings.compressionLevel,
            format
          );
          const estimationOutputFormat =
            resolved.format === 'auto' ? format.toLowerCase() : resolved.format;
          const estimation = await sizePredictionService.getEstimation(
            format,
            estimationOutputFormat,
            fileSize,
            resolved.quality,
            resolved.lossy
          );
          // Extraire les propriétés compatibles avec EstimationResultType
          estimatedCompression = {
            percent: estimation.percent,
            ratio: estimation.ratio,
            confidence: estimation.confidence,
            sample_count: estimation.sample_count,
          };
        } catch {
          // Non-blocking — estimation fallback will be used
          // Fallback avec valeurs par défaut
          estimatedCompression = {
            percent: 65,
            ratio: 0.35,
            confidence: 0.5,
            sample_count: 0,
          };
        }

        const imageData: ImageType = {
          id: tempId,
          name: fileName,
          path: filePath,
          originalSize: fileSize,
          format: detectImageFormat(fileName),
          preview: `asset://localhost/${filePath}`,
          status: 'pending',
          estimatedCompression,
        };
        newImages.push(ImageEntity.fromData(imageData));
      }

      set(state => ({
        images: [...state.images, ...newImages],
      }));

      toast.success(
        `${uniqueFilePaths.length} image${uniqueFilePaths.length > 1 ? 's' : ''} ajoutée${uniqueFilePaths.length > 1 ? 's' : ''}`
      );
    } catch {
      toast.error("Erreur lors de l'ajout des fichiers");
    }
  },

  removeImage: (imageId: string) => {
    set(state => ({
      images: state.images.filter(img => img.id !== imageId),
    }));
  },

  clearImages: () => {
    const { progressManagers } = get();
    // Arrêter tous les gestionnaires de progression avant de nettoyer
    Object.values(progressManagers).forEach(manager => manager.stop());

    set({
      images: [],
      compressionState: 'idle',
      progressManagers: {},
    });
  },

  // Actions pour la compression
  startCompression: async () => {
    const { images, isProcessing, compressionSettings } = get();
    if (isProcessing) return;

    const pendingImages = images.filter(img => img.isPending());
    if (pendingImages.length === 0) return;

    set({ isProcessing: true, compressionState: 'processing' });

    try {
      for (const image of pendingImages) {
        try {
          // Marquer l'image comme en cours de traitement
          set(state => ({
            images: state.images.map(img => (img.id === image.id ? img.toProcessing(0) : img)),
          }));

          // Resolve compression params for this image
          const {
            quality,
            format: outputFormatForImage,
            lossy,
          } = resolveCompressionParams(
            compressionSettings.outputFormat,
            compressionSettings.compressionLevel,
            image.format
          );

          // Obtenir l'estimation de durée depuis la BDD (avec fallback heuristique)
          let estimatedDurationMs = 3000;
          try {
            const outputFmt =
              outputFormatForImage === 'auto' ? image.format.toLowerCase() : outputFormatForImage;
            const estimation = await getProgressEstimation(
              image.format.toLowerCase(),
              outputFmt,
              image.originalSize
            );
            estimatedDurationMs = estimation.estimated_duration_ms;
          } catch {
            // Fallback to default estimation
          }

          // Créer et démarrer le gestionnaire de progression adaptatif
          const progressManager = new AdaptiveProgressManager(image.id, estimatedDurationMs);

          // Stocker le gestionnaire pour pouvoir le contrôler plus tard
          set(state => ({
            progressManagers: {
              ...state.progressManagers,
              [image.id]: progressManager,
            },
          }));

          // Store pending completion data to apply after animation
          let pendingResult: { compressedSize: number; outputPath: string } | null = null;

          progressManager.start({
            onProgress: (imageId, progress) => {
              get().updateImageProgress(imageId, progress);
            },
            onComplete: imageId => {
              // Animation 85→100 finished — now mark the image as completed
              if (pendingResult) {
                set(state => ({
                  images: state.images.map(img =>
                    img.id === imageId
                      ? img.toCompleted(pendingResult!.compressedSize, pendingResult!.outputPath)
                      : img
                  ),
                }));
              }
              // Clean up manager
              set(state => ({
                progressManagers: Object.fromEntries(
                  Object.entries(state.progressManagers).filter(([id]) => id !== imageId)
                ),
              }));
            },
            onError: (imageId, error) => {
              console.error(`Compression progress error for ${imageId}:`, error);
              set(state => ({
                progressManagers: Object.fromEntries(
                  Object.entries(state.progressManagers).filter(([id]) => id !== imageId)
                ),
              }));
            },
          });

          const response = await tauriCompressImage(
            { file_path: image.path, quality, format: outputFormatForImage },
            image.id
          );

          // Signaler la fin au gestionnaire adaptatif → déclenche animation 85→100
          const finalManager = get().progressManagers[image.id];
          if (finalManager) {
            finalManager.onCompressionCompleted();
          }

          if (response.success && response.result) {
            pendingResult = {
              compressedSize: response.result.compressed_size,
              outputPath: response.result.output_path,
            };

            if (response.result.compressed_size >= image.originalSize) {
              toast.info(`${image.name} est déjà optimisé`);
            }

            // Enregistrer dans les deux bases de données
            const recordedFormat =
              outputFormatForImage === 'auto'
                ? image.format.toLowerCase()
                : outputFormatForImage.toLowerCase();

            // 1. Stats store (alimente les estimations)
            try {
              await recordCompressionStat({
                input_format: image.format.toLowerCase(),
                output_format: recordedFormat,
                original_size: image.originalSize,
                compressed_size: response.result.compressed_size,
                quality_setting: quality,
                lossy_mode: lossy,
              });
            } catch {
              // Silent fail — stats recording is non-critical
            }
          } else {
            // Signaler l'erreur au gestionnaire adaptatif
            const errorManager = get().progressManagers[image.id];
            if (errorManager) {
              errorManager.error(response.error || 'Compression failed');
            }

            set(state => ({
              images: state.images.map(img => (img.id === image.id ? img.toError() : img)),
            }));
            toast.error(`Erreur compression ${image.name}: ${response.error}`);
          }
        } catch (error) {
          // Signaler l'erreur au gestionnaire adaptatif
          const catchErrorManager = get().progressManagers[image.id];
          if (catchErrorManager) {
            catchErrorManager.error(String(error));
          }

          set(state => ({
            images: state.images.map(img => (img.id === image.id ? img.toError() : img)),
          }));
          toast.error(`Erreur compression ${image.name}: ${error}`);
        }
      }

      set({ compressionState: 'completed' });
    } finally {
      set({ isProcessing: false });
    }
  },

  compressImage: async (imageId: string) => {
    const { images } = get();
    const image = images.find(img => img.id === imageId);

    if (!image || !image.isPending()) return;

    // Appeler directement startCompression qui gérera les transitions de statut
    await get().startCompression();
  },

  // Actions pour les paramètres
  setCompressionSettings: (newSettings: Partial<CompressionSettings>) => {
    set(state => ({
      compressionSettings: { ...state.compressionSettings, ...newSettings },
    }));
  },

  setOutputFormat: (format: OutputFormatType) => {
    set(state => ({
      compressionSettings: {
        ...state.compressionSettings,
        outputFormat: format,
        // PNG uses oxipng lossless — level has no real effect, lock to aggressive
        ...(format === 'png' ? { compressionLevel: 'aggressive' as CompressionLevelType } : {}),
      },
    }));
    get().recalculateEstimations();
  },

  setCompressionLevel: (level: CompressionLevelType) => {
    set(state => ({
      compressionSettings: {
        ...state.compressionSettings,
        compressionLevel: level,
      },
    }));
    get().recalculateEstimations();
  },

  recalculateEstimations: async () => {
    const { images, compressionSettings } = get();
    const pendingImages = images.filter(img => img.isPending());
    if (pendingImages.length === 0) return;

    const updatedImages = await Promise.all(
      images.map(async img => {
        if (!img.isPending()) return img;

        const resolved = resolveCompressionParams(
          compressionSettings.outputFormat,
          compressionSettings.compressionLevel,
          img.format
        );
        const estimationOutputFormat =
          resolved.format === 'auto' ? img.format.toLowerCase() : resolved.format;

        try {
          const estimation = await sizePredictionService.getEstimation(
            img.format,
            estimationOutputFormat,
            img.originalSize,
            resolved.quality,
            resolved.lossy
          );
          const data = img.data;
          data.estimatedCompression = {
            percent: estimation.percent,
            ratio: estimation.ratio,
            confidence: estimation.confidence,
            sample_count: estimation.sample_count,
          };
          return ImageEntity.fromData(data);
        } catch {
          return img;
        }
      })
    );

    set({ images: updatedImages });
  },

  // Actions pour le drag & drop
  handleExternalDrop: async (filePaths: string[]) => {
    await get().addImages(filePaths);
  },

  // Actions internes pour les transitions d'état
  updateImageProgress: (imageId: string, progress: number) => {
    set(state => ({
      images: state.images.map(img => (img.id === imageId ? img.updateProgress(progress) : img)),
    }));
  },

  // Initialiser l'écoute des événements de progression Tauri
  initializeProgressListener: () => {
    // Stocker unlisten dans le state pour pouvoir le nettoyer
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        if (unlisten) {
          unlisten();
          unlisten = undefined;
        }

        unlisten = await listen<CompressionProgressEvent>('compression-progress', event => {
          const progressData = event.payload;
          const progressPercent = Math.round(progressData.progress * 100);
          get().updateImageProgress(progressData.image_id, progressPercent);

          if (progressData.stage === 'Error') {
            set(state => ({
              images: state.images.map(img =>
                img.id === progressData.image_id ? img.toError() : img
              ),
            }));
          }
        });
      } catch (error) {
        console.error('Failed to setup compression progress listener:', error);
      }
    };

    setupListener();
  },
}));
