import { StatusBadge } from '@/components/atoms/StatusBadge';
import type { ImageStatus } from '@/domain/image';

interface ImagePreviewProps {
  imageUrl?: string;
  status: ImageStatus;
  className?: string;
}

export function ImagePreview({ imageUrl, status, className }: ImagePreviewProps) {
  return (
    <div className={`relative aspect-square shrink-0 ${className}`}>
      <div className="w-full h-full bg-surface-2 rounded-md overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-1/2 h-1/2 text-fg-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="absolute -top-1 -right-1">
        <StatusBadge status={status} />
      </div>
    </div>
  );
}
