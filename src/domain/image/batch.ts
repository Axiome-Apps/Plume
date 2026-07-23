import { ImageEntity } from './entity';

/**
 * Aggregate figures for the current batch.
 *
 * Before compression the totals are projections built from each image's
 * estimation; once every image is done they become the measured result. The
 * two cases never mix, so `isRealized` tells the UI which label to show.
 */
export interface BatchSummary {
  isRealized: boolean;
  totalOriginal: number;
  totalAfter: number;
  saved: number;
  percent: number;
  formats: string[];
}

export function summarizeBatch(images: ImageEntity[]): BatchSummary {
  const pending = images.filter(image => image.isPending() && image.estimatedCompression);
  const completed = images.filter(
    image => image.isCompleted() && image.compressedSize !== undefined
  );

  const isRealized = completed.length > 0 && pending.length === 0;
  const considered = isRealized ? completed : pending;

  const totalOriginal = considered.reduce((sum, image) => sum + image.originalSize, 0);

  const totalAfter = isRealized
    ? completed.reduce((sum, image) => sum + (image.compressedSize ?? 0), 0)
    : pending.reduce(
        (sum, image) =>
          sum + image.originalSize * (1 - (image.estimatedCompression?.percent ?? 0) / 100),
        0
      );

  const saved = Math.max(0, totalOriginal - totalAfter);
  const percent = totalOriginal > 0 ? Math.round((saved / totalOriginal) * 100) : 0;

  const formats = Array.from(new Set(images.map(image => image.format.toUpperCase())));

  return { isRealized, totalOriginal, totalAfter, saved, percent, formats };
}
