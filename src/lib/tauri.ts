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

// ====== DATABASE STATS ======

export interface StatsSummary {
  total_compressions: number;
  webp_estimation_percent: number;
  webp_confidence: number;
  sample_count: number;
}

/**
 * Teste la connexion à la base de données
 */
export async function testDatabaseConnection(): Promise<string> {
  try {
    const result = await invoke<string>('test_database_connection');
    return result;
  } catch (error) {
    console.error('Erreur test connexion database:', error);
    throw new Error(`Impossible de tester la connexion: ${error}`);
  }
}

/**
 * Obtient le nombre total de statistiques dans la base
 */
export async function getStatsCount(): Promise<number> {
  try {
    const count = await invoke<number>('get_stats_count');
    return count;
  } catch (error) {
    console.error('Erreur récupération count stats:', error);
    throw new Error(`Impossible de récupérer le count: ${error}`);
  }
}

/**
 * Obtient un résumé des statistiques de compression
 */
export async function getStatsSummary(): Promise<StatsSummary> {
  try {
    const summary = await invoke<StatsSummary>('get_stats_summary');
    return summary;
  } catch (error) {
    console.error('Erreur récupération summary stats:', error);
    throw new Error(`Impossible de récupérer le summary: ${error}`);
  }
}

/**
 * Obtient les stats de la database (legacy - compatibilité)
 */
export async function getDatabaseStats(): Promise<number> {
  try {
    const stats = await invoke<number>('get_database_stats');
    return stats;
  } catch (error) {
    console.error('Erreur récupération database stats:', error);
    throw new Error(`Impossible de récupérer les database stats: ${error}`);
  }
}

/**
 * Initialise la base de données
 */
export async function initDatabase(): Promise<string> {
  try {
    const result = await invoke<string>('init_database');
    return result;
  } catch (error) {
    console.error('Erreur initialisation database:', error);
    throw new Error(`Impossible d'initialiser la database: ${error}`);
  }
}

/**
 * Remplir la base de données avec des données de test réalistes
 */
export async function seedCompressionDatabase(): Promise<string> {
  try {
    const result = await invoke<string>('seed_compression_database');
    return result;
  } catch (error) {
    console.error('Erreur seed database:', error);
    throw new Error(`Impossible de remplir la database: ${error}`);
  }
}

/**
 * Obtient une prédiction de compression basée sur l'historique
 */
export async function getCompressionPrediction(
  inputFormat: string,
  outputFormat: string
): Promise<number> {
  try {
    const prediction = await invoke<number>('get_compression_prediction', {
      input_format: inputFormat,
      output_format: outputFormat,
    });
    return prediction;
  } catch (error) {
    console.error('Erreur prédiction compression:', error);
    throw new Error(`Impossible de récupérer la prédiction: ${error}`);
  }
}

/**
 * Teste la prédiction de compression avec des détails
 */
export async function testCompressionPrediction(
  inputFormat: string,
  outputFormat: string,
  originalSize: number
): Promise<string> {
  try {
    const result = await invoke<string>('test_compression_prediction', {
      input_format: inputFormat,
      output_format: outputFormat,
      original_size: originalSize,
    });
    return result;
  } catch (error) {
    console.error('Erreur test prédiction:', error);
    throw new Error(`Impossible de tester la prédiction: ${error}`);
  }
}
