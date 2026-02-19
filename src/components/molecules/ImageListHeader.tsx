import { ImageEntity } from '@/domain/image/entity';
import { useTranslation } from '@/hooks/useTranslation';
import { useImageStore } from '@/store/imageStore';
import { FC } from 'react';
import { Badge } from '../atoms';
import { CompressionControls } from './CompressionControls';

export const ImageListHeader: FC = () => {
  const { t } = useTranslation();

  // State
  const images = useImageStore(state => state.images);
  const compressionSettings = useImageStore(state => state.compressionSettings);
  const isProcessing = useImageStore(state => state.isProcessing);

  // Actions
  const setOutputFormat = useImageStore(state => state.setOutputFormat);
  const setCompressionLevel = useImageStore(state => state.setCompressionLevel);
  const startCompression = useImageStore(state => state.startCompression);
  const clearImages = useImageStore(state => state.clearImages);
  const downloadAllImages = useImageStore(state => state.downloadAllImages);

  // Computed
  const pendingImages = images.filter(img => img.isPending());
  const processingImages = images.filter(img => img.isProcessing());
  const completedImages = images.filter(img => img.isCompleted());

  const totalSize = images.reduce((sum, img) => sum + img.originalSize, 0);
  const formatFileSize = ImageEntity.formatFileSize;

  const getHeaderTitle = () => {
    if (processingImages.length > 0) return t('header.title.processing');
    if (pendingImages.length > 0) return t('header.title.pending');
    return t('header.title.completed');
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      <div className="flex flex-col justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{getHeaderTitle()}</h2>
        <div className="flex gap-4 text-sm text-slate-600">
          <div className="flex flex-col">
            <span className="mb-2">
              {images.length} image{images.length > 1 ? 's' : ''} : {formatFileSize(totalSize)}
            </span>
            {pendingImages.length > 0 && (
              <Badge color="yellow">
                {pendingImages.length} {t('compression.pending')}
              </Badge>
            )}
            {processingImages.length > 0 && (
              <Badge color="blue">
                {processingImages.length} {t('compression.processing')}
              </Badge>
            )}
            {completedImages.length > 0 && (
              <Badge color="green">
                {completedImages.length} {t('compression.completed')}
              </Badge>
            )}
          </div>

          {pendingImages.length > 0 && (
            <CompressionControls
              images={images}
              pendingImages={pendingImages}
              completedImages={completedImages}
              isProcessing={isProcessing}
              outputFormat={compressionSettings.outputFormat}
              compressionLevel={compressionSettings.compressionLevel}
              onOutputFormatChange={setOutputFormat}
              onCompressionLevelChange={setCompressionLevel}
              onStartCompression={startCompression}
              onClearImages={clearImages}
              onDownloadAllImages={downloadAllImages}
            />
          )}
        </div>
      </div>
    </div>
  );
};
