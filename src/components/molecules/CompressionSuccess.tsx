import { FC } from 'react';
import Button from '../atoms/Button';
import { TrashIcon, DownloadIcon } from '../icons';
import { useImageStore } from '@/store/imageStore';
import { useTranslation } from '@/hooks/useTranslation';

export const CompressionSuccess: FC = () => {
  const images = useImageStore(state => state.images);
  const isProcessing = useImageStore(state => state.isProcessing);
  const downloadAllImages = useImageStore(state => state.downloadAllImages);
  const clearImages = useImageStore(state => state.clearImages);

  const pendingImages = images.filter(img => img.isPending());
  const completedImages = images.filter(img => img.isCompleted());
  const { t } = useTranslation();
  // Ne pas afficher le composant si les conditions ne sont pas remplies
  const shouldShow = pendingImages.length === 0 && !isProcessing && completedImages.length > 0;
  if (!shouldShow) return null;
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">🎉 {t('success.title')}</h3>
        <p className="text-slate-600">{t('success.description')}</p>
      </div>
      <div className="flex justify-center gap-3">
        <Button onClick={downloadAllImages} color="green">
          <DownloadIcon size={16} className="mr-2" />
          {t('success.download')} ({completedImages.length})
        </Button>

        <Button variant="outlined" color="slate" onClick={clearImages}>
          <TrashIcon size={16} className="mr-2" />
          {t('success.startOver')}
        </Button>
      </div>
    </div>
  );
};
