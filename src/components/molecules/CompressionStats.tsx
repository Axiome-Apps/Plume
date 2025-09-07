import type { EstimationResultType } from '@/domain/size-prediction';
import { useTranslation } from '@/hooks/useTranslation';

interface CompressionStatsProps {
  estimatedCompression?: EstimationResultType;
  actualSavings?: number;
  actualCompressedSize?: number;
  originalSize: number;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function CompressionStats({
  estimatedCompression,
  actualSavings,
  actualCompressedSize,
  originalSize,
  className,
}: CompressionStatsProps) {
  const { t } = useTranslation();
  const isCompleted = actualSavings !== undefined && actualCompressedSize !== undefined;

  return (
    <div className={`text-sm space-y-1 ${className}`}>
      {isCompleted ? (
        <>
          <div className="flex items-center justify-between text-gray-600">
            <span>{t('stats.finalSize')}</span>
            <span>{formatFileSize(actualCompressedSize)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">{t('stats.economy')}</span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
              -{actualSavings}%
            </span>
          </div>
        </>
      ) : (
        estimatedCompression && (
          <div className="text-gray-500">
            <div className="flex items-center justify-between">
              <span>{t('stats.estimation')}</span>
              <span>~{estimatedCompression.percent}%</span>
            </div>
            <div className="text-xs">
              {formatFileSize(originalSize)} → ~
              {formatFileSize(originalSize * estimatedCompression.ratio)}
            </div>
          </div>
        )
      )}
    </div>
  );
}
