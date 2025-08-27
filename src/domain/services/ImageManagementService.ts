import { Image } from "../entities/Image";
import { CompressionSettings } from "../entities/CompressionSettings";
import { ImageCompressionService } from "./ImageCompressionService";
import { DroppedFile } from "../schemas/imageSchemas";

/**
 * Service de gestion d'images - Orchestrateur principal
 */
export class ImageManagementService {
  constructor(private compressionService: ImageCompressionService) {}

  /**
   * Traite les fichiers sélectionnés via l'interface
   */
  async handleFileSelection(files: File[], settings: CompressionSettings): Promise<Image[]> {
    try {
      // Filtrer les fichiers valides
      const validFiles = files.filter(file => 
        ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
      );

      if (validFiles.length === 0) {
        return [];
      }

      // Convertir en format DroppedFile
      const droppedFiles: DroppedFile[] = await Promise.all(
        validFiles.map(async (file) => {
          const preview = await this.fileToDataURL(file);
          return {
            path: file.name, // Sera remplacé par le vrai chemin après sauvegarde
            preview,
          };
        })
      );

      return this.compressionService.processDroppedFiles(droppedFiles, settings);
    } catch (error) {
      console.error('Erreur traitement sélection fichiers:', error);
      return [];
    }
  }

  /**
   * Traite les fichiers depuis drag & drop externe
   */
  async handleExternalDrop(filePaths: string[], settings: CompressionSettings): Promise<Image[]> {
    // Filtrer les fichiers images par extension
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const imageFiles = filePaths.filter(path => 
      imageExtensions.some(ext => path.toLowerCase().endsWith(ext))
    );

    if (imageFiles.length === 0) {
      return [];
    }

    return this.compressionService.processFilePaths(imageFiles, settings);
  }

  /**
   * Démarre la compression d'un batch d'images
   */
  async startCompression(
    images: Image[],
    settings: CompressionSettings,
    callbacks: {
      onProgress?: (completedCount: number, totalCount: number) => void;
      onImageStart?: (image: Image, index: number) => void;
      onImageComplete?: (image: Image, index: number) => void;
      onImageError?: (image: Image, error: Error, index: number) => void;
      onComplete?: (results: Image[]) => void;
    } = {}
  ): Promise<Image[]> {
    const pendingImages = images.filter(img => img.isPending());
    
    if (pendingImages.length === 0) {
      return images;
    }

    let completedCount = 0;
    const results: Image[] = [...images];

    try {
      for (let i = 0; i < pendingImages.length; i++) {
        const image = pendingImages[i];
        const imageIndex = images.findIndex(img => img.id === image.id);
        
        try {
          callbacks.onImageStart?.(image, i);
          
          const compressedImage = await this.compressionService.compressImage(image, settings);
          
          // Remplacer l'image dans les résultats
          results[imageIndex] = compressedImage;
          completedCount++;
          
          callbacks.onImageComplete?.(compressedImage, i);
          callbacks.onProgress?.(completedCount, pendingImages.length);
          
        } catch (error) {
          callbacks.onImageError?.(image, error as Error, i);
          // L'image reste en statut pending dans les résultats
        }
      }

      callbacks.onComplete?.(results);
      return results;
      
    } catch (error) {
      console.error('Erreur lors de la compression batch:', error);
      throw error;
    }
  }

  /**
   * Télécharge une image
   */
  async downloadImage(image: Image): Promise<string> {
    return this.compressionService.downloadImage(image);
  }

  /**
   * Télécharge toutes les images compressées
   */
  async downloadAllImages(images: Image[]): Promise<string[]> {
    return this.compressionService.downloadAllImages(images);
  }

  /**
   * Supprime une image de la collection
   */
  removeImage(images: Image[], imageToRemove: Image): Image[] {
    return images.filter(img => img.id !== imageToRemove.id);
  }

  /**
   * Vide toute la collection d'images
   */
  clearAllImages(): Image[] {
    return [];
  }

  /**
   * Calcule les statistiques de la collection
   */
  getStats(images: Image[]) {
    return this.compressionService.calculateStats(images);
  }

  /**
   * Filtre les images par statut
   */
  filterImagesByStatus(images: Image[], status: 'pending' | 'processing' | 'completed'): Image[] {
    return images.filter(img => img.status === status);
  }

  /**
   * Vérifie s'il y a des images dans un statut donné
   */
  hasImagesWithStatus(images: Image[], status: 'pending' | 'processing' | 'completed'): boolean {
    return images.some(img => img.status === status);
  }

  /**
   * Convertit un File en Data URL
   */
  private fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}