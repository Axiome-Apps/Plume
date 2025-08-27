import { CompressionSettings as ICompressionSettings, OutputFormat } from "../schemas/compressionSchemas";

/**
 * Entité CompressionSettings - Encapsule la logique des paramètres de compression
 */
export class CompressionSettings {
  constructor(private settings: ICompressionSettings) {}

  static createDefault(): CompressionSettings {
    return new CompressionSettings({
      keepOriginalFormat: false,
      lossyMode: true,
      quality: 80,
      outputFormat: 'webp',
    });
  }

  static fromPartial(partial: Partial<ICompressionSettings>): CompressionSettings {
    const defaultSettings = CompressionSettings.createDefault();
    return new CompressionSettings({
      ...defaultSettings.settings,
      ...partial,
    });
  }

  // Getters
  get keepOriginalFormat(): boolean {
    return this.settings.keepOriginalFormat;
  }

  get lossyMode(): boolean {
    return this.settings.lossyMode;
  }

  get quality(): number {
    return this.settings.quality;
  }

  get outputFormat(): OutputFormat {
    return this.settings.outputFormat;
  }

  get convertToWebP(): boolean {
    return !this.settings.keepOriginalFormat;
  }

  get data(): ICompressionSettings {
    return { ...this.settings };
  }

  // Méthodes de transformation
  withKeepOriginalFormat(keep: boolean): CompressionSettings {
    return new CompressionSettings({
      ...this.settings,
      keepOriginalFormat: keep,
    });
  }

  withLossyMode(lossy: boolean): CompressionSettings {
    return new CompressionSettings({
      ...this.settings,
      lossyMode: lossy,
    });
  }

  withQuality(quality: number): CompressionSettings {
    const clampedQuality = Math.max(1, Math.min(100, quality));
    return new CompressionSettings({
      ...this.settings,
      quality: clampedQuality,
    });
  }

  withOutputFormat(format: OutputFormat): CompressionSettings {
    return new CompressionSettings({
      ...this.settings,
      outputFormat: format,
    });
  }

  // Méthodes utilitaires
  shouldConvertToWebP(): boolean {
    return !this.settings.keepOriginalFormat;
  }

  getQualityForFormat(originalFormat: string): number {
    const format = originalFormat.toLowerCase();
    
    if (this.shouldConvertToWebP()) {
      return this.settings.lossyMode ? this.settings.quality : 100;
    } else if (format === 'png') {
      return 100; // PNG is lossless
    } else {
      return this.settings.quality;
    }
  }

  getOutputFormatForImage(originalFormat: string): OutputFormat {
    if (this.shouldConvertToWebP()) {
      return 'webp';
    }
    
    const format = originalFormat.toLowerCase();
    switch (format) {
      case 'png': return 'png';
      case 'webp': return 'webp';
      case 'jpg':
      case 'jpeg': return 'jpeg';
      default: return 'auto';
    }
  }

  // Validation des paramètres
  isValid(): boolean {
    return (
      this.settings.quality >= 1 && 
      this.settings.quality <= 100 &&
      ['png', 'jpeg', 'webp', 'auto'].includes(this.settings.outputFormat)
    );
  }

  // Comparaison
  equals(other: CompressionSettings): boolean {
    return (
      this.settings.keepOriginalFormat === other.settings.keepOriginalFormat &&
      this.settings.lossyMode === other.settings.lossyMode &&
      this.settings.quality === other.settings.quality &&
      this.settings.outputFormat === other.settings.outputFormat
    );
  }

  // Sérialisation
  toJSON(): ICompressionSettings {
    return { ...this.settings };
  }

  toString(): string {
    const format = this.shouldConvertToWebP() ? 'WebP' : 'Original';
    const quality = this.settings.lossyMode ? 'Lossy' : 'Lossless';
    return `${format} - ${quality} (${this.settings.quality}%)`;
  }
}