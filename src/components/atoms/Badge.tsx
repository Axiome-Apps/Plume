import { ReactNode } from 'react';

type BadgeColor = 'primary' | 'success' | 'warning' | 'error' | 'secondary';

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

const COLOR_STYLES: Record<BadgeColor, string> = {
  primary: 'bg-primary text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-text',
  error: 'bg-error text-white',
  secondary: 'bg-secondary/10 text-text/60',
};

export function Badge({ children, color = 'secondary', className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${COLOR_STYLES[color]} ${className}`}
    >
      {children}
    </span>
  );
}
