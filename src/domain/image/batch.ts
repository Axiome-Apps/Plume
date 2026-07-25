import { Image } from './entity';

/**
 * Aggregate figures for the current batch.
 *
 * Every image that has a basis to be counted contributes, whatever its status:
 * a finished one contributes its measured size, one still waiting or being
 * compressed contributes its projection. So the totals cover the whole batch
 * from start to finish instead of shrinking while a file is in flight.
 *
 * `isRealized` says whether every counted figure is measured rather than
 * projected — it is what tells the UI to stop calling the number an estimate.
 */
export interface BatchSummary {
  isRealized: boolean;
  totalOriginal: number;
  totalAfter: number;
  saved: number;
  percent: number;
  formats: string[];
}

interface Contribution {
  original: number;
  after: number;
  realized: boolean;
}

/**
 * What a single image adds to the totals, or null when there is no basis to
 * count it — an image that failed, or one whose estimation has not come back
 * yet. Neither can be turned into a size, and guessing one would report a
 * saving that will never happen.
 */
function contributionOf(image: Image): Contribution | null {
  if (Image.isCompleted(image) && image.compressedSize !== undefined) {
    return { original: image.originalSize, after: image.compressedSize, realized: true };
  }

  const estimation = image.estimatedCompression;
  if (estimation && (Image.isPending(image) || Image.isProcessing(image))) {
    return {
      original: image.originalSize,
      after: image.originalSize * (1 - estimation.percent / 100),
      realized: false,
    };
  }

  return null;
}

export function summarizeBatch(images: Image[]): BatchSummary {
  const counted = images
    .map(contributionOf)
    .filter((contribution): contribution is Contribution => contribution !== null);

  const totalOriginal = counted.reduce((sum, contribution) => sum + contribution.original, 0);
  const totalAfter = counted.reduce((sum, contribution) => sum + contribution.after, 0);

  const saved = Math.max(0, totalOriginal - totalAfter);
  const percent = totalOriginal > 0 ? Math.round((saved / totalOriginal) * 100) : 0;

  const isRealized = counted.length > 0 && counted.every(contribution => contribution.realized);

  const formats = Array.from(new Set(images.map(image => image.format)));

  return { isRealized, totalOriginal, totalAfter, saved, percent, formats };
}
