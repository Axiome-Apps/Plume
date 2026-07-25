import { z } from 'zod';
import { type ImageFormatDisplay } from '@/domain/constants';

// UI presets — output format and compression level
export const OutputFormatSchema = z.enum(['keep', 'webp', 'jpeg', 'png']);
export const CompressionLevelSchema = z.enum(['light', 'balanced', 'aggressive']);

export type OutputFormatType = z.infer<typeof OutputFormatSchema>;
export type CompressionLevelType = z.infer<typeof CompressionLevelSchema>;

// IPC contract — mirrors CompressionSummary in
// src-tauri/src/domain/compression/pipeline.rs (the success payload of
// compress_image; failures surface as a thrown CommandError, not a payload).
export const CompressionSummarySchema = z.object({
  original_size: z.number().nonnegative(),
  compressed_size: z.number().nonnegative(),
  savings_percent: z.number(),
  output_path: z.string(),
});

export type CompressionSummaryType = z.infer<typeof CompressionSummarySchema>;

interface ResolvedCompressionParams {
  quality: number;
  format: string; // wire format sent to Tauri: 'webp' | 'jpeg' | 'png' | 'auto'
  lossy: boolean;
}

const QUALITY_MAP: Record<CompressionLevelType, number> = {
  light: 100,
  balanced: 80,
  aggressive: 60,
};

const MOZJPEG_QUALITY_MAP: Record<CompressionLevelType, number> = {
  light: 92,
  balanced: 80,
  aggressive: 60,
};

/**
 * Resolves the UI preset (outputFormat + level) into backend compression parameters.
 * Pure function — no side effects.
 */
export function resolveCompressionParams(
  outputFormat: OutputFormatType,
  level: CompressionLevelType,
  imageFormat: ImageFormatDisplay
): ResolvedCompressionParams {
  const isHeic = imageFormat === 'HEIC';

  // Determine effective format
  let effectiveFormat: 'webp' | 'jpeg' | 'png' | 'auto';
  if (outputFormat === 'keep') {
    effectiveFormat = isHeic ? 'jpeg' : 'auto';
  } else {
    effectiveFormat = outputFormat;
  }

  // Determine quality + lossy based on effective format and level
  switch (effectiveFormat) {
    case 'webp': {
      const isLossless = level === 'light';
      return {
        quality: QUALITY_MAP[level],
        format: 'webp',
        lossy: !isLossless,
      };
    }
    case 'jpeg':
      return {
        quality: MOZJPEG_QUALITY_MAP[level],
        format: 'jpeg',
        lossy: true,
      };
    case 'png':
      return {
        quality: 100,
        format: 'png',
        lossy: false,
      };
    case 'auto': {
      // Keep original format — adapt quality to source format
      if (imageFormat === 'WEBP') {
        const isLossless = level === 'light';
        return {
          quality: QUALITY_MAP[level],
          format: 'auto',
          lossy: !isLossless,
        };
      }
      if (imageFormat === 'JPEG') {
        return {
          quality: MOZJPEG_QUALITY_MAP[level],
          format: 'auto',
          lossy: true,
        };
      }
      // PNG or other — oxipng is always lossless, so the level has no effect
      return {
        quality: 100,
        format: 'auto',
        lossy: false,
      };
    }
  }
}
