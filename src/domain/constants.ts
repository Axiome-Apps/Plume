/**
 * Shared domain constants - single source of truth for formats.
 */

import { z } from 'zod';

// Zod is the SSOT for the format enum: the union type and the value list both
// derive from this schema, so they can never drift apart.
export const ImageFormatSchema = z.enum(['png', 'jpeg', 'webp', 'heic']);
export type ImageFormat = z.infer<typeof ImageFormatSchema>;
export const IMAGE_FORMATS = ImageFormatSchema.options;

export type ImageFormatDisplay = 'PNG' | 'JPEG' | 'WEBP' | 'HEIC';

export const SUPPORTED_FORMATS_DISPLAY = IMAGE_FORMATS.map(format => format.toUpperCase()).join(
  ', '
);

const EXTENSION_TO_FORMAT: Record<string, ImageFormatDisplay> = {
  png: 'PNG',
  jpg: 'JPEG',
  jpeg: 'JPEG',
  webp: 'WEBP',
  heic: 'HEIC',
  heif: 'HEIC',
};

const FALLBACK_FORMAT: ImageFormatDisplay = 'JPEG';

/** Resolve the display format from a bare extension, as reported by the backend. */
export function imageFormatFromExtension(extension: string | null | undefined): ImageFormatDisplay {
  return EXTENSION_TO_FORMAT[extension?.toLowerCase() ?? ''] ?? FALLBACK_FORMAT;
}

/** Resolve the display format from a file name, when no backend metadata is available. */
export function detectImageFormat(fileName: string): ImageFormatDisplay {
  return imageFormatFromExtension(fileName.toLowerCase().split('.').pop());
}
