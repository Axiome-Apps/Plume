import { FC } from 'react';
import Button from '../atoms/Button';
import { Badge, Switch, Tooltip } from '../atoms';
import { TrashIcon, DownloadIcon } from '../icons';
import { ImageEntity } from '@/domain/image/entity';
import { useTranslation } from '@/hooks/useTranslation';

type HeicOutputFormat = 'jpeg' | 'png';

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
  hasHEIC: boolean;
  heicOutputFormat: HeicOutputFormat;
  onToggleWebPConversion: () => void;
  onToggleLossyMode: () => void;
  onHeicOutputFormatChange: (format: HeicOutputFormat) => void;
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
  hasHEIC,
  heicOutputFormat,
  onToggleWebPConversion,
  onToggleLossyMode,
  onHeicOutputFormatChange,
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
            {hasHEIC && (
              <div className="text-amber-300">
                {convertToWebP
                  ? 'Les fichiers HEIC seront convertis en WebP.'
                  : 'Les fichiers HEIC seront convertis dans le format choisi ci-dessous.'}
              </div>
            )}
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

        {hasHEIC && !convertToWebP && (
          <div className="flex items-center gap-3 bg-amber-50 rounded-lg p-3">
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">HEIC →</span>
            <div className="flex gap-1">
              {(['jpeg', 'png'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => onHeicOutputFormatChange(fmt)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    heicOutputFormat === fmt
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
            <Tooltip title="Format HEIC">
              <div>
                Le format HEIC ne peut pas être conservé tel quel. Les fichiers HEIC seront
                convertis en {heicOutputFormat.toUpperCase()}.
              </div>
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
