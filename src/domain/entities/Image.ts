import { 
  ImageData, 
  PendingImage, 
  ProcessingImage, 
  CompletedImage,
  ImageStatus,
  CompressionEstimation,
  BaseImage
} from "../schemas/imageSchemas";
import { CompressionSettings } from "../schemas/compressionSchemas";

/**
 * Entité Image - Encapsule la logique métier liée aux images
 */
export class Image {
  private constructor(private data: ImageData) {}

  // Factory methods pour créer des images
  static createPending(
    baseData: Omit<BaseImage, 'id'>,
    estimatedCompression: CompressionEstimation
  ): Image {
    const pendingImage: PendingImage = {
      ...baseData,
      id: `${Date.now()}-${Math.random()}`,
      status: ImageStatus.PENDING,
      estimatedCompression,
    };
    return new Image(pendingImage);
  }

  static fromData(data: ImageData): Image {
    return new Image(data);
  }

  // Getters
  get id(): string {
    return this.data.id;
  }

  get name(): string {
    return this.data.name;
  }

  get status(): string {
    return this.data.status;
  }

  get format(): string {
    return this.data.format;
  }

  get originalSize(): number {
    return this.data.originalSize;
  }

  get data(): ImageData {
    return this.data;
  }

  // Méthodes de transition d'état
  toProcessing(progress: number = 0): Image {
    if (this.data.status !== ImageStatus.PENDING) {
      throw new Error(`Cannot transition from ${this.data.status} to processing`);
    }

    const processingImage: ProcessingImage = {
      id: this.data.id,
      name: this.data.name,
      originalSize: this.data.originalSize,
      format: this.data.format,
      preview: this.data.preview,
      path: this.data.path,
      status: ImageStatus.PROCESSING,
      progress,
    };

    return new Image(processingImage);
  }

  updateProgress(progress: number): Image {
    if (this.data.status !== ImageStatus.PROCESSING) {
      throw new Error(`Cannot update progress on ${this.data.status} image`);
    }

    const updatedImage: ProcessingImage = {
      ...this.data as ProcessingImage,
      progress: Math.max(0, Math.min(100, progress)),
    };

    return new Image(updatedImage);
  }

  toCompleted(compressedSize: number, outputPath?: string): Image {
    if (this.data.status !== ImageStatus.PROCESSING) {
      throw new Error(`Cannot transition from ${this.data.status} to completed`);
    }

    const savings = Math.round(
      ((this.data.originalSize - compressedSize) / this.data.originalSize) * 100
    );

    const completedImage: CompletedImage = {
      id: this.data.id,
      name: this.data.name,
      originalSize: this.data.originalSize,
      format: this.data.format,
      preview: this.data.preview,
      path: this.data.path,
      status: ImageStatus.COMPLETED,
      compressedSize,
      savings: Math.max(0, savings),
      outputPath,
    };

    return new Image(completedImage);
  }

  // Méthodes utilitaires
  isPending(): this is Image & { data: PendingImage } {
    return this.data.status === ImageStatus.PENDING;
  }

  isProcessing(): this is Image & { data: ProcessingImage } {
    return this.data.status === ImageStatus.PROCESSING;
  }

  isCompleted(): this is Image & { data: CompletedImage } {
    return this.data.status === ImageStatus.COMPLETED;
  }

  getEstimatedCompressedSize(settings: CompressionSettings): number {
    if (!this.isPending()) {
      return this.data.originalSize;
    }

    const estimation = this.getCompressionEstimation(settings);
    return Math.round(this.data.originalSize * estimation.ratio);
  }

  private getCompressionEstimation(settings: CompressionSettings): CompressionEstimation {
    const formatLower = this.data.format.toLowerCase();
    
    if (!settings.keepOriginalFormat) {
      // Convert to WebP
      if (formatLower === 'png') {
        return settings.lossyMode 
          ? { percent: 98, ratio: 0.02 } 
          : { percent: 43, ratio: 0.57 };
      } else if (['jpg', 'jpeg'].includes(formatLower)) {
        return { percent: 45, ratio: 0.55 };
      }
      return { percent: 20, ratio: 0.80 }; // WebP -> WebP
    } else {
      // Keep original format
      if (formatLower === 'png') {
        return { percent: 15, ratio: 0.85 }; // PNG oxipng
      } else if (['jpg', 'jpeg'].includes(formatLower)) {
        return { percent: 25, ratio: 0.75 }; // JPEG optimization
      }
      return { percent: 10, ratio: 0.90 }; // WebP minimal
    }
  }

  // Méthode pour formater la taille de fichier
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  getFormattedOriginalSize(): string {
    return Image.formatFileSize(this.data.originalSize);
  }

  getFormattedCompressedSize(): string {
    if (this.isCompleted()) {
      return Image.formatFileSize(this.data.compressedSize);
    }
    return "N/A";
  }
}