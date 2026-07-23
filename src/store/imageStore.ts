import { create } from 'zustand';
import { toast } from 'sonner';

import { ImageEntity } from '@/domain/image/entity';
import { ImageType } from '@/domain/image/schema';
import { detectImageFormat, imageFormatFromExtension } from '@/domain/constants';
import { AdaptiveProgressManager } from '@/domain/progress/adaptiveProgress';
import { sizePredictionService } from '@/domain/size-prediction';
import {
  type OutputFormatType,
  type CompressionLevelType,
  resolveCompressionParams,
} from '@/domain/compression/schema';
import { compressionErrorKey } from '@/domain/compression/errors';
import {
  compressImage as tauriCompressImage,
  getFileInformation,
  getProgressEstimation,
} from '@/lib/tauri';
import { translate } from '@/domain/i18n';

/** Map a backend error string to the message shown to the user. */
function errorMessage(error: string | null | undefined): string {
  return translate(compressionErrorKey(error));
}

// State management types
type CompressionState = 'idle' | 'processing' | 'completed' | 'error';
type AppView = 'drop' | 'list' | 'success';

interface CompressionSettings {
  outputFormat: OutputFormatType;
  compressionLevel: CompressionLevelType;
}

interface ImageStore {
  // Main state
  images: ImageEntity[];
  compressionState: CompressionState;
  isProcessing: boolean;
  compressionSettings: CompressionSettings;
  progressManagers: Record<string, AdaptiveProgressManager>;

  // Computed getters - functions rather than properties
  currentView: () => AppView;

  // Image actions
  addImages: (filePaths: string[]) => Promise<void>;
  removeImage: (imageId: string) => void;
  clearImages: () => void;

  // Compression actions
  startCompression: () => Promise<void>;
  compressImage: (imageId: string) => Promise<void>;
  // Settings actions
  setCompressionSettings: (settings: Partial<CompressionSettings>) => void;
  setOutputFormat: (format: OutputFormatType) => void;
  setCompressionLevel: (level: CompressionLevelType) => void;
  recalculateEstimations: () => Promise<void>;

  // Drag & drop actions
  handleExternalDrop: (filePaths: string[]) => Promise<void>;

  // Internal actions
  updateImageProgress: (imageId: string, progress: number) => void;
}

