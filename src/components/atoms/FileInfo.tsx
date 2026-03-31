import { ImageEntity } from '@/domain/image/entity';

interface FileInfoProps {
  name: string;
  size: number;
  format: string;
  className?: string;
}

const formatFileSize = ImageEntity.formatFileSize;

export function FileInfo({ name, size, format, className }: FileInfoProps) {
  return (
    <div className={`text-sm text-text/70 ${className}`}>
      <div className="font-medium truncate" title={name}>
        {name}
      </div>
      <div className="text-text/50">
        {formatFileSize(size)} • {format.toUpperCase()}
      </div>
    </div>
  );
}
