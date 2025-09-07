import { ReactNode } from 'react';

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

const COLOR_STYLES: Record<BadgeColor, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200 border',
  green: 'bg-green-100 text-green-700 border-green-200 border',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200 border',
  red: 'bg-red-100 text-red-700 border-red-200 border',
  gray: 'bg-gray-100 text-gray-700', // Pas de border pour gray
};

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${COLOR_STYLES[color]} ${className}`}
    >
      {children}
    </span>
  );
}
