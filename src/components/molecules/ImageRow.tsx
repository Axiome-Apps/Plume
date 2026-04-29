import { FC } from 'react';
import { ImageEntity } from '@/domain/image/entity';
import { ImagePreview } from './ImagePreview';
import { ImageActions } from './ImageActions';
import { ProgressBar } from '../atoms';

interface ImageRowProps {
  image: ImageEntity;
  onCompress?: () => void;
  onRemove?: () => void;
  onRevealInFolder?: () => void;
}

const formatBytes = ImageEntity.formatFileSize;

const ImageRow: FC<ImageRowProps> = ({ image, onCompress, onRemove, onRevealInFolder }) => {
  const meta = `${image.format.toUpperCase()} · ${formatBytes(image.originalSize)}`;
  const savingsPct = image.estimatedCompression?.percent;
  const finalSize =
    image.compressedSize !== undefined
      ? formatBytes(image.compressedSize)
      : savingsPct !== undefined
        ? `~${formatBytes(image.originalSize * (1 - savingsPct / 100))}`
        : null;
  const completedSavings = image.savings;

  return (
    <div className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-rule last:border-b-0">
      <ImagePreview imageUrl={image.preview} status={image.status} className="w-9 h-9" />

      <div className="min-w-0">
        <div className="ax-label text-fg truncate">{image.name}</div>
        <div className="ax-tabular text-fg-3 mt-0.5 truncate">{meta}</div>
        {image.status === 'processing' && image.progress !== undefined && (
          <div className="mt-2">
            <ProgressBar progress={image.progress} />
          </div>
        )}
      </div>

      <div className="text-right">
        {finalSize && <div className="ax-label text-fg tabular-nums">{finalSize}</div>}
        {completedSavings !== undefined && completedSavings > 0 ? (
          <div className="text-[oklch(0.85_0.15_156)] ax-caption font-semibold mt-0.5 tabular-nums">
            −{completedSavings}%
          </div>
        ) : (
          savingsPct !== undefined && (
            <div className="text-[oklch(0.85_0.15_156)] ax-caption font-semibold mt-0.5 tabular-nums">
              −{savingsPct.toFixed(0)}%
            </div>
          )
        )}
      </div>

      <ImageActions
        status={image.status}
        onCompress={onCompress}
        onRemove={onRemove}
        onRevealInFolder={onRevealInFolder}
      />
    </div>
  );
};

export default ImageRow;
