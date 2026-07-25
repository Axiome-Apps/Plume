import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Single class-composition helper for the design system: `clsx` handles
 * conditional classes, `tailwind-merge` resolves conflicting Tailwind utilities
 * so a component's `className` escape hatch actually overrides its internal
 * classes instead of coexisting with them.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
