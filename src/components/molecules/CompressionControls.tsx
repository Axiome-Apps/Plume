import { FC } from 'react';
import Button from '../atoms/Button';
import { Badge, Switch, Tooltip } from '../atoms';
import { TrashIcon, DownloadIcon } from '../icons';
import { ImageEntity } from '@/domain/image/entity';
import { useTranslation } from '@/hooks/useTranslation';

interface CompressionControlsProps {
  images: ImageEntity[];
  pendingImages: ImageEntity[];
  completedImages: ImageEntity[];
  processingImages: ImageEntity[];
  isProcessing: boolean;
  convertToWebP: boolean;
  lossyMode: boolean;
  hasPNG: boolean;
  hasWebP: boolean;
  onToggleWebPConversion: () => void;
  onToggleLossyMode: () => void;
  onStartCompression: () => void;
  onClearImages: () => void;
  onDownloadAllImages: () => void;
}

export const CompressionControls: FC<CompressionControlsProps> = ({
  images,
  pendingImages,
  completedImages,
  isProcessing,
  convertToWebP,
  lossyMode,
  hasPNG,
  hasWebP,
  onToggleWebPConversion,
  onToggleLossyMode,
  onStartCompression,
  onClearImages,
  onDownloadAllImages,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
      <div
        className={`flex flex-col sm:flex-row gap-3 flex-1 ${
          convertToWebP ? 'justify-between' : 'justify-start'
        }`}
      >
        <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 flex-1">
          <Switch
            checked={convertToWebP}
            onChange={onToggleWebPConversion}
            checkedLabel="WebP"
            uncheckedLabel="Original"
          />

          <Tooltip title={t('header.tooltips.format.title')}>
            <div dangerouslySetInnerHTML={{ __html: t('header.tooltips.format.description') }} />
            {hasPNG && <div className="text-green-300">{t('header.tooltips.format.info')}</div>}
          </Tooltip>

          {convertToWebP && <Badge color="green">{t('header.recommended')}</Badge>}
        </div>

        {convertToWebP && (hasPNG || hasWebP) && (
          <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
            <Switch
              checked={lossyMode}
              onChange={onToggleLossyMode}
              checkedLabel="Lossy"
              uncheckedLabel="Lossless"
              color="blue"
            />

            <Tooltip title={t('header.tooltips.strategy.title')}>
              <div
                dangerouslySetInnerHTML={{ __html: t('header.tooltips.strategy.description') }}
              />
              <div className="text-yellow-300">⚠️ {t('header.tooltips.strategy.info')}</div>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {images.length > 1 && (
          <Button variant="outlined" color="slate" onClick={onClearImages} disabled={isProcessing}>
            <TrashIcon size={16} className="mr-2" />
            {t('header.empty')}
          </Button>
        )}

        {pendingImages.length > 0 && images.length > 1 && (
          <Button
            variant="filled"
            color="blue"
            onClick={onStartCompression}
            disabled={isProcessing || pendingImages.length === 0}
          >
            <DownloadIcon size={16} className="mr-2" />
            {isProcessing ? t('header.compression.active') : t('header.compression.pending')}
          </Button>
        )}

        {completedImages.length > 0 && images.length > 1 && (
          <Button variant="filled" color="green" onClick={onDownloadAllImages}>
            <DownloadIcon size={16} className="mr-2" />
{t('header.downloadAll')} ({completedImages.length})
          </Button>
        )}
      </div>
    </div>
  );
};
