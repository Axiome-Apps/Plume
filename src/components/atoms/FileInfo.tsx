interface FileInfoProps {
  name: string;
  size: number;
  format: string;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
