import { describe, it, expect } from 'vitest';
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

describe('ImageEntity', () => {
  describe('data access', () => {
    it('hands out a copy, so a caller cannot mutate the entity', () => {
      const image = makeImage();
      const snapshot = image.data;

      snapshot.name = 'mutated.png';

      expect(image.name).toBe('photo.png');
    });

    it('serializes to the same shape it was built from', () => {
      const image = makeImage();
      expect(image.toJSON()).toEqual(image.data);
    });
  });

  describe('toProcessing', () => {
    it('moves a pending image to processing with a zero progress by default', () => {
      const processing = makeImage().toProcessing();

      expect(processing.status).toBe('processing');
      expect(processing.progress).toBe(0);
    });

    it('leaves the source instance untouched', () => {
      const pending = makeImage();
      pending.toProcessing();

      expect(pending.status).toBe('pending');
    });

    it('refuses any status other than pending', () => {
      expect(() => makeImage({ status: 'processing' }).toProcessing()).toThrow(
        'Cannot transition from processing to processing'
      );
      expect(() => makeImage({ status: 'completed' }).toProcessing()).toThrow();
      expect(() => makeImage({ status: 'error' }).toProcessing()).toThrow();
    });
  });

  describe('updateProgress', () => {
    it('clamps the value into 0..100', () => {
      const processing = makeImage().toProcessing();

      expect(processing.updateProgress(-10).progress).toBe(0);
      expect(processing.updateProgress(150).progress).toBe(100);
      expect(processing.updateProgress(42).progress).toBe(42);
    });

    it('refuses an image that is not being processed', () => {
      expect(() => makeImage().updateProgress(50)).toThrow(
        'Cannot update progress on pending image'
      );
    });
  });

  describe('toCompleted', () => {
    it('derives the savings percentage from the original size', () => {
      const completed = makeImage({ originalSize: 1000 }).toProcessing().toCompleted(250);

      expect(completed.status).toBe('completed');
      expect(completed.compressedSize).toBe(250);
      expect(completed.savings).toBe(75);
    });

    it('reports zero savings rather than a negative one when the file grew', () => {
      const completed = makeImage({ originalSize: 1000 }).toProcessing().toCompleted(1500);

      expect(completed.savings).toBe(0);
    });

    it('clears the progress and records the output path', () => {
      const completed = makeImage().toProcessing().toCompleted(500, '/tmp/photo_balanced.webp');

      expect(completed.progress).toBeUndefined();
      expect(completed.outputPath).toBe('/tmp/photo_balanced.webp');
    });

    it('refuses an image that was never put in processing', () => {
      expect(() => makeImage().toCompleted(500)).toThrow(
        'Cannot transition from pending to completed'
      );
    });
  });

  describe('toError', () => {
    it('wipes every result field, from any status', () => {
      const failed = makeImage().toProcessing().toCompleted(500, '/tmp/out.webp').toError();

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

      const estimated = image.withEstimation(estimation);

      expect(estimated.estimatedCompression).toEqual(estimation);
      expect(estimated.status).toBe('processing');
      expect(estimated.progress).toBe(30);
      expect(image.estimatedCompression).toBeUndefined();
    });
  });

  describe('status guards', () => {
    it('reports exactly one status at a time', () => {
      const pending = makeImage();
      expect([pending.isPending(), pending.isProcessing(), pending.isCompleted()]).toEqual([
        true,
        false,
        false,
      ]);

      const processing = pending.toProcessing();
      expect([processing.isPending(), processing.isProcessing(), processing.isCompleted()]).toEqual(
        [false, true, false]
      );

      const completed = processing.toCompleted(100);
      expect([completed.isPending(), completed.isProcessing(), completed.isCompleted()]).toEqual([
        false,
        false,
        true,
      ]);
    });
  });
});
