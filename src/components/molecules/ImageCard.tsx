import { Badge, ProgressBar } from '@/components/atoms';
import { ImageActions, ImagePreview } from '@/components/molecules';
import { ImageEntity } from '@/domain/image/entity';

interface ImageCardProps {
  image: ImageEntity;
  onRemove?: () => void;
  onCompress?: () => void;
  onRevealInFolder?: () => void;
}

export function ImageCard({ image, onRemove, onCompress, onRevealInFolder }: ImageCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-secondary/20 rounded-lg bg-white hover:shadow-md transition-shadow gap-4">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <ImagePreview
          imageUrl={image.preview}
          status={image.status}
          className="w-20 h-20 shrink-0"
        />

        <div className="space-y-1.5 min-w-0 flex-1">
          <h3 className="font-medium text-text truncate">{image.name}</h3>

          <div className="flex items-center gap-2 text-sm">
            <Badge color="secondary">{image.format.toUpperCase()}</Badge>
            <span className="text-text/60">{formatFileSize(image.originalSize)}</span>
          </div>

          {image.status === 'processing' && image.progress !== undefined && (
            <div className="space-y-1">
              <ProgressBar progress={image.progress} />
              <div className="text-xs text-text/50">{image.progress}% terminé</div>
            </div>
          )}

          {image.status === 'pending' && image.estimatedCompression && (
            <div className="text-sm">
              {image.estimatedCompression.percent < 10 ? (
                <span className="bg-warning/10 text-warning px-2 py-0.5 rounded text-xs font-medium">
                  Déjà optimisé — gain estimé ~{image.estimatedCompression.percent.toFixed(0)}%
                </span>
              ) : (
                <span className="text-text/50">
                  Économie estimée : ~{image.estimatedCompression.percent.toFixed(0)}%
                </span>
              )}
            </div>
          )}

          {image.status === 'completed' && image.compressedSize !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text/60">→ {formatFileSize(image.compressedSize)}</span>
              {image.savings && image.savings > 0 ? (
                <span className="bg-success/10 text-success px-2 py-0.5 rounded text-xs font-medium">
                  -{image.savings}%
                </span>
              ) : (
                <span className="bg-secondary/10 text-text/60 px-2 py-0.5 rounded text-xs font-medium">
                  Déjà optimisé
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <ImageActions
        status={image.status}
        onCompress={onCompress}
        onRemove={onRemove}
        onRevealInFolder={onRevealInFolder}
      />
    </div>
  );
}

const formatFileSize = ImageEntity.formatFileSize;

export default ImageCard;
