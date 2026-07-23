import { describe, it, expect } from 'vitest';
import { summarizeBatch } from '../batch';
import { ImageEntity } from '../entity';
import type { ImageType } from '../schema';

function makeImage(overrides: Partial<ImageType> = {}): ImageEntity {
  return ImageEntity.fromData({
    id: 'img-1',
    name: 'photo.png',
    originalSize: 1000,
    format: 'PNG',
    preview: 'blob:preview',
    path: '/tmp/photo.png',
    status: 'pending',
    ...overrides,
  });
}

function estimation(percent: number) {
  return { percent, ratio: 1 - percent / 100, confidence: 0.9, sample_count: 10 };
}

describe('summarizeBatch', () => {
  it('returns neutral figures for an empty batch', () => {
    expect(summarizeBatch([])).toEqual({
      isRealized: false,
      totalOriginal: 0,
      totalAfter: 0,
      saved: 0,
      percent: 0,
      formats: [],
    });
  });

  describe('projection — nothing compressed yet', () => {
    it('applies each image estimation to its own size', () => {
      const summary = summarizeBatch([
        makeImage({ id: 'a', originalSize: 1000, estimatedCompression: estimation(50) }),
        makeImage({ id: 'b', originalSize: 2000, estimatedCompression: estimation(25) }),
      ]);

      expect(summary.isRealized).toBe(false);
      expect(summary.totalOriginal).toBe(3000);
      expect(summary.totalAfter).toBe(500 + 1500);
      expect(summary.saved).toBe(1000);
      expect(summary.percent).toBe(33);
    });

    it('ignores pending images that have no estimation yet', () => {
      const summary = summarizeBatch([
        makeImage({ id: 'a', originalSize: 1000, estimatedCompression: estimation(50) }),
        makeImage({ id: 'b', originalSize: 9000 }),
      ]);

      expect(summary.totalOriginal).toBe(1000);
      expect(summary.totalAfter).toBe(500);
    });
  });

  describe('measured — every image is done', () => {
    it('sums the real compressed sizes', () => {
      const summary = summarizeBatch([
        makeImage({ id: 'a', status: 'completed', originalSize: 1000, compressedSize: 400 }),
        makeImage({ id: 'b', status: 'completed', originalSize: 1000, compressedSize: 600 }),
      ]);

      expect(summary.isRealized).toBe(true);
      expect(summary.totalOriginal).toBe(2000);
      expect(summary.totalAfter).toBe(1000);
      expect(summary.saved).toBe(1000);
      expect(summary.percent).toBe(50);
    });

    it('never reports a negative saving when the batch grew', () => {
      const summary = summarizeBatch([
        makeImage({ id: 'a', status: 'completed', originalSize: 100, compressedSize: 300 }),
      ]);

      expect(summary.saved).toBe(0);
      expect(summary.percent).toBe(0);
    });
  });

  it('stays on the projection as long as one image is still pending', () => {
    const summary = summarizeBatch([
      makeImage({ id: 'a', status: 'completed', originalSize: 1000, compressedSize: 400 }),
      makeImage({ id: 'b', originalSize: 2000, estimatedCompression: estimation(50) }),
    ]);

    expect(summary.isRealized).toBe(false);
    expect(summary.totalOriginal).toBe(2000);
    expect(summary.totalAfter).toBe(1000);
  });

  // Known gap, tracked in ROADMAP.md: an image being compressed is neither
  // pending nor completed, so its size leaves the totals until it finishes.
  it('drops in-flight images out of the totals', () => {
    const summary = summarizeBatch([
      makeImage({ id: 'a', status: 'completed', originalSize: 1000, compressedSize: 400 }),
      makeImage({ id: 'b', status: 'processing', originalSize: 5000, progress: 40 }),
    ]);

    expect(summary.isRealized).toBe(true);
    expect(summary.totalOriginal).toBe(1000);
  });

  describe('formats', () => {
    it('lists every distinct format in the batch, whatever the status', () => {
      const summary = summarizeBatch([
        makeImage({ id: 'a', format: 'PNG' }),
        makeImage({ id: 'b', format: 'JPEG', status: 'error' }),
        makeImage({ id: 'c', format: 'PNG', status: 'processing' }),
      ]);

      expect(summary.formats).toEqual(['PNG', 'JPEG']);
    });
  });
});
