import { ErrorFilledIcon, SuccessFilledIcon } from '@/components/icons';
import type { ImageStatus } from '@/domain/image';
import { useTranslation } from '@/hooks/useTranslation';

interface StatusBadgeProps {
  status: ImageStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  const STATUS_CONFIG = {
    pending: {
      text: t('compression.pending'),
      icon: null,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    processing: {
      text: t('compression.processing'),
      icon: null,
      className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    completed: {
      text: t('compression.completed'),
      icon: SuccessFilledIcon,
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    error: {
      text: t('compression.error'),
      icon: ErrorFilledIcon,
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  } as const;
  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {IconComponent && <IconComponent className="w-3 h-3" />}
      <span>{config.text}</span>
    </div>
  );
}
