import type { CompressionLevelType, OutputFormatType } from '@/domain/compression/schema';
import { ImageEntity } from '@/domain/image/entity';
import { useTranslation } from '@/hooks/useTranslation';
import { FC, useMemo } from 'react';
import { SegmentedControl, Tooltip } from '../atoms';

interface CompressionControlsProps {
  images: ImageEntity[];
  isProcessing: boolean;
  outputFormat: OutputFormatType;
  compressionLevel: CompressionLevelType;
  onOutputFormatChange: (format: OutputFormatType) => void;
  onCompressionLevelChange: (level: CompressionLevelType) => void;
}

export const CompressionControls: FC<CompressionControlsProps> = ({
  images,
  isProcessing,
  outputFormat,
  compressionLevel,
  onOutputFormatChange,
  onCompressionLevelChange,
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
    <div className="space-y-3">
      {/* Line 2 - Format */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-text whitespace-nowrap w-24 shrink-0">
          {t('header.controls.format.title')}
        </span>
        <div className="flex-1">
          <SegmentedControl
            options={formatOptions}
            value={outputFormat}
            onChange={onOutputFormatChange}
            color="primary"
            disabled={isProcessing}
            fullWidth
          />
        </div>
        <Tooltip title={t('header.controls.format.title')}>
          <div>{t('header.controls.format.tooltip')}</div>
        </Tooltip>
      </div>

      {/* Line 3 - Compression */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-text whitespace-nowrap w-24 shrink-0">
          {t('header.controls.level.title')}
        </span>
        <div className="flex-1">
          <SegmentedControl
            options={levelOptions}
            value={compressionLevel}
            onChange={onCompressionLevelChange}
            color="primary"
            disabled={isProcessing || isPngOutput}
            fullWidth
          />
        </div>
        <Tooltip title={t('header.controls.level.title')}>
          <div>
            {isPngOutput
              ? t('header.controls.level.pngLocked')
              : t('header.controls.level.tooltip')}
          </div>
          {isPngOutput && hasHEIC && (
            <div className="text-warning mt-1">{t('header.controls.level.pngHeicWarning')}</div>
          )}
        </Tooltip>
      </div>
    </div>
  );
};
