import { CompressionSettings } from '../CompressionSettings';

describe('CompressionSettings', () => {
  describe('createDefault', () => {
    it('creates default settings with correct values', () => {
      const settings = CompressionSettings.createDefault();
      
      expect(settings.quality).toBe(80);
      expect(settings.outputFormat).toBe('webp');
      expect(settings.convertToWebP).toBe(true);
      expect(settings.lossyMode).toBe(true);
    });
  });

  describe('withQuality', () => {
    it('updates quality value', () => {
      const settings = CompressionSettings.createDefault();
      const updated = settings.withQuality(95);
      
      expect(updated.quality).toBe(95);
      expect(updated).not.toBe(settings); // Should be immutable
    });

    it('clamps quality to valid range', () => {
      const settings = CompressionSettings.createDefault();
      
      const lowUpdated = settings.withQuality(-10);
      expect(lowUpdated.quality).toBe(1);
      
      const highUpdated = settings.withQuality(120);
      expect(highUpdated.quality).toBe(100);
    });
  });

  describe('withLossyMode', () => {
    it('updates lossy mode setting', () => {
      const settings = CompressionSettings.createDefault();
      const updated = settings.withLossyMode(false);
      
      expect(updated.lossyMode).toBe(false);
      expect(updated).not.toBe(settings); // Should be immutable
    });
  });

  describe('withKeepOriginalFormat', () => {
    it('updates keep original format setting', () => {
      const settings = CompressionSettings.createDefault();
      const updated = settings.withKeepOriginalFormat(true);
      
      expect(updated.keepOriginalFormat).toBe(true);
      expect(updated.convertToWebP).toBe(false);
      expect(updated).not.toBe(settings); // Should be immutable
    });
  });

  describe('isValid', () => {
    it('returns true for valid settings', () => {
      const settings = CompressionSettings.createDefault();
      expect(settings.isValid()).toBe(true);
    });
  });

  describe('shouldConvertToWebP', () => {
    it('returns true when keepOriginalFormat is false', () => {
      const settings = CompressionSettings.createDefault();
      expect(settings.shouldConvertToWebP()).toBe(true);
    });

    it('returns false when keepOriginalFormat is true', () => {
      const settings = CompressionSettings.createDefault();
      const updated = settings.withKeepOriginalFormat(true);
      expect(updated.shouldConvertToWebP()).toBe(false);
    });
  });

  describe('getOutputFormatForImage', () => {
    it('returns webp when shouldConvertToWebP is true', () => {
      const settings = CompressionSettings.createDefault();
      expect(settings.getOutputFormatForImage('jpeg')).toBe('webp');
    });

    it('returns original format when keepOriginalFormat is true', () => {
      const settings = CompressionSettings.createDefault();
      const updated = settings.withKeepOriginalFormat(true);
      expect(updated.getOutputFormatForImage('png')).toBe('png');
      expect(updated.getOutputFormatForImage('jpeg')).toBe('jpeg');
    });
  });

  describe('equals', () => {
    it('returns true for identical settings', () => {
      const settings1 = CompressionSettings.createDefault();
      const settings2 = CompressionSettings.createDefault();
      expect(settings1.equals(settings2)).toBe(true);
    });

    it('returns false for different settings', () => {
      const settings1 = CompressionSettings.createDefault();
      const settings2 = settings1.withQuality(90);
      expect(settings1.equals(settings2)).toBe(false);
    });
  });
});