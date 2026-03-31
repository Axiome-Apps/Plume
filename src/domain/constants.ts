/**
 * Constantes partagées du domaine - Source unique de vérité pour les formats
 */

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'heic';
export type ImageFormatDisplay = 'PNG' | 'JPEG' | 'WEBP' | 'HEIC';

export const IMAGE_FORMATS: ImageFormat[] = ['png', 'jpeg', 'webp', 'heic'];

export const SUPPORTED_FORMATS_DISPLAY = IMAGE_FORMATS.map(format => format.toUpperCase()).join(
  ', '
);

export function detectImageFormat(fileName: string): ImageFormatDisplay {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'png':
      return 'PNG';
    case 'jpg':
    case 'jpeg':
      return 'JPEG';
    case 'webp':
      return 'WEBP';
    case 'heic':
    case 'heif':
      return 'HEIC';
    default:
      return 'JPEG';
  }
}
