import type { CompressionLevelType, OutputFormatType } from '@/domain/compression/schema';
import { ImageEntity } from '@/domain/image/entity';
import { useTranslation } from '@/hooks/useTranslation';
import { FC, useMemo } from 'react';
import { SegmentedControl, Tooltip } from '../atoms';
import Button from '../atoms/Button';
import { DownloadIcon, FeatherIcon, TrashIcon } from '../icons';

interface CompressionControlsProps {
  images: ImageEntity[];
  pendingImages: ImageEntity[];
  completedImages: ImageEntity[];
  isProcessing: boolean;
  outputFormat: OutputFormatType;
  compressionLevel: CompressionLevelType;
  onOutputFormatChange: (format: OutputFormatType) => void;
  onCompressionLevelChange: (level: CompressionLevelType) => void;
  onStartCompression: () => void;
  onClearImages: () => void;
  onDownloadAllImages: () => void;
}

export const CompressionControls: FC<CompressionControlsProps> = ({
  images,
  pendingImages,
  completedImages,
  isProcessing,
  outputFormat,
  compressionLevel,
  onOutputFormatChange,
  onCompressionLevelChange,
  onStartCompression,
  onClearImages,
  onDownloadAllImages,
}) => {
  const { t } = useTranslation();

  const isPngOutput = outputFormat === 'png';
  const hasHEIC = useMemo(() => images.some(img => img.format.toUpperCase() === 'HEIC'), [images]);

  const formatOptions: { value: OutputFormatType; label: string }[] = [
    { value: 'keep', label: t('header.controls.format.keep') },
    { value: 'webp', label: 'WebP' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
  ];

  const levelOptions: { value: CompressionLevelType; label: string }[] = [
    { value: 'light', label: t('header.controls.level.light') },
    { value: 'balanced', label: t('header.controls.level.balanced') },
    { value: 'aggressive', label: t('header.controls.level.aggressive') },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {t('header.controls.format.title')}
          </span>
          <SegmentedControl
            options={formatOptions}
            value={outputFormat}
            onChange={onOutputFormatChange}
            color="green"
            disabled={isProcessing}
          />
          <Tooltip title={t('header.controls.format.title')}>
            <div>{t('header.controls.format.tooltip')}</div>
          </Tooltip>
        </div>

        <div
          className={`flex items-center gap-2 rounded-lg p-3 ${isPngOutput ? 'bg-amber-50' : 'bg-slate-50'}`}
        >
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {t('header.controls.level.title')}
          </span>
          <SegmentedControl
            options={levelOptions}
            value={compressionLevel}
            onChange={onCompressionLevelChange}
            color="blue"
            disabled={isProcessing || isPngOutput}
          />
          <Tooltip title={t('header.controls.level.title')}>
            <div>
              {isPngOutput
                ? t('header.controls.level.pngLocked')
                : t('header.controls.level.tooltip')}
            </div>
            {isPngOutput && hasHEIC && (
              <div className="text-amber-300 mt-1">{t('header.controls.level.pngHeicWarning')}</div>
            )}
          </Tooltip>
        </div>
      </div>

      <div className="flex gap-2">
        {images.length > 1 && (
          <Button variant="outlined" color="slate" onClick={onClearImages} disabled={isProcessing}>
            <TrashIcon size={16} />
          </Button>
        )}

        {pendingImages.length > 0 && images.length > 1 && (
          <Button
            variant="filled"
            color="blue"
            onClick={onStartCompression}
            disabled={isProcessing || pendingImages.length === 0}
          >
            <FeatherIcon size={16} className="mr-2" />
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