export const useImageStore = create<ImageStore>((set, get) => ({
  // Initial state
  images: [],
  compressionState: 'idle',
  isProcessing: false,
  compressionSettings: {
    outputFormat: 'webp',
    compressionLevel: 'balanced',
  },
  progressManagers: {},

  // Computed getters - use functions rather than getters
  currentView: (): AppView => {
    const state = get();
    if (state.images.length === 0) return 'drop';
    if (state.compressionState === 'completed' && state.images.every(img => img.isCompleted()))
      return 'success';
    return 'list';
  },

  // Image actions
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

        // The backend already resolved the name, extension and size — take them
        // from there rather than parsing the path string again.
        let fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
        let fileSize = 0;
        let format = detectImageFormat(fileName);
        try {
          const fileInfo = await getFileInformation(filePath);
          fileName = fileInfo.name;
          fileSize = fileInfo.size;
          format = imageFormatFromExtension(fileInfo.extension);
        } catch {
          // Non-blocking — file info is best-effort
        }

        // Fetch the compression estimation from the service
        let estimatedCompression;
        try {
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
          // Extract the properties compatible with EstimationResultType
          estimatedCompression = {
            percent: estimation.percent,
            ratio: estimation.ratio,
            confidence: estimation.confidence,
            sample_count: estimation.sample_count,
          };
        } catch {
          // Non-blocking — estimation fallback will be used
          // Fallback with default values
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
          format,
          preview: `asset://localhost/${filePath}`,
          status: 'pending',
          estimatedCompression,
        };
        newImages.push(ImageEntity.fromData(imageData));
      }

      set(state => ({
        images: [...state.images, ...newImages],
      }));

      toast.success(translate('toasts.imagesAdded', { count: uniqueFilePaths.length }));
    } catch {
      toast.error(translate('toasts.addFailed'));
    }
  },

  removeImage: (imageId: string) => {
    set(state => ({
      images: state.images.filter(img => img.id !== imageId),
    }));
  },

  clearImages: () => {
    const { progressManagers } = get();
    // Stop every progress manager before clearing
    Object.values(progressManagers).forEach(manager => manager.stop());

    set({
      images: [],
      compressionState: 'idle',
      progressManagers: {},
    });
  },

  // Compression actions
  startCompression: async () => {
    const { images, isProcessing, compressionSettings } = get();
    if (isProcessing) return;

    const pendingImages = images.filter(img => img.isPending());
    if (pendingImages.length === 0) return;

    set({ isProcessing: true, compressionState: 'processing' });

    try {
      for (const image of pendingImages) {
        try {
          // Mark the image as being processed
          set(state => ({
            images: state.images.map(img => (img.id === image.id ? img.toProcessing(0) : img)),
          }));

          // Resolve compression params for this image
          const { quality, format: outputFormatForImage } = resolveCompressionParams(
            compressionSettings.outputFormat,
            compressionSettings.compressionLevel,
            image.format
          );

          // Fetch the duration estimation from the DB (with heuristic fallback)
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

          // Create and start the adaptive progress manager
          const progressManager = new AdaptiveProgressManager(image.id, estimatedDurationMs);

          // Keep the manager around so it can be controlled later
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

          const response = await tauriCompressImage({
            file_path: image.path,
            quality,
            format: outputFormatForImage,
            level: compressionSettings.compressionLevel,
          });

          // Signal completion to the adaptive manager -> triggers the 85->100 animation
          const finalManager = get().progressManagers[image.id];
          if (finalManager) {
            finalManager.onCompressionCompleted();
          }

          if (response.success && response.result) {
            pendingResult = {
              compressedSize: response.result.compressed_size,
              outputPath: response.result.output_path,
            };

            if (response.result.savings_percent === 0) {
              toast.info(translate('toasts.alreadyOptimized', { name: image.name }));
            }
          } else {
            // Signal the error to the adaptive manager
            const errorManager = get().progressManagers[image.id];
            if (errorManager) {
              errorManager.error(response.error || 'Compression failed');
            }

            set(state => ({
              images: state.images.map(img => (img.id === image.id ? img.toError() : img)),
            }));
            toast.error(
              translate('toasts.compressionError', {
                name: image.name,
                reason: errorMessage(response.error),
              })
            );
          }
        } catch (error) {
          // Signal the error to the adaptive manager
          const catchErrorManager = get().progressManagers[image.id];
          if (catchErrorManager) {
            catchErrorManager.error(String(error));
          }

          set(state => ({
            images: state.images.map(img => (img.id === image.id ? img.toError() : img)),
          }));
          toast.error(
            translate('toasts.compressionError', {
              name: image.name,
              reason: errorMessage(String(error)),
            })
          );
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

    // Call startCompression directly; it handles the status transitions
    await get().startCompression();
  },

  // Settings actions
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
        ...(format === 'png' ? { compressionLevel: 'aggressive' } : {}),
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
          return img.withEstimation({
            percent: estimation.percent,
            ratio: estimation.ratio,
            confidence: estimation.confidence,
            sample_count: estimation.sample_count,
          });
        } catch {
          return img;
        }
      })
    );

    set({ images: updatedImages });
  },

  // Drag & drop actions
  handleExternalDrop: async (filePaths: string[]) => {
    await get().addImages(filePaths);
  },

  // Internal actions for state transitions
  updateImageProgress: (imageId: string, progress: number) => {
    set(state => ({
      images: state.images.map(img => (img.id === imageId ? img.updateProgress(progress) : img)),
    }));
  },
}));
