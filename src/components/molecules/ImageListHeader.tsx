import { FC } from 'react';
import { Badge } from '../atoms';
import { CompressionControls } from './CompressionControls';
import { ImageEntity } from '@/domain/image/entity';
import { useImageStore } from '@/store/imageStore';
import { useTranslation } from '@/hooks/useTranslation';

export const ImageListHeader: FC = () => {
  const { t } = useTranslation();
  
  // État du store
  const images = useImageStore(state => state.images);
  const compressionSettings = useImageStore(state => state.compressionSettings);
  const isProcessing = useImageStore(state => state.isProcessing);

  // Actions du store
  const toggleWebPConversion = useImageStore(state => state.toggleWebPConversion);
  const toggleLossyMode = useImageStore(state => state.toggleLossyMode);
  const startCompression = useImageStore(state => state.startCompression);
  const clearImages = useImageStore(state => state.clearImages);
  const downloadAllImages = useImageStore(state => state.downloadAllImages);

  // Calculs locaux
  const pendingImages = images.filter(img => img.isPending());
  const processingImages = images.filter(img => img.isProcessing());
  const completedImages = images.filter(img => img.isCompleted());

  const convertToWebP = !compressionSettings.keepOriginalFormat;
  const lossyMode = compressionSettings.quality < 90;

  const imageData = images.map(img => img.data);
  const hasPNG = ImageEntity.hasPNG(imageData);
  const hasWebP = ImageEntity.hasWebP(imageData);

  const totalSize = images.reduce((sum, img) => sum + img.originalSize, 0);
  const formatFileSize = ImageEntity.formatFileSize;
  
  // Fonction pour déterminer le titre selon l'état
  const getHeaderTitle = () => {
    if (processingImages.length > 0) {
      return t('header.title.processing');
    }
    if (pendingImages.length > 0) {
      return t('header.title.pending');
    }
    return t('header.title.completed');
  };
  
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {getHeaderTitle()}
          </h2>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <span>
              {images.length} image{images.length > 1 ? 's' : ''}
            </span>
            <span>{formatFileSize(totalSize)} {t('header.totalSize')}</span>
            {pendingImages.length > 0 && (
              <Badge color="yellow">{pendingImages.length} {t('compression.pending')}</Badge>
            )}
            {processingImages.length > 0 && (
              <Badge color="blue">{processingImages.length} {t('compression.processing')}</Badge>
            )}
            {completedImages.length > 0 && (
              <Badge color="green">{completedImages.length} {t('compression.completed')}</Badge>
            )}
          </div>
        </div>

        {/* Controls - Seulement si on a des images pending */}
        {pendingImages.length > 0 && (
          <CompressionControls
            images={images}
            pendingImages={pendingImages}
            completedImages={completedImages}
            processingImages={processingImages}
            isProcessing={isProcessing}
            convertToWebP={convertToWebP}
            lossyMode={lossyMode}
            hasPNG={hasPNG}
            hasWebP={hasWebP}
            onToggleWebPConversion={toggleWebPConversion}
            onToggleLossyMode={toggleLossyMode}
            onStartCompression={startCompression}
            onClearImages={clearImages}
            onDownloadAllImages={downloadAllImages}
          />
        )}
      </div>
    </div>
  );
};
