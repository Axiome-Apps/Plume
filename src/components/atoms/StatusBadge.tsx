import type { ImageStatus } from '@/domain/image';

interface StatusBadgeProps {
  status: ImageStatus;
  className?: string;
}

const STATUS_COLORS: Record<ImageStatus, string> = {
  pending: 'bg-warning',
  processing: 'bg-primary',
  completed: 'bg-success',
  error: 'bg-error',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status]} ${className ?? ''}`} />;
}
