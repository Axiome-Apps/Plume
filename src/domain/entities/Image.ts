import {
  ImageData,
  PendingImage,
  ProcessingImage,
  CompletedImage,
  ImageStatus,
  CompressionEstimation,
  BaseImage,
} from '../schemas/imageSchemas';
import { CompressionSettings } from '../schemas/compressionSchemas';

/**
 * Entité Image - Encapsule la logique métier liée aux images
 */
export class Image {
  private constructor(private _data: ImageData) {}

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
    return this._data.id;
  }

  get name(): string {
    return this._data.name;
  }

  get status(): string {
    return this._data.status;
  }

  get format(): string {
    return this._data.format;
  }

  get originalSize(): number {
    return this._data.originalSize;
  }

  get data(): ImageData {
    return this._data;
  }

  // Méthodes de transition d'état
  toProcessing(progress: number = 0): Image {
    if (this._data.status !== ImageStatus.PENDING) {
      throw new Error(`Cannot transition from ${this._data.status} to processing`);
    }

    const processingImage: ProcessingImage = {
      id: this._data.id,
      name: this._data.name,
      originalSize: this._data.originalSize,
      format: this._data.format,
      preview: this._data.preview,
      path: this._data.path,
      status: ImageStatus.PROCESSING,
      progress,
    };

    return new Image(processingImage);
  }

  updateProgress(progress: number): Image {
    if (this._data.status !== ImageStatus.PROCESSING) {
      throw new Error(`Cannot update progress on ${this._data.status} image`);
    }

    const updatedImage: ProcessingImage = {
      ...(this._data as ProcessingImage),
      progress: Math.max(0, Math.min(100, progress)),
    };

    return new Image(updatedImage);
  }

  toCompleted(compressedSize: number, outputPath?: string): Image {
    if (this._data.status !== ImageStatus.PROCESSING) {
      throw new Error(`Cannot transition from ${this._data.status} to completed`);
    }

    const savings = Math.round(
      ((this._data.originalSize - compressedSize) / this._data.originalSize) * 100
    );

    const completedImage: CompletedImage = {
      id: this._data.id,
      name: this._data.name,
      originalSize: this._data.originalSize,
      format: this._data.format,
      preview: this._data.preview,
      path: this._data.path,
      status: ImageStatus.COMPLETED,
      compressedSize,
      savings: Math.max(0, savings),
      outputPath,
    };

    return new Image(completedImage);
  }

  // Méthodes utilitaires
  isPending(): this is Image & { data: PendingImage } {
    return this._data.status === ImageStatus.PENDING;
  }

  isProcessing(): this is Image & { data: ProcessingImage } {
    return this._data.status === ImageStatus.PROCESSING;
  }

  isCompleted(): this is Image & { data: CompletedImage } {
    return this._data.status === ImageStatus.COMPLETED;
  }

  getEstimatedCompressedSize(settings: CompressionSettings): number {
    if (!this.isPending()) {
      return this._data.originalSize;
    }

    const estimation = this.getCompressionEstimation(settings);
    return Math.round(this._data.originalSize * estimation.ratio);
  }

  private getCompressionEstimation(settings: CompressionSettings): CompressionEstimation {
    const formatLower = this._data.format.toLowerCase();

    if (!settings.keepOriginalFormat) {
      // Convert to WebP
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

  // Méthode pour formater la taille de fichier
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFormattedOriginalSize(): string {
    return Image.formatFileSize(this._data.originalSize);
  }

  getFormattedCompressedSize(): string {
    if (this.isCompleted()) {
      return Image.formatFileSize((this._data as CompletedImage).compressedSize);
    }
    return 'N/A';
  }
}
