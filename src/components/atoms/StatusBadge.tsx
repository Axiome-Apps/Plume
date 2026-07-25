import { cn } from '@/lib/cn';
import { useTranslation } from '@/hooks/useTranslation';
import type { ImageStatus } from '@/domain/image/schema';

interface StatusBadgeProps {
  status: ImageStatus;
  className?: string;
}

const STATUS_COLORS: Record<ImageStatus, string> = {
  pending: 'bg-warning',
  processing: 'bg-primary-light',
  completed: 'bg-success',
  error: 'bg-error',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <div
      role="img"
      aria-label={t(`compression.${status}`)}
      className={cn('w-2.5 h-2.5 rounded-full', STATUS_COLORS[status], className)}
    />
  );
}
