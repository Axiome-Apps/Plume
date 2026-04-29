import type { ImageStatus } from '@/domain/image';

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
  return <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]} ${className ?? ''}`} />;
}
