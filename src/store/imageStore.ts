import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { ImageEntity } from '@/domain/image/entity';
import { ImageType } from '@/domain/image/schema';
import { detectImageFormat } from '@/domain/constants';
import { progressService } from '@/domain/progress';

// Types pour les réponses Tauri
interface CompressImageResponse {
  success: boolean;
  result?: {
    compressed_size: number;
    output_path: string;
  };
  error?: string;
}

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
  quality: number;
  keepOriginalFormat: boolean;
}

interface ImageStore {
  // État principal
  images: ImageEntity[];
  compressionState: CompressionState;
  isProcessing: boolean;
  compressionSettings: CompressionSettings;
  progressState: Record<string, { progress: number }>;

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
  downloadImage: (imageId: string) => Promise<void>;
  downloadAllImages: () => Promise<void>;

  // Actions pour les paramètres
  setCompressionSettings: (settings: Partial<CompressionSettings>) => void;
  toggleWebPConversion: () => void;
  toggleLossyMode: () => void;
  setQuality: (quality: number) => void;

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
    quality: 80,
    keepOriginalFormat: false,
  },
  progressState: {},

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
          const fileInfo = await invoke<{ size: number }>('get_file_information', { filePath });
          fileSize = fileInfo.size;
        } catch (error) {
          console.warn(`Impossible de récupérer les informations pour ${filePath}:`, error);
        }

        const imageData: ImageType = {
          id: tempId,
          name: fileName,
          path: filePath,
          originalSize: fileSize,
          format: detectImageFormat(fileName),
          preview: `asset://localhost/${filePath}`,
          status: 'pending',
          estimatedCompression: {
            percent: 65,
            ratio: 0.35,
            confidence: 0.5,
            sample_count: 10,
          },
        };
        newImages.push(ImageEntity.fromData(imageData));
      }

      set(state => ({
        images: [...state.images, ...newImages],
      }));

      toast.success(
        `${uniqueFilePaths.length} image${uniqueFilePaths.length > 1 ? 's' : ''} ajoutée${uniqueFilePaths.length > 1 ? 's' : ''}`
      );
    } catch (error) {
      toast.error("Erreur lors de l'ajout des fichiers");
      console.error(error);
    }
  },

  removeImage: (imageId: string) => {
    set(state => ({
      images: state.images.filter(img => img.id !== imageId),
    }));
  },

  clearImages: () => {
    set({
      images: [],
      compressionState: 'idle',
      progressState: {},
    });
  },

  resetProcessingImages: () => {
    set(state => ({
      images: state.images.map(img =>
        img.status === 'processing' ? img.withStatus('pending') : img
      ),
      isProcessing: false,
      compressionState: 'idle',
    }));
  },

  // Actions pour la compression
  startCompression: async () => {
    console.log('🚀 startCompression called');
    const { images, isProcessing, compressionSettings } = get();

    if (isProcessing) {
      console.log('⏸️ Already processing, skipping');
      return;
    }

    console.log(
      '📊 Current images status:',
      images.map(img => ({
        name: img.name,
        status: img.status,
        isPending: img.isPending(),
      }))
    );

    const pendingImages = images.filter(img => img.isPending());
    if (pendingImages.length === 0) {
      console.log('⚠️ No pending images to compress');
      return;
    }

    console.log(`🎯 Starting compression with smooth progress for ${pendingImages.length} images`);

    set({ isProcessing: true, compressionState: 'processing' });

    try {
      for (const image of pendingImages) {
        try {
          // Marquer l'image comme en cours de traitement
          set(state => ({
            images: state.images.map(img => (img.id === image.id ? img.toProcessing(0) : img)),
          }));

          console.log(`🎯 Starting smooth progress for ${image.name}`);

          // Démarrer la progression fluide avec estimation intelligente
          const outputFormat = compressionSettings.keepOriginalFormat ? image.format : 'webp';
          await progressService.startSmartProgress(
            image.id,
            image.format,
            outputFormat,
            image.originalSize,
            compressionSettings.quality,
            {
              onProgress: (imageId, progress) => {
                console.log(`📊 Smooth progress update: ${imageId} -> ${progress}%`);
                get().updateImageProgress(imageId, progress);
              },
              onComplete: imageId => {
                console.log(`✅ Smooth progress completed for ${imageId}`);
              },
              onError: (imageId, error) => {
                console.error(`❌ Smooth progress error for ${imageId}:`, error);
              },
            }
          );

          console.log(`📞 Calling compress_image for ${image.name}`, {
            path: image.path,
            quality: compressionSettings.quality,
            format: compressionSettings.keepOriginalFormat ? 'auto' : 'webp',
            imageId: image.id,
          });

          const startTime = Date.now();
          const response = await invoke<CompressImageResponse>('compress_image', {
            request: {
              file_path: image.path,
              quality: compressionSettings.quality,
              format: compressionSettings.keepOriginalFormat ? 'auto' : 'webp',
            },
            imageId: image.id,
          });
          const compressionTimeMs = Date.now() - startTime;

          if (response.success && response.result) {
            // Forcer la complétion de la progression fluide
            progressService.completeImageProgress(image.id);

            set(state => ({
              images: state.images.map(img =>
                img.id === image.id
                  ? img.toCompleted(response.result!.compressed_size, response.result!.output_path)
                  : img
              ),
            }));

            // Enregistrer le résultat de compression avec timing dans la base de données
            try {
              const outputFormat = compressionSettings.keepOriginalFormat
                ? image.format.toUpperCase()
                : 'WEBP';

              await invoke('record_compression_result_with_time', {
                inputFormat: image.format.toUpperCase(),
                outputFormat: outputFormat,
                originalSize: image.originalSize,
                compressedSize: response.result.compressed_size,
                compressionTimeMs: compressionTimeMs,
                toolVersion: 'plume-v0.1.0',
              });

              console.log(
                `📊 Compression result with timing recorded: ${image.format} → ${outputFormat}, ${image.originalSize} → ${response.result.compressed_size} bytes in ${compressionTimeMs}ms`
              );
            } catch (dbError) {
              console.warn('⚠️ Failed to record compression result in database:', dbError);
              // Fallback vers l'ancienne méthode sans timing
              try {
                await invoke('record_compression_result', {
                  inputFormat: image.format.toUpperCase(),
                  outputFormat: compressionSettings.keepOriginalFormat
                    ? image.format.toUpperCase()
                    : 'WEBP',
                  originalSize: image.originalSize,
                  compressedSize: response.result.compressed_size,
                  toolVersion: 'plume-v0.1.0',
                });
              } catch (fallbackError) {
                console.warn('⚠️ Fallback recording also failed:', fallbackError);
              }
            }
          } else {
            // Signaler l'erreur à la progression fluide
            progressService.errorImageProgress(image.id, response.error || 'Compression failed');

            set(state => ({
              images: state.images.map(img => (img.id === image.id ? img.toError() : img)),
            }));
            toast.error(`Erreur compression ${image.name}: ${response.error}`);
          }
        } catch (error) {
          // Signaler l'erreur à la progression fluide
          progressService.errorImageProgress(image.id, String(error));

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

  downloadImage: async (imageId: string) => {
    const { images } = get();
    const image = images.find(img => img.id === imageId);

    if (!image || !image.outputPath) return;

    try {
      toast.success(`${image.name} prêt pour téléchargement`);
    } catch (error) {
      toast.error(`Erreur de téléchargement: ${error}`);
    }
  },

  downloadAllImages: async () => {
    const { images } = get();
    const completedImages = images.filter(img => img.isCompleted());

    for (const image of completedImages) {
      await get().downloadImage(image.id);
    }
  },

  // Actions pour les paramètres
  setCompressionSettings: (newSettings: Partial<CompressionSettings>) => {
    set(state => ({
      compressionSettings: { ...state.compressionSettings, ...newSettings },
    }));
  },

  toggleWebPConversion: () => {
    set(state => ({
      compressionSettings: {
        ...state.compressionSettings,
        keepOriginalFormat: !state.compressionSettings.keepOriginalFormat,
      },
    }));
  },

  toggleLossyMode: () => {
    set(state => ({
      compressionSettings: {
        ...state.compressionSettings,
        quality: state.compressionSettings.quality >= 90 ? 80 : 95,
      },
    }));
  },

  setQuality: (quality: number) => {
    set(state => ({
      compressionSettings: {
        ...state.compressionSettings,
        quality: Math.max(1, Math.min(100, quality)),
      },
    }));
  },

  // Actions pour le drag & drop
  handleExternalDrop: async (filePaths: string[]) => {
    await get().addImages(filePaths);
  },

  // Actions internes pour les transitions d'état
  updateImageProgress: (imageId: string, progress: number) => {
    set(state => ({
      images: state.images.map(img => (img.id === imageId ? img.updateProgress(progress) : img)),
      progressState: {
        ...state.progressState,
        [imageId]: { progress },
      },
    }));
  },

  // Initialiser l'écoute des événements de progression Tauri
  initializeProgressListener: () => {
    // Stocker unlisten dans le state pour pouvoir le nettoyer
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        console.log('🎧 Setting up compression progress listener...');

        // Nettoyer l'ancien listener s'il existe
        if (unlisten) {
          unlisten();
          unlisten = undefined;
        }

        unlisten = await listen<CompressionProgressEvent>('compression-progress', event => {
          const progressData = event.payload;
          console.log('📊 Progress event received:', progressData);

          // Convertir la progression 0.0-1.0 en pourcentage 0-100
          const progressPercent = Math.round(progressData.progress * 100);

          // Mettre à jour la progression de l'image
          get().updateImageProgress(progressData.image_id, progressPercent);

          // Si compression terminée avec succès, garder à 100% (sera géré par la response du invoke)
          if (progressData.stage === 'Complete') {
            console.log(`✅ Compression completed for ${progressData.image_id}`);
          }

          // Si erreur, marquer l'image comme erreur
          if (progressData.stage === 'Error') {
            console.log(`❌ Compression failed for ${progressData.image_id}`);
            set(state => ({
              images: state.images.map(img =>
                img.id === progressData.image_id ? img.toError() : img
              ),
            }));
          }
        });
        console.log('🎧 Compression progress listener set up successfully');
      } catch (error) {
        console.error('❌ Error setting up compression progress listener:', error);
      }
    };

    setupListener();
  },
}));
