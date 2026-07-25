import { ImageType } from './schema';

/**
 * Image as pure data + helpers (declaration merging). Transitions return a new
 * value and guard the state machine — an impossible transition is a bug, so it
 * throws rather than returning a silent wrong state.
 */
export type Image = ImageType;

const clampProgress = (progress: number): number => Math.max(0, Math.min(100, progress));

export const Image = {
  isPending: (img: Image): boolean => img.status === 'pending',
  isProcessing: (img: Image): boolean => img.status === 'processing',
  isCompleted: (img: Image): boolean => img.status === 'completed',

  /**
   * Size to show for the row: the real compressed size once known, otherwise the
   * size derived from the predicted savings. `estimated` lets the UI mark it as
   * approximate. Null when neither is available yet.
   */
  displaySize: (img: Image): { bytes: number; estimated: boolean } | null => {
    if (img.compressedSize !== undefined) {
      return { bytes: img.compressedSize, estimated: false };
    }
    const percent = img.estimatedCompression?.percent;
    if (percent !== undefined) {
      return { bytes: img.originalSize * (1 - percent / 100), estimated: true };
    }
    return null;
  },

  /** Replace the estimation, leaving every other field untouched. */
  withEstimation: (img: Image, estimation: ImageType['estimatedCompression']): Image => ({
    ...img,
    estimatedCompression: estimation,
  }),

  toProcessing: (img: Image, progress = 0): Image => {
    if (img.status !== 'pending') {
      throw new Error(`Cannot transition from ${img.status} to processing`);
    }
    return { ...img, status: 'processing', progress };
  },

  updateProgress: (img: Image, progress: number): Image => {
    if (img.status !== 'processing') {
      throw new Error(`Cannot update progress on ${img.status} image`);
    }
    return { ...img, status: 'processing', progress: clampProgress(progress) };
  },

  toCompleted: (img: Image, compressedSize: number, outputPath?: string): Image => {
    if (img.status !== 'processing') {
      throw new Error(`Cannot transition from ${img.status} to completed`);
    }
    const savings = Math.round(((img.originalSize - compressedSize) / img.originalSize) * 100);
    return {
      ...img,
      status: 'completed',
      compressedSize,
      savings: Math.max(0, savings),
      outputPath,
      progress: undefined,
    };
  },

  toError: (img: Image): Image => ({
    ...img,
    status: 'error',
    progress: undefined,
    compressedSize: undefined,
    savings: undefined,
    outputPath: undefined,
  }),
} as const;
