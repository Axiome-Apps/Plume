import { describe, it, expect } from 'vitest';
import { resolveCompressionParams } from '../schema';

describe('resolveCompressionParams', () => {
  describe('explicit webp output', () => {
    it('stays lossless on the light level', () => {
      expect(resolveCompressionParams('webp', 'light', 'PNG')).toEqual({
        quality: 100,
        format: 'webp',
        lossy: false,
      });
    });

    it('turns lossy from the balanced level on', () => {
      expect(resolveCompressionParams('webp', 'balanced', 'PNG')).toEqual({
        quality: 80,
        format: 'webp',
        lossy: true,
      });
      expect(resolveCompressionParams('webp', 'aggressive', 'PNG')).toEqual({
        quality: 60,
        format: 'webp',
        lossy: true,
      });
    });
  });

  describe('explicit jpeg output', () => {
    it('is always lossy and uses the mozjpeg quality scale', () => {
      expect(resolveCompressionParams('jpeg', 'light', 'PNG')).toEqual({
        quality: 92,
        format: 'jpeg',
        lossy: true,
      });
      expect(resolveCompressionParams('jpeg', 'aggressive', 'PNG')).toEqual({
        quality: 60,
        format: 'jpeg',
        lossy: true,
      });
    });
  });

  describe('explicit png output', () => {
    it('ignores the level entirely — oxipng is always lossless', () => {
      const expected = { quality: 100, format: 'png', lossy: false };
      expect(resolveCompressionParams('png', 'light', 'JPEG')).toEqual(expected);
      expect(resolveCompressionParams('png', 'balanced', 'JPEG')).toEqual(expected);
      expect(resolveCompressionParams('png', 'aggressive', 'JPEG')).toEqual(expected);
    });
  });

  describe('keep — format decided from the source', () => {
    it('redirects HEIC to jpeg, since HEIC cannot be written back', () => {
      expect(resolveCompressionParams('keep', 'balanced', 'HEIC')).toEqual({
        quality: 80,
        format: 'jpeg',
        lossy: true,
      });
    });

    it('mirrors the webp rules when the source is webp', () => {
      expect(resolveCompressionParams('keep', 'light', 'WEBP')).toEqual({
        quality: 100,
        format: 'auto',
        lossy: false,
      });
      expect(resolveCompressionParams('keep', 'aggressive', 'WEBP')).toEqual({
        quality: 60,
        format: 'auto',
        lossy: true,
      });
    });

    it('mirrors the jpeg rules when the source is jpeg', () => {
      expect(resolveCompressionParams('keep', 'light', 'JPEG')).toEqual({
        quality: 92,
        format: 'auto',
        lossy: true,
      });
    });

    it('falls back to lossless for png sources whatever the level', () => {
      expect(resolveCompressionParams('keep', 'aggressive', 'PNG')).toEqual({
        quality: 100,
        format: 'auto',
        lossy: false,
      });
    });
  });
});
