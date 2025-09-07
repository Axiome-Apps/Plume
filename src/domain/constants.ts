/**
 * Constantes partagées du domaine - Source unique de vérité pour les formats
 */

// Formats d'images (lowercase pour cohérence Tauri)
export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ImageFormatDisplay = 'PNG' | 'JPEG' | 'WEBP';

// Formats de compression (avec auto)
export type CompressionOutputFormat = 'png' | 'jpeg' | 'webp' | 'auto';

// Extensions supportées
export type SupportedExtension = '.png' | '.jpg' | '.jpeg' | '.webp';

// MIME types
export type SupportedMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

// Arrays de constantes
export const IMAGE_FORMATS: ImageFormat[] = ['png', 'jpeg', 'webp'];
export const COMPRESSION_OUTPUT_FORMATS: CompressionOutputFormat[] = [
  'png',
  'jpeg',
  'webp',
  'auto',
];
export const SUPPORTED_EXTENSIONS: SupportedExtension[] = ['.png', '.jpg', '.jpeg', '.webp'];
export const SUPPORTED_MIME_TYPES: SupportedMimeType[] = ['image/png', 'image/jpeg', 'image/webp'];

// Helpers
export const SUPPORTED_FORMATS_DISPLAY = IMAGE_FORMATS.map(format => format.toUpperCase()).join(
  ', '
);

// Helper pour détecter le format depuis l'extension
export function detectImageFormat(fileName: string): ImageFormatDisplay {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'png':
      return 'PNG';
    case 'jpg':
      return 'JPEG';
    case 'jpeg':
      return 'JPEG';
    case 'webp':
      return 'WEBP';
    default:
      return 'JPEG';
  }
}
