import { FC } from 'react';
import { useImageStore } from '@/store/imageStore';
import { Image } from '@/domain/image/entity';
import { useTranslation } from '@/hooks/useTranslation';
import { ProgressBar } from '@/components/atoms/ProgressBar';

/**
 * Global batch progress: each image counts for 1/N. Visibility keys off the
 * per-image status (`some processing`), not the store's `isProcessing` flag,
 * which flips false before the last 85→100 animations finish. Errored images
 * count as resolved so the bar still reaches 100%. The eased step animation is
 * the ProgressBar atom's own width transition.
 */
export const BatchProgress: FC = () => {
  const { t } = useTranslation();
  const images = useImageStore(state => state.images);

  const total = images.length;
  const isRunning = images.some(img => Image.isProcessing(img));
  if (!isRunning || total === 0) return null;

  const resolved = images.filter(img => Image.isCompleted(img) || Image.isError(img)).length;
  const percent = (resolved / total) * 100;

  return (
    <div className="bg-surface border border-line rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="label text-fg-2">{t('batch.progress.label')}</span>
        <span className="caption text-fg-3">
          {t('batch.progress.count', { done: resolved, total })}
        </span>
      </div>
      <ProgressBar progress={percent} ariaLabel={t('batch.progress.label')} />
    </div>
  );
};
