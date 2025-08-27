import { CompressionSettings } from '../CompressionSettings';

describe('CompressionSettings Entity', () => {
  describe('constructor', () => {
    it('should create compression settings with default values', () => {
      const settings = new CompressionSettings();

      expect(settings.quality).toBe(80);
      expect(settings.format).toBe('auto');
      expect(settings.lossless).toBe(false);
      expect(settings.preserveMetadata).toBe(false);
    });

    it('should create compression settings with custom values', () => {
      const settings = new CompressionSettings({
        quality: 90,
        format: 'WebP',
        lossless: true,
        preserveMetadata: true,
      });

      expect(settings.quality).toBe(90);
      expect(settings.format).toBe('WebP');
      expect(settings.lossless).toBe(true);
      expect(settings.preserveMetadata).toBe(true);
    });
  });

  describe('validation', () => {
    it('should clamp quality to valid range (1-100)', () => {
      const lowQuality = new CompressionSettings({ quality: -10 });
      const highQuality = new CompressionSettings({ quality: 150 });

      expect(lowQuality.quality).toBe(1);
      expect(highQuality.quality).toBe(100);
    });

    it('should accept valid quality values', () => {
      const minQuality = new CompressionSettings({ quality: 1 });
      const maxQuality = new CompressionSettings({ quality: 100 });
      const midQuality = new CompressionSettings({ quality: 75 });

      expect(minQuality.quality).toBe(1);
      expect(maxQuality.quality).toBe(100);
      expect(midQuality.quality).toBe(75);
    });
  });

  describe('isLossless', () => {
    it('should return true when lossless is explicitly true', () => {
      const settings = new CompressionSettings({ lossless: true });
      expect(settings.isLossless()).toBe(true);
    });

    it('should return true when format is PNG', () => {
      const settings = new CompressionSettings({ format: 'PNG' });
      expect(settings.isLossless()).toBe(true);
    });

    it('should return false for lossy formats', () => {
      const jpegSettings = new CompressionSettings({ format: 'JPEG' });
      const webpSettings = new CompressionSettings({ format: 'WebP', lossless: false });

      expect(jpegSettings.isLossless()).toBe(false);
      expect(webpSettings.isLossless()).toBe(false);
    });

    it('should prioritize explicit lossless setting over format', () => {
      const settings = new CompressionSettings({ format: 'WebP', lossless: true });
      expect(settings.isLossless()).toBe(true);
    });
  });

  describe('getOptimalFormat', () => {
    it('should return WebP for photos (JPEG input)', () => {
      const settings = new CompressionSettings();
      const format = settings.getOptimalFormat('photo.jpg');

      expect(format).toBe('WebP');
    });

    it('should return WebP for PNG with alpha', () => {
      const settings = new CompressionSettings();
      const format = settings.getOptimalFormat('transparent.png', true);

      expect(format).toBe('WebP');
    });

    it('should return PNG for graphics without alpha', () => {
      const settings = new CompressionSettings();
      const format = settings.getOptimalFormat('graphic.png', false);

      expect(format).toBe('PNG');
    });

    it('should return current format when not auto', () => {
      const settings = new CompressionSettings({ format: 'JPEG' });
      const format = settings.getOptimalFormat('test.png');

      expect(format).toBe('JPEG');
    });
  });

  describe('withQuality', () => {
    it('should create new instance with updated quality', () => {
      const original = new CompressionSettings({ quality: 80 });
      const updated = original.withQuality(90);

      expect(original.quality).toBe(80);
      expect(updated.quality).toBe(90);
      expect(original).not.toBe(updated);
    });

    it('should clamp quality in withQuality method', () => {
      const settings = new CompressionSettings();
      const updated = settings.withQuality(150);

      expect(updated.quality).toBe(100);
    });
  });

  describe('withFormat', () => {
    it('should create new instance with updated format', () => {
      const original = new CompressionSettings({ format: 'auto' });
      const updated = original.withFormat('WebP');

      expect(original.format).toBe('auto');
      expect(updated.format).toBe('WebP');
      expect(original).not.toBe(updated);
    });
  });

  describe('withLossless', () => {
    it('should create new instance with updated lossless setting', () => {
      const original = new CompressionSettings({ lossless: false });
      const updated = original.withLossless(true);

      expect(original.lossless).toBe(false);
      expect(updated.lossless).toBe(true);
      expect(original).not.toBe(updated);
    });
  });

  describe('toTauriOptions', () => {
    it('should convert to format expected by Tauri backend', () => {
      const settings = new CompressionSettings({
        quality: 85,
        format: 'WebP',
        lossless: true,
        preserveMetadata: true,
      });

      const tauriOptions = settings.toTauriOptions();

      expect(tauriOptions).toEqual({
        quality: 85,
        format: 'webp',
        lossless: true,
        preserve_metadata: true,
      });
    });

    it('should handle auto format correctly', () => {
      const settings = new CompressionSettings({ format: 'auto' });
      const tauriOptions = settings.toTauriOptions();

      expect(tauriOptions.format).toBe('auto');
    });

    it('should convert format names to lowercase', () => {
      const pngSettings = new CompressionSettings({ format: 'PNG' });
      const jpegSettings = new CompressionSettings({ format: 'JPEG' });

      expect(pngSettings.toTauriOptions().format).toBe('png');
      expect(jpegSettings.toTauriOptions().format).toBe('jpeg');
    });
  });

  describe('immutability', () => {
    it('should not mutate original when using with* methods', () => {
      const original = new CompressionSettings({
        quality: 80,
        format: 'WebP',
        lossless: false,
      });

      const modified = original
        .withQuality(90)
        .withFormat('PNG')
        .withLossless(true);

      // Original should remain unchanged
      expect(original.quality).toBe(80);
      expect(original.format).toBe('WebP');
      expect(original.lossless).toBe(false);

      // New instance should have updated values
      expect(modified.quality).toBe(90);
      expect(modified.format).toBe('PNG');
      expect(modified.lossless).toBe(true);
    });
  });
});