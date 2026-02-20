import { ImageEntity } from '@/domain/image/entity';
import { useTranslation } from '@/hooks/useTranslation';
import { useImageStore } from '@/store/imageStore';
import { FC } from 'react';
import { Badge } from '../atoms';
import Button from '../atoms/Button';
import { DownloadIcon, FeatherIcon, TrashIcon } from '../icons';
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
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-secondary/20 space-y-3">
      {/* Line 1 - Info: title + stats + action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-primary">{getHeaderTitle()}</h2>
          <span className="text-sm text-text/50">
            {images.length} image{images.length > 1 ? 's' : ''} · {formatFileSize(totalSize)}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {pendingImages.length > 0 && (
              <Badge color="warning">
                {pendingImages.length} {t('compression.pending')}
              </Badge>
            )}
            {processingImages.length > 0 && (
              <Badge color="primary">
                {processingImages.length} {t('compression.processing')}
              </Badge>
            )}
            {completedImages.length > 0 && (
              <Badge color="success">
                {completedImages.length} {t('compression.completed')}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {images.length > 1 && (
            <Button variant="outlined" color="error" onClick={clearImages} disabled={isProcessing}>
              <TrashIcon size={16} />
            </Button>
          )}
          {pendingImages.length > 0 && images.length > 1 && (
            <Button
              variant="filled"
              color="primary"
              onClick={startCompression}
              disabled={isProcessing || pendingImages.length === 0}
            >
              <FeatherIcon size={16} className="mr-2" />
              {isProcessing ? t('header.compression.active') : t('header.compression.pending')}
            </Button>
          )}
          {completedImages.length > 0 && images.length > 1 && (
            <Button variant="filled" color="success" onClick={downloadAllImages}>
              <DownloadIcon size={16} className="mr-2" />
              {t('header.downloadAll')} ({completedImages.length})
            </Button>
          )}
        </div>
      </div>

      {/* Lines 2 & 3 - Format + Compression controls */}
      {pendingImages.length > 0 && (
        <CompressionControls
          images={images}
          isProcessing={isProcessing}
          outputFormat={compressionSettings.outputFormat}
          compressionLevel={compressionSettings.compressionLevel}
          onOutputFormatChange={setOutputFormat}
          onCompressionLevelChange={setCompressionLevel}
        />
      )}
    </div>
  );
};
