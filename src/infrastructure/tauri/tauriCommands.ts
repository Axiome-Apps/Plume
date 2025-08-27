import { invoke } from '@tauri-apps/api/core';
import { 
  CompressImageRequest, 
  CompressImageResponse,
  CompressImageRequestSchema,
  CompressImageResponseSchema
} from '../../domain/schemas/compressionSchemas';

/**
 * Interface pour les commandes Tauri avec validation Zod
 */
export class TauriCommands {
  /**
   * Compresse une image via Tauri avec validation des données
   */
  async compressImage(request: CompressImageRequest): Promise<CompressImageResponse> {
    try {
      // Validation du request
      const validatedRequest = CompressImageRequestSchema.parse(request);
      
      const response = await invoke<unknown>('compress_image', { 
        request: validatedRequest 
      });
      
      // Validation de la response
      return CompressImageResponseSchema.parse(response);
    } catch (error) {
      console.error('Erreur lors de la compression:', error);
      return {
        success: false,
        error: `Erreur lors de l'appel Tauri: ${error}`,
      };
    }
  }

  /**
   * Génère un preview base64 à partir d'un chemin de fichier
   */
  async generatePreview(filePath: string): Promise<string> {
    try {
      const preview = await invoke<string>('generate_preview', { filePath });
      return preview;
    } catch (error) {
      console.error('Erreur génération preview:', error);
      throw new Error(`Impossible de générer le preview: ${error}`);
    }
  }

  /**
   * Sauvegarde temporairement les fichiers droppés
   */
  async saveDroppedFiles(files: File[]): Promise<string[]> {
    try {
      // Convertir les File objects en format pour Tauri
      const droppedFiles = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const data = Array.from(new Uint8Array(arrayBuffer));
          return {
            name: file.name,
            data,
          };
        })
      );

      const filePaths = await invoke<string[]>('save_dropped_files', { 
        filesData: droppedFiles 
      });
      return filePaths;
    } catch (error) {
      console.error('Erreur sauvegarde fichiers droppés:', error);
      return [];
    }
  }

  /**
   * Sauvegarde un fichier dans le dossier Downloads
   */
  async saveToDownloads(filePath: string): Promise<string> {
    try {
      const downloadPath = await invoke<string>('save_to_downloads', { filePath });
      return downloadPath;
    } catch (error) {
      console.error('Erreur sauvegarde dans Downloads:', error);
      throw new Error(`Impossible de sauvegarder dans Downloads: ${error}`);
    }
  }

  /**
   * Sauvegarde tous les fichiers dans le dossier Downloads
   */
  async saveAllToDownloads(filePaths: string[]): Promise<string[]> {
    try {
      const downloadPaths = await invoke<string[]>('save_all_to_downloads', { filePaths });
      return downloadPaths;
    } catch (error) {
      console.error('Erreur sauvegarde de tous les fichiers:', error);
      throw new Error(`Impossible de sauvegarder tous les fichiers: ${error}`);
    }
  }
}

// Instance singleton pour faciliter l'utilisation
export const tauriCommands = new TauriCommands();