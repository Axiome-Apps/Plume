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

  describe('mid-run — measured and projected figures side by side', () => {
    it('counts a finished image from its result and a waiting one from its estimation', () => {
      const summary = summarizeBatch([
        makeImage({ id: 'a', status: 'completed', originalSize: 1000, compressedSize: 400 }),
        makeImage({ id: 'b', originalSize: 2000, estimatedCompression: estimation(50) }),
      ]);

      expect(summary.isRealized).toBe(false);
      expect(summary.totalOriginal).toBe(3000);
      expect(summary.totalAfter).toBe(400 + 1000);
    });

    it('keeps an in-flight image in the totals instead of dropping it', () => {
      const summary = summarizeBatch([
        makeImage({ id: 'a', status: 'completed', originalSize: 1000, compressedSize: 400 }),
        makeImage({
          id: 'b',
          status: 'processing',
          originalSize: 5000,
          progress: 40,
          estimatedCompression: estimation(50),
        }),
      ]);

      expect(summary.totalOriginal).toBe(6000);
      expect(summary.totalAfter).toBe(400 + 2500);
    });

    it('holds the original total steady as an image moves through the pipeline', () => {
      const waiting = makeImage({
        id: 'b',
        originalSize: 5000,
        estimatedCompression: estimation(50),
      });
      const done = makeImage({
        id: 'a',
        status: 'completed',
        originalSize: 1000,
        compressedSize: 400,
      });

      const beforeStart = summarizeBatch([done, waiting]).totalOriginal;
      const inFlight = summarizeBatch([done, waiting.toProcessing()]).totalOriginal;
      const finished = summarizeBatch([
        done,
        waiting.toProcessing().toCompleted(2000),
      ]).totalOriginal;

      expect([beforeStart, inFlight, finished]).toEqual([6000, 6000, 6000]);
    });

    it('is not realized while an image is still being compressed', () => {
      const summary = summarizeBatch([
        makeImage({ id: 'a', status: 'completed', originalSize: 1000, compressedSize: 400 }),
        makeImage({
          id: 'b',
          status: 'processing',
          originalSize: 1000,
          estimatedCompression: estimation(50),
        }),
      ]);

      expect(summary.isRealized).toBe(false);
    });
  });

  it('leaves a failed image out — it will never produce a saving', () => {
    const summary = summarizeBatch([
      makeImage({ id: 'a', status: 'completed', originalSize: 1000, compressedSize: 400 }),
      makeImage({
        id: 'b',
        status: 'error',
        originalSize: 9000,
        estimatedCompression: estimation(50),
      }),
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
