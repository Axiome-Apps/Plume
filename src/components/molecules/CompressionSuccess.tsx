import { FC } from 'react';
import Button from '../atoms/Button';
import Stroke from '../brand/Stroke';
import { TrashIcon } from '../icons';
import { useImageStore } from '@/store/imageStore';
import { useTranslation } from '@/hooks/useTranslation';

export const CompressionSuccess: FC = () => {
  const images = useImageStore(state => state.images);
  const isProcessing = useImageStore(state => state.isProcessing);
  const clearImages = useImageStore(state => state.clearImages);

  const pendingImages = images.filter(img => img.isPending());
  const completedImages = images.filter(img => img.isCompleted());
  const { t } = useTranslation();
  const shouldShow = pendingImages.length === 0 && !isProcessing && completedImages.length > 0;
  if (!shouldShow) return null;
  return (
    <div className="bg-surface rounded-xl p-6 border border-rule text-center">
      <div className="mb-4 flex flex-col items-center">
        <h3 className="ax-heading text-fg mb-1">{t('success.title')}</h3>
        <Stroke width={36} color="var(--color-primary-light)" />
        <p className="ax-body text-fg-2 mt-3">{t('success.description')}</p>
      </div>
      <div className="flex justify-center">
        <Button variant="ghost" onClick={clearImages}>
          <TrashIcon size={16} />
          {t('success.startOver')}
        </Button>
      </div>
    </div>
  );
};
