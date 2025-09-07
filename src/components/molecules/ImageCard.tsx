import { ProgressBar, Badge } from '@/components/atoms';
import { ImagePreview, ImageActions } from '@/components/molecules';
import type { ImageEntity } from '@/domain/image/entity';

interface ImageCardProps {
  image: ImageEntity;
  onDownload?: () => void;
  onRemove?: () => void;
  onCompress?: () => void;
  className?: string;
}

export function ImageCard({ image, onDownload, onRemove, onCompress, className }: ImageCardProps) {
  return (
    <div
      className={`p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow ${className}`}
    >
      {/* Layout responsive */}
      <div className="grid grid-cols-1 md:grid-cols-[96px_1fr_auto] gap-4 items-start">
        {/* Preview - Full width sur mobile, taille fixe sur desktop */}
        <ImagePreview
          imageUrl={image.preview}
          status={image.status}
          className="w-full aspect-square md:w-24 md:h-24 mx-auto md:mx-0"
        />

        {/* Informations - Centrées sur mobile */}
        <div className="space-y-2 text-center md:text-left">
          {/* Nom du fichier */}
          <h3 className="font-medium text-gray-900 truncate">{image.name}</h3>

          <div className="flex items-center justify-center md:justify-start gap-2 text-sm">
            <Badge color="gray">{image.format.toUpperCase()}</Badge>
            <span className="text-gray-600">{formatFileSize(image.originalSize)}</span>
          </div>

          {/* Progress pour processing */}
          {image.status === 'processing' && image.progress !== undefined && (
            <div className="space-y-1">
              <ProgressBar progress={image.progress} />
              <div className="text-xs text-gray-500">{image.progress}% terminé</div>
            </div>
          )}

          {/* image.status === 'pending' && image.estimatedCompression && (
            <div className="text-sm text-gray-500">
              Économie estimée: ~{image.estimatedCompression.percent}%
            </div>
          ) */}

          {image.status === 'completed' && image.savings && image.compressedSize && (
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm">
              <span className="text-gray-600">→ {formatFileSize(image.compressedSize)}</span>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                -{image.savings}%
              </span>
            </div>
          )}
        </div>

        {/* Actions responsive */}
        <div className="md:justify-self-end w-full md:w-auto">
          <ImageActions
            status={image.status}
            onCompress={onCompress}
            onDownload={onDownload}
            onRemove={onRemove}
            className="w-full md:w-auto"
          />
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default ImageCard;
