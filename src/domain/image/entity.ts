import { ImageType } from './schema';

/**
 * Entité Image - Encapsule la logique métier liée aux images avec le schema unifié
 */
export class ImageEntity {
  constructor(private _data: ImageType) {}

  // Factory methods
  static create(data: Omit<ImageType, 'id'>): ImageEntity {
    const image: ImageType = {
      ...data,
      id: `${Date.now()}-${Math.random()}`,
    };
    return new ImageEntity(image);
  }

  static fromData(data: ImageType): ImageEntity {
    return new ImageEntity(data);
  }

  // Getters
  get id(): string {
    return this._data.id;
  }

  get name(): string {
    return this._data.name;
  }

  get status(): ImageType['status'] {
    return this._data.status;
  }

  get format(): ImageType['format'] {
    return this._data.format;
  }

  get originalSize(): number {
    return this._data.originalSize;
  }

  get path(): string {
    return this._data.path;
  }

  get preview(): string {
    return this._data.preview;
  }

  get progress(): number | undefined {
    return this._data.progress;
  }

  get compressedSize(): number | undefined {
    return this._data.compressedSize;
  }

  get savings(): number | undefined {
    return this._data.savings;
  }

  get outputPath(): string | undefined {
    return this._data.outputPath;
  }

  get estimatedCompression(): ImageType['estimatedCompression'] {
    return this._data.estimatedCompression;
  }

  get data(): ImageType {
    return { ...this._data };
  }

  toJSON(): ImageType {
    return this.data;
  }

  // Méthodes de transition d'état - Retournent de nouvelles instances
  withStatus(status: ImageType['status'], updates?: Partial<ImageType>): ImageEntity {
    return new ImageEntity({
      ...this._data,
      status,
      ...updates,
    });
  }

  toProcessing(progress: number = 0): ImageEntity {
    if (this._data.status !== 'pending') {
      throw new Error(`Cannot transition from ${this._data.status} to processing`);
    }
    return this.withStatus('processing', { progress });
  }

  updateProgress(progress: number): ImageEntity {
    if (this._data.status !== 'processing') {
      throw new Error(`Cannot update progress on ${this._data.status} image`);
    }
    return this.withStatus('processing', {
      progress: Math.max(0, Math.min(100, progress)),
    });
  }

  toCompleted(compressedSize: number, outputPath?: string): ImageEntity {
    if (this._data.status !== 'processing') {
      throw new Error(`Cannot transition from ${this._data.status} to completed`);
    }

    const savings = Math.round(
      ((this._data.originalSize - compressedSize) / this._data.originalSize) * 100
    );

    return this.withStatus('completed', {
      compressedSize,
      savings: Math.max(0, savings),
      outputPath,
      progress: undefined, // Nettoyer les propriétés non pertinentes
    });
  }

  toError(): ImageEntity {
    return this.withStatus('error', {
      progress: undefined,
      compressedSize: undefined,
      savings: undefined,
      outputPath: undefined,
    });
  }

  // Méthodes utilitaires - Type guards
  isPending(): boolean {
    return this._data.status === 'pending';
  }

  isProcessing(): boolean {
    return this._data.status === 'processing';
  }

  isCompleted(): boolean {
    return this._data.status === 'completed';
  }

  isError(): boolean {
    return this._data.status === 'error';
  }

  hasEstimation(): boolean {
    return this._data.estimatedCompression !== undefined;
  }

  getEstimatedCompression() {
    return this._data.estimatedCompression;
  }

  getEstimatedSavings(): string {
    if (this._data.estimatedCompression) {
      return `${this._data.estimatedCompression.percent.toFixed(1)}%`;
    }
    return 'N/A';
  }

  getEstimatedConfidence(): string {
    if (this._data.estimatedCompression) {
      const confidence = this._data.estimatedCompression.confidence * 100;
      return `${confidence.toFixed(1)}%`;
    }
    return 'N/A';
  }

  hasProgress(): boolean {
    return this._data.progress !== undefined;
  }

  hasCompressedData(): boolean {
    return this._data.compressedSize !== undefined && this._data.savings !== undefined;
  }

  // Méthodes de format
  isPNG(): boolean {
    return this._data.format.toUpperCase() === 'PNG';
  }

  isJPEG(): boolean {
    return this._data.format.toUpperCase() === 'JPEG';
  }

  isWebP(): boolean {
    return this._data.format.toUpperCase() === 'WEBP';
  }

  getFormatLowerCase(): string {
    return this._data.format.toLowerCase();
  }

  getFormatUpperCase(): string {
    return this._data.format.toUpperCase();
  }

  // Méthodes statiques pour collections
  static hasFormat(images: ImageType[], format: 'PNG' | 'JPEG' | 'WEBP'): boolean {
    return images.some(img => ImageEntity.fromData(img).getFormatUpperCase() === format);
  }

  static hasPNG(images: ImageType[]): boolean {
    return ImageEntity.hasFormat(images, 'PNG');
  }

  static hasWebP(images: ImageType[]): boolean {
    return ImageEntity.hasFormat(images, 'WEBP');
  }

  static hasJPEG(images: ImageType[]): boolean {
    return ImageEntity.hasFormat(images, 'JPEG');
  }

  // Méthodes de formatage
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFormattedOriginalSize(): string {
    return ImageEntity.formatFileSize(this._data.originalSize);
  }

  getFormattedCompressedSize(): string {
    if (this._data.compressedSize) {
      return ImageEntity.formatFileSize(this._data.compressedSize);
    }
    return 'N/A';
  }

  getFormattedSavings(): string {
    if (this._data.savings !== undefined) {
      return `${this._data.savings.toFixed(1)}%`;
    }
    return 'N/A';
  }
}
