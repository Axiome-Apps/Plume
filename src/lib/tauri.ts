import { invoke } from '@tauri-apps/api/core';
import {
  CompressImageRequestType,
  CompressImageResponseType,
  CompressImageRequestSchema,
  CompressImageResponseSchema,
} from '../domain/compression/schema';

/**
 * Interface consolidée pour toutes les commandes Tauri
 * Combine validation Zod + fonctionnalités complètes
 */

// ====== COMPRESSION ======

/**
 * Compresse une image avec progression en temps réel via Tauri
 * Note: Utilise compress_image en interne car la fonction avec progress a été supprimée
 */
export async function compressImageWithProgress(
  request: CompressImageRequestType,
  imageId: string
): Promise<CompressImageResponseType> {
  try {
    // Validation du request avec Zod
    const validatedRequest = CompressImageRequestSchema.parse(request);

    // Passer l'imageId pour synchroniser les événements de progression
    const response = await invoke<CompressImageResponseType>('compress_image', {
      request: validatedRequest,
      image_id: imageId,
    });

    // Validation de la response
    return CompressImageResponseSchema.parse(response);
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de l'appel Tauri: ${error}`,
    };
  }
}

/**
 * Compresse une image via Tauri (version legacy sans progression)
 */
export async function compressImage(
  request: CompressImageRequestType
): Promise<CompressImageResponseType> {
  try {
    // Validation du request avec Zod
    const validatedRequest = CompressImageRequestSchema.parse(request);

    const response = await invoke<CompressImageResponseType>('compress_image', {
      request: validatedRequest,
      image_id: null,
    });

    // Validation de la response
    return CompressImageResponseSchema.parse(response);
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors de l'appel Tauri: ${error}`,
    };
  }
}

/**
 * Compresse plusieurs images en lot
 */
export async function compressBatch(
  filePaths: string[],
  quality?: number,
  format?: 'png' | 'jpeg' | 'webp' | 'auto'
): Promise<CompressImageResponseType[]> {
  try {
    const responses = await invoke<CompressImageResponseType[]>('compress_batch', {
      filePaths,
      quality,
      format,
    });
    return responses;
  } catch (error) {
    // En cas d'erreur globale, retourne une erreur pour chaque fichier
    return filePaths.map(() => ({
      success: false,
      error: `Erreur lors de l'appel Tauri: ${error}`,
    }));
  }
}

// ====== FILE OPERATIONS ======

/**
 * Ouvre un dialog pour sélectionner des fichiers images
 */
export async function selectImageFiles(): Promise<string[]> {
  try {
    const filePaths = await invoke<string[]>('select_image_files');
    return filePaths;
  } catch (error) {
    console.error('Erreur sélection fichiers:', error);
    return [];
  }
}

/**
 * Sauvegarde un fichier compressé dans le dossier Downloads
 */
export async function saveToDownloads(filePath: string): Promise<string> {
  try {
    const downloadPath = await invoke<string>('save_to_downloads', { filePath });
    return downloadPath;
  } catch (error) {
    console.error('Erreur sauvegarde dans Downloads:', error);
    throw new Error(`Impossible de sauvegarder dans Downloads: ${error}`);
  }
}

/**
 * Sauvegarde tous les fichiers compressés dans le dossier Downloads
 */
export async function saveAllToDownloads(filePaths: string[]): Promise<string[]> {
  try {
    const downloadPaths = await invoke<string[]>('save_all_to_downloads', { filePaths });
    return downloadPaths;
  } catch (error) {
    console.error('Erreur sauvegarde de tous les fichiers:', error);
    throw new Error(`Impossible de sauvegarder tous les fichiers: ${error}`);
  }
}

/**
 * Génère un preview base64 à partir d'un chemin de fichier
 */
export async function generatePreview(filePath: string): Promise<string> {
  try {
    const preview = await invoke<string>('generate_preview', { filePath });
    return preview;
  } catch (error) {
    console.error('Erreur génération preview:', error);
    throw new Error(`Impossible de générer le preview: ${error}`);
  }
}
