import type { ColorType } from './colors';

export type ButtonVariantType = 'filled' | 'outlined' | 'text';

const FILLED_STYLES: Record<ColorType, string> = {
  primary: 'bg-primary hover:bg-primary/80 focus:ring-primary/50',
  secondary: 'bg-secondary hover:bg-secondary/80 focus:ring-secondary/50',
  accent: 'bg-accent hover:bg-accent/80 focus:ring-accent/50',
  success: 'bg-success hover:bg-success/80 focus:ring-success/50',
  error: 'bg-error hover:bg-error/80 focus:ring-error/50',
  warning: 'bg-warning hover:bg-warning/80 focus:ring-warning/50',
};

const OUTLINED_STYLES: Record<ColorType, string> = {
  primary: 'border-primary text-primary hover:bg-primary/10 focus:ring-primary/50',
  secondary: 'border-secondary text-secondary hover:bg-secondary/10 focus:ring-secondary/50',
  accent: 'border-accent text-accent hover:bg-accent/10 focus:ring-accent/50',
  success: 'border-success text-success hover:bg-success/10 focus:ring-success/50',
  error: 'border-error text-error hover:bg-error/10 focus:ring-error/50',
  warning: 'border-warning text-warning hover:bg-warning/10 focus:ring-warning/50',
};

const TEXT_STYLES: Record<ColorType, string> = {
  primary: 'text-primary hover:bg-primary/10 focus:ring-primary/50',
  secondary: 'text-secondary hover:bg-secondary/10 focus:ring-secondary/50',
  accent: 'text-accent hover:bg-accent/10 focus:ring-accent/50',
  success: 'text-success hover:bg-success/10 focus:ring-success/50',
  error: 'text-error hover:bg-error/10 focus:ring-error/50',
  warning: 'text-warning hover:bg-warning/10 focus:ring-warning/50',
};

export const getVariantStyle = (variant: ButtonVariantType): string => {
  switch (variant) {
    case 'filled':
      return 'text-white';
    case 'outlined':
      return 'border bg-transparent';
    case 'text':
      return 'bg-transparent';
    default:
      return '';
  }
};

export const getColorStyle = (
  variant: ButtonVariantType,
  color: ColorType,
  disabled: boolean
): string => {
  if (disabled) return '';

  switch (variant) {
    case 'filled':
      return FILLED_STYLES[color];
    case 'outlined':
      return OUTLINED_STYLES[color];
    case 'text':
      return TEXT_STYLES[color];
    default:
      return '';
  }
};

export const getDisabledStyle = (variant: ButtonVariantType): string => {
  switch (variant) {
    case 'filled':
      return 'bg-secondary/30 text-text/30 cursor-not-allowed';
    case 'outlined':
      return 'border-secondary/30 text-text/30 cursor-not-allowed';
    case 'text':
      return 'text-text/30 cursor-not-allowed';
    default:
      return '';
  }
};
