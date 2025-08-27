import { invoke } from '@tauri-apps/api/core';

export interface CompressImageRequest {
  file_path: string;
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp' | 'auto';
}

export interface CompressionResult {
  original_size: number;
  compressed_size: number;
  savings_percent: number;
  compressed_data: number[]; // Vec<u8> côté Rust
}

export interface CompressImageResponse {
  success: boolean;
  error?: string;
  result?: CompressionResult;
  output_path?: string;
}

export interface DroppedFile {
  name: string;
  data: number[]; // Vec<u8> côté Rust
}


/**
 * Compresse une seule image via Tauri
 */
export async function compressImage(request: CompressImageRequest): Promise<CompressImageResponse> {
  try {
    const response = await invoke<CompressImageResponse>('compress_image', { request });
    return response;
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
): Promise<CompressImageResponse[]> {
  try {
    const responses = await invoke<CompressImageResponse[]>('compress_batch', {
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

/**
 * Convertit des objets File en chemins temporaires via Tauri
 */
export async function saveDroppedFiles(files: File[]): Promise<string[]> {
  try {
    // Convertir les File objects en DroppedFile format
    const droppedFiles: DroppedFile[] = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const data = Array.from(new Uint8Array(arrayBuffer));
        return {
          name: file.name,
          data,
        };
      })
    );

    console.log("📤 Envoi à Tauri:", { filesData: droppedFiles });
    const filePaths = await invoke<string[]>('save_dropped_files', { filesData: droppedFiles });
    return filePaths;
  } catch (error) {
    console.error('Erreur sauvegarde fichiers droppés:', error);
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
    throw error;
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
    throw error;
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
    return '';
  }
}