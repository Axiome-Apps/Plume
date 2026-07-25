import { describe, it, expect } from 'vitest';
import { Image } from '../entity';
import type { ImageType } from '../schema';

function makeImage(overrides: Partial<ImageType> = {}): Image {
  return {
    id: 'img-1',
    name: 'photo.png',
    originalSize: 1000,
    format: 'PNG',
    preview: 'blob:preview',
    path: '/tmp/photo.png',
    status: 'pending',
    ...overrides,
  };
}

describe('Image', () => {
  describe('toProcessing', () => {
    it('moves a pending image to processing with a zero progress by default', () => {
      const processing = Image.toProcessing(makeImage());

      expect(processing.status).toBe('processing');
      expect(processing.progress).toBe(0);
    });

    it('leaves the source value untouched', () => {
      const pending = makeImage();
      Image.toProcessing(pending);

      expect(pending.status).toBe('pending');
    });

    it('refuses any status other than pending', () => {
      expect(() => Image.toProcessing(makeImage({ status: 'processing' }))).toThrow(
        'Cannot transition from processing to processing'
      );
      expect(() => Image.toProcessing(makeImage({ status: 'completed' }))).toThrow();
      expect(() => Image.toProcessing(makeImage({ status: 'error' }))).toThrow();
    });
  });

  describe('updateProgress', () => {
    it('clamps the value into 0..100', () => {
      const processing = Image.toProcessing(makeImage());

      expect(Image.updateProgress(processing, -10).progress).toBe(0);
      expect(Image.updateProgress(processing, 150).progress).toBe(100);
      expect(Image.updateProgress(processing, 42).progress).toBe(42);
    });

    it('refuses an image that is not being processed', () => {
      expect(() => Image.updateProgress(makeImage(), 50)).toThrow(
        'Cannot update progress on pending image'
      );
    });
  });

  describe('toCompleted', () => {
    it('derives the savings percentage from the original size', () => {
      const completed = Image.toCompleted(
        Image.toProcessing(makeImage({ originalSize: 1000 })),
        250
      );

      expect(completed.status).toBe('completed');
      expect(completed.compressedSize).toBe(250);
      expect(completed.savings).toBe(75);
    });

    it('reports zero savings rather than a negative one when the file grew', () => {
      const completed = Image.toCompleted(
        Image.toProcessing(makeImage({ originalSize: 1000 })),
        1500
      );

      expect(completed.savings).toBe(0);
    });

    it('clears the progress and records the output path', () => {
      const completed = Image.toCompleted(
        Image.toProcessing(makeImage()),
        500,
        '/tmp/photo_balanced.webp'
      );

      expect(completed.progress).toBeUndefined();
      expect(completed.outputPath).toBe('/tmp/photo_balanced.webp');
    });

    it('refuses an image that was never put in processing', () => {
      expect(() => Image.toCompleted(makeImage(), 500)).toThrow(
        'Cannot transition from pending to completed'
      );
    });
  });

  describe('toError', () => {
    it('wipes every result field, from any status', () => {
      const failed = Image.toError(
        Image.toCompleted(Image.toProcessing(makeImage()), 500, '/tmp/out.webp')
      );

      expect(failed.status).toBe('error');
      expect(failed.progress).toBeUndefined();
      expect(failed.compressedSize).toBeUndefined();
      expect(failed.savings).toBeUndefined();
      expect(failed.outputPath).toBeUndefined();
    });
  });

  describe('withEstimation', () => {
    it('replaces the estimation and leaves everything else alone', () => {
      const estimation = { percent: 40, ratio: 0.6, confidence: 0.8, sample_count: 12 };
      const image = makeImage({ status: 'processing', progress: 30 });

      const estimated = Image.withEstimation(image, estimation);

      expect(estimated.estimatedCompression).toEqual(estimation);
      expect(estimated.status).toBe('processing');
      expect(estimated.progress).toBe(30);
      expect(image.estimatedCompression).toBeUndefined();
    });
  });

  describe('status guards', () => {
    it('reports exactly one status at a time', () => {
      const pending = makeImage();
      expect([
        Image.isPending(pending),
        Image.isProcessing(pending),
        Image.isCompleted(pending),
      ]).toEqual([true, false, false]);

      const processing = Image.toProcessing(pending);
      expect([
        Image.isPending(processing),
        Image.isProcessing(processing),
        Image.isCompleted(processing),
      ]).toEqual([false, true, false]);

      const completed = Image.toCompleted(processing, 100);
      expect([
        Image.isPending(completed),
        Image.isProcessing(completed),
        Image.isCompleted(completed),
      ]).toEqual([false, false, true]);
    });
  });
});
