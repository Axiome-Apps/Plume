import { Image } from '../entities/Image';
import { CompressionSettings } from '../entities/CompressionSettings';
import { CompressImageRequest, CompressImageResponse } from '../schemas/compressionSchemas';
import { DroppedFile, CompletedImage } from '../schemas/imageSchemas';

/**
 * Service de compression d'images - Logique métier pour la compression
 */
export class ImageCompressionService {
  constructor(
    private tauriCommands: {
      compressImage: (request: CompressImageRequest) => Promise<CompressImageResponse>;
      generatePreview: (filePath: string) => Promise<string>;
      saveDroppedFiles: (files: File[]) => Promise<string[]>;
      saveToDownloads: (filePath: string) => Promise<string>;
      saveAllToDownloads: (filePaths: string[]) => Promise<string[]>;
    }
  ) {}

  /**
   * Traite les fichiers droppés/sélectionnés et les convertit en images pending
   */
  async processDroppedFiles(files: DroppedFile[], settings: CompressionSettings): Promise<Image[]> {
    const pendingImages: Image[] = [];

    for (const fileData of files) {
      try {
        const fileName = fileData.path.split('/').pop() || 'image';
        const ext = fileName.toLowerCase().split('.').pop() || '';

        // Approximation de la taille du fichier depuis base64
        const originalSize = Math.round((fileData.preview.length * 3) / 4);

        const estimatedCompression = this.getEstimationForFormat(ext, settings);

        const image = Image.createPending(
          {
            name: fileName,
            originalSize,
            format: ext.toUpperCase() as any,
            preview: fileData.preview,
            path: fileData.path,
          },
          estimatedCompression
        );

        pendingImages.push(image);
      } catch (error) {
        console.error(`Erreur traitement fichier ${fileData.path}:`, error);
        // Continue avec les autres fichiers
      }
    }

    return pendingImages;
  }

  /**
   * Traite les fichiers depuis des chemins système (drag & drop externe)
   */
  async processFilePaths(filePaths: string[], settings: CompressionSettings): Promise<Image[]> {
    const droppedFiles: DroppedFile[] = [];

    for (const path of filePaths) {
      try {
        const preview = await this.tauriCommands.generatePreview(path);
        droppedFiles.push({ path, preview });
      } catch (error) {
        console.error(`Erreur génération preview pour ${path}:`, error);
        // Continue avec les autres fichiers
      }
    }

    return this.processDroppedFiles(droppedFiles, settings);
  }

  /**
   * Compresse une image
   */
  async compressImage(image: Image, settings: CompressionSettings): Promise<Image> {
    if (!image.isPending()) {
      throw new Error(`Image ${image.id} n'est pas en statut pending`);
    }

    const processingImage = image.toProcessing(0);

    try {
      const outputFormat = settings.getOutputFormatForImage(image.format);
      const quality = settings.getQualityForFormat(image.format);

      const request: CompressImageRequest = {
        file_path: image.data.path,
        quality,
        format: outputFormat,
      };

      const response = await this.tauriCommands.compressImage(request);

      if (response.success && response.result) {
        return processingImage.toCompleted(response.result.compressed_size, response.output_path);
      } else {
        throw new Error(response.error || 'Compression failed');
      }
    } catch (error) {
      console.error(`Erreur compression image ${image.id}:`, error);
      throw error;
    }
  }

  /**
   * Compresse plusieurs images avec gestion des callbacks de progression
   */
  async compressImages(
    images: Image[],
    settings: CompressionSettings,
    callbacks: {
      onImageStart?: (image: Image) => void;
      onImageProgress?: (image: Image, progress: number) => void;
      onImageComplete?: (image: Image) => void;
      onImageError?: (image: Image, error: Error) => void;
    } = {}
  ): Promise<Image[]> {
    const results: Image[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      if (!image.isPending()) {
        results.push(image);
        continue;
      }

      try {
        callbacks.onImageStart?.(image);

        // Simuler progression (on pourrait améliorer avec de vrais callbacks Tauri)
        const processingImage = image.toProcessing(0);
        callbacks.onImageProgress?.(processingImage, 0);

        const compressedImage = await this.compressImage(image, settings);

        callbacks.onImageComplete?.(compressedImage);
        results.push(compressedImage);
      } catch (error) {
        callbacks.onImageError?.(image, error as Error);
        results.push(image); // Garder l'image original en cas d'erreur
      }
    }

    return results;
  }

  /**
   * Télécharge une image compressée
   */
  async downloadImage(image: Image): Promise<string> {
    if (!image.isCompleted() || !image.data.outputPath) {
      throw new Error("Image n'est pas prête pour téléchargement");
    }

    return this.tauriCommands.saveToDownloads(image.data.outputPath);
  }

  /**
   * Télécharge toutes les images compressées
   */
  async downloadAllImages(images: Image[]): Promise<string[]> {
    const completedImages = images.filter(
      img => img.isCompleted() && (img.data as CompletedImage).outputPath
    );
    const filePaths = completedImages.map(img => (img.data as CompletedImage).outputPath!);

    if (filePaths.length === 0) {
      throw new Error('Aucune image prête pour téléchargement');
    }

    return this.tauriCommands.saveAllToDownloads(filePaths);
  }

  /**
   * Calcule les statistiques pour une collection d'images
   */
  calculateStats(images: Image[]): {
    totalCount: number;
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    totalSavings: number;
  } {
    const stats = {
      totalCount: images.length,
      pendingCount: 0,
      processingCount: 0,
      completedCount: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      totalSavings: 0,
    };

    for (const image of images) {
      stats.totalOriginalSize += image.originalSize;

      if (image.isPending()) {
        stats.pendingCount++;
      } else if (image.isProcessing()) {
        stats.processingCount++;
      } else if (image.isCompleted()) {
        stats.completedCount++;
        stats.totalCompressedSize += image.data.compressedSize;
      }
    }

    if (stats.totalOriginalSize > 0) {
      stats.totalSavings = Math.round(
        ((stats.totalOriginalSize - stats.totalCompressedSize) / stats.totalOriginalSize) * 100
      );
    }

    return stats;
  }

  private getEstimationForFormat(format: string, settings: CompressionSettings) {
    const formatLower = format.toLowerCase();

    if (settings.shouldConvertToWebP()) {
      if (formatLower === 'png') {
        return settings.lossyMode ? { percent: 98, ratio: 0.02 } : { percent: 43, ratio: 0.57 };
      } else if (['jpg', 'jpeg'].includes(formatLower)) {
        return { percent: 45, ratio: 0.55 };
      }
      return { percent: 20, ratio: 0.8 }; // WebP -> WebP
    } else {
      // Keep original format
      if (formatLower === 'png') {
        return { percent: 15, ratio: 0.85 }; // PNG oxipng
      } else if (['jpg', 'jpeg'].includes(formatLower)) {
        return { percent: 25, ratio: 0.75 }; // JPEG optimization
      }
      return { percent: 10, ratio: 0.9 }; // WebP minimal
    }
  }
}
