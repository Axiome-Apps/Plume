import { ImageType } from './schema';

/**
 * Image entity - encapsulates image-related business logic on top of the unified schema.
 */
export class ImageEntity {
  constructor(private _data: ImageType) {}

  // Factory methods
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

  /** Replace the estimation, leaving every other field untouched. */
  withEstimation(estimation: ImageType['estimatedCompression']): ImageEntity {
    return new ImageEntity({ ...this._data, estimatedCompression: estimation });
  }

  // State transition methods - each returns a new instance
  private withStatus(status: ImageType['status'], updates?: Partial<ImageType>): ImageEntity {
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
      progress: undefined, // Clear properties that no longer apply
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

  // Utility methods - type guards
  isPending(): boolean {
    return this._data.status === 'pending';
  }

  isProcessing(): boolean {
    return this._data.status === 'processing';
  }

  isCompleted(): boolean {
    return this._data.status === 'completed';
  }
}
