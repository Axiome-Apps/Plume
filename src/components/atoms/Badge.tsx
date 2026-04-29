import { ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-2 text-fg-2 border-rule',
  success:
    'border-[oklch(0.45_0.10_156/0.55)] text-[oklch(0.85_0.15_156)] bg-[oklch(0.32_0.10_156/0.35)]',
  warning:
    'border-[oklch(0.45_0.14_60/0.55)] text-[oklch(0.85_0.14_60)] bg-[oklch(0.32_0.10_60/0.35)]',
  error:
    'border-[oklch(0.45_0.16_20/0.55)] text-[oklch(0.85_0.16_20)] bg-[oklch(0.32_0.16_20/0.35)]',
};

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[10.5px] font-semibold uppercase tracking-[0.04em] ${VARIANT[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
