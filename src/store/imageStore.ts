import { create, type StoreApi } from 'zustand';
import { toast } from 'sonner';

import { Image } from '@/domain/image/entity';
import { detectImageFormat, imageFormatFromExtension } from '@/domain/constants';
import { AdaptiveProgressManager } from '@/domain/progress/adaptiveProgress';
import * as SizePrediction from '@/domain/size-prediction/service';
import {
  type OutputFormatType,
  type CompressionLevelType,
  resolveCompressionParams,
} from '@/domain/compression/schema';
import { CommandError, commandErrorMessage } from '@/domain/errors/commandError';
import {
  compressImage as tauriCompressImage,
  getFileInformation,
  getProgressEstimation,
  scanPathsForImages,
} from '@/lib/tauri';
import { translate } from '@/domain/i18n/translate';

// State management types
type CompressionState = 'idle' | 'processing' | 'completed' | 'error';
type AppView = 'drop' | 'list' | 'success';

interface CompressionSettings {
  outputFormat: OutputFormatType;
  compressionLevel: CompressionLevelType;
}

interface ImageStore {
  // Main state
  images: Image[];
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

type ImageStoreSet = StoreApi<ImageStore>['setState'];
type ImageStoreGet = StoreApi<ImageStore>['getState'];

/**
 * Compresses a single image end to end: status transitions, adaptive progress
 * animation and the IPC call. A per-image failure is caught and surfaced here
 * (toast + error status) so a batch loop can keep going. Shared by both
 * `startCompression` (batch) and `compressImage` (single, targeted).
 */
async function runImageCompression(
  image: Image,
  compressionSettings: CompressionSettings,
  set: ImageStoreSet,
  get: ImageStoreGet
): Promise<void> {
  try {
    // Mark the image as being processed
    set(state => ({
      images: state.images.map(img => (img.id === image.id ? Image.toProcessing(img, 0) : img)),
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
        image.originalSize,
        image.path
      );
      estimatedDurationMs = estimation.estimated_duration_ms;
    } catch (error) {
      // Non-blocking — progress estimation failed, keep the default.
      console.error('startCompression: progress estimation failed, using default:', error);
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
                ? Image.toCompleted(img, pendingResult!.compressedSize, pendingResult!.outputPath)
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

    const summary = await tauriCompressImage({
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

    pendingResult = {
      compressedSize: summary.compressed_size,
      outputPath: summary.output_path,
    };

    if (summary.savings_percent === 0) {
      toast.info(translate('toasts.alreadyOptimized', { name: image.name }));
    }
  } catch (error) {
    // A compression failure surfaces as a thrown CommandError.
    const catchErrorManager = get().progressManagers[image.id];
    if (catchErrorManager) {
      catchErrorManager.error(error instanceof CommandError ? error.message : String(error));
    }

    set(state => ({
      images: state.images.map(img => (img.id === image.id ? Image.toError(img) : img)),
    }));
    toast.error(
      translate('toasts.compressionError', {
        name: image.name,
        reason: commandErrorMessage(error),
      })
    );
  }
}

/** How many images are enriched (metadata + estimation IPC) at once. */
const ADD_IMAGES_CONCURRENCY = 8;

/**
 * Build one pending image from its path: backend metadata (name, size, format)
 * plus a compression estimation, each best-effort with a fallback. Pure input →
 * value, so a batch can run several in parallel.
 */
async function buildPendingImage(
  filePath: string,
  compressionSettings: CompressionSettings
): Promise<Image> {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  let fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
  let fileSize = 0;
  let format = detectImageFormat(fileName);
  try {
    const fileInfo = await getFileInformation(filePath);
    fileName = fileInfo.name;
    fileSize = fileInfo.size;
    format = imageFormatFromExtension(fileInfo.extension);
  } catch (error) {
    // Non-blocking — file info is best-effort; fall back to the path.
    console.error('addImages: file info unavailable, using path fallback:', error);
  }

  let estimatedCompression;
  try {
    const resolved = resolveCompressionParams(
      compressionSettings.outputFormat,
      compressionSettings.compressionLevel,
      format
    );
    const estimationOutputFormat =
      resolved.format === 'auto' ? format.toLowerCase() : resolved.format;
    const estimation = await SizePrediction.getEstimation(
      format,
      estimationOutputFormat,
      fileSize,
      resolved.quality,
      resolved.lossy
    );
    estimatedCompression = {
      percent: estimation.percent,
      ratio: estimation.ratio,
      confidence: estimation.confidence,
      sample_count: estimation.sample_count,
    };
  } catch (error) {
    // Non-blocking — estimation service failed, use default values.
    console.error('addImages: estimation failed, using fallback:', error);
    estimatedCompression = {
      percent: 65,
      ratio: 0.35,
      confidence: 0.5,
      sample_count: 0,
    };
  }

  return {
    id: tempId,
    name: fileName,
    path: filePath,
    originalSize: fileSize,
    format,
    preview: `asset://localhost/${filePath}`,
    status: 'pending',
    estimatedCompression,
  };
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
    if (state.compressionState === 'completed' && state.images.every(img => Image.isCompleted(img)))
      return 'success';
    return 'list';
  },

  // Image actions
  addImages: async (filePaths: string[]) => {
    try {
      const { images, compressionSettings } = get();
      const existingPaths = new Set(images.map(img => img.path));
      const uniqueFilePaths = filePaths.filter(path => !existingPaths.has(path));

      if (uniqueFilePaths.length === 0) {
        return;
      }

      // Enrich with bounded concurrency: each image needs two IPC round-trips
      // (metadata + estimation), so a folder of hundreds must not run serially.
      const newImages: Image[] = [];
      for (let i = 0; i < uniqueFilePaths.length; i += ADD_IMAGES_CONCURRENCY) {
        const chunk = uniqueFilePaths.slice(i, i + ADD_IMAGES_CONCURRENCY);
        const built = await Promise.all(
          chunk.map(filePath => buildPendingImage(filePath, compressionSettings))
        );
        newImages.push(...built);
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

    const pendingImages = images.filter(img => Image.isPending(img));
    if (pendingImages.length === 0) return;

    set({ isProcessing: true, compressionState: 'processing' });

    try {
      // Fire every image at once; the backend Semaphore (CompressionLimiter)
      // bounds how many actually run in parallel. Each image keeps its own
      // progress manager and completion signal, so rows complete independently.
      // runImageCompression handles its own errors, so no run rejects the batch.
      await Promise.all(
        pendingImages.map(image => runImageCompression(image, compressionSettings, set, get))
      );

      set({ compressionState: 'completed' });
    } finally {
      set({ isProcessing: false });
    }
  },

  compressImage: async (imageId: string) => {
    const { images, isProcessing, compressionSettings } = get();
    if (isProcessing) return;

    const image = images.find(img => img.id === imageId);
    if (!image || !Image.isPending(image)) return;

    set({ isProcessing: true, compressionState: 'processing' });

    try {
      await runImageCompression(image, compressionSettings, set, get);
      set({ compressionState: 'completed' });
    } finally {
      set({ isProcessing: false });
    }
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
    void get()
      .recalculateEstimations()
      .catch(error => console.error('recalculateEstimations failed:', error));
  },

  setCompressionLevel: (level: CompressionLevelType) => {
    set(state => ({
      compressionSettings: {
        ...state.compressionSettings,
        compressionLevel: level,
      },
    }));
    void get()
      .recalculateEstimations()
      .catch(error => console.error('recalculateEstimations failed:', error));
  },

  recalculateEstimations: async () => {
    const { images, compressionSettings } = get();
    const pendingImages = images.filter(img => Image.isPending(img));
    if (pendingImages.length === 0) return;

    // Compute against the snapshot but key the results by image id, so the write
    // can target the *current* state rather than an overwrite of a stale array.
    const estimationsById = new Map<string, Image['estimatedCompression']>();
    await Promise.all(
      pendingImages.map(async img => {
        const resolved = resolveCompressionParams(
          compressionSettings.outputFormat,
          compressionSettings.compressionLevel,
          img.format
        );
        const estimationOutputFormat =
          resolved.format === 'auto' ? img.format.toLowerCase() : resolved.format;

        try {
          const estimation = await SizePrediction.getEstimation(
            img.format,
            estimationOutputFormat,
            img.originalSize,
            resolved.quality,
            resolved.lossy
          );
          estimationsById.set(img.id, {
            percent: estimation.percent,
            ratio: estimation.ratio,
            confidence: estimation.confidence,
            sample_count: estimation.sample_count,
          });
        } catch (error) {
          // Best-effort refresh: keep the previous estimation if the service fails.
          console.error('recalculateEstimations: keeping the previous estimate:', error);
        }
      })
    );

    // Merge into the current state (not the pre-await snapshot): only images that
    // still exist and are still pending are refreshed, so a concurrent addImages /
    // startCompression / removeImage is never clobbered by a stale write.
    set(state => ({
      images: state.images.map(img =>
        Image.isPending(img) && estimationsById.has(img.id)
          ? Image.withEstimation(img, estimationsById.get(img.id))
          : img
      ),
    }));
  },

  // Drag & drop actions
  handleExternalDrop: async (inputPaths: string[]) => {
    // The single input funnel for every mode (drop, file picker, folder picker):
    // the backend expands folders and filters to supported images.
    const outcome = await scanPathsForImages(inputPaths).catch(error => {
      console.error('handleExternalDrop: scan failed:', error);
      return null;
    });
    if (!outcome) return;

    if (outcome.images.length === 0) {
      if (inputPaths.length > 0) {
        toast.info(translate('toasts.noImagesFound'));
      }
      return;
    }

    // The scan hit its cap and left images out — tell the user what was added.
    if (outcome.truncated) {
      toast.info(translate('toasts.folderTruncated', { count: outcome.images.length }));
    }

    await get().addImages(outcome.images);
  },

  // Internal actions for state transitions
  updateImageProgress: (imageId: string, progress: number) => {
    set(state => ({
      images: state.images.map(img =>
        img.id === imageId ? Image.updateProgress(img, progress) : img
      ),
    }));
  },
}));
