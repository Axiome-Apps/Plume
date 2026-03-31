import type { EstimationResultType } from '@/domain/size-prediction';
import { ImageEntity } from '@/domain/image/entity';
import { useTranslation } from '@/hooks/useTranslation';

interface CompressionStatsProps {
  estimatedCompression?: EstimationResultType;
  actualSavings?: number;
  actualCompressedSize?: number;
  originalSize: number;
  className?: string;
}

const formatFileSize = ImageEntity.formatFileSize;

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
          <div className="flex items-center justify-between text-text/60">
            <span>{t('stats.finalSize')}</span>
            <span>{formatFileSize(actualCompressedSize)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text/60">{t('stats.economy')}</span>
            <span className="bg-success/10 text-success px-2 py-1 rounded text-xs font-medium">
              -{actualSavings}%
            </span>
          </div>
        </>
      ) : (
        estimatedCompression && (
          <div className="text-text/50">
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
