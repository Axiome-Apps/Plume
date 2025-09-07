import type { ColorType } from './colors';
import {
  backgroundColor,
  hoverBackgroundColor,
  textColor,
  borderColor,
  focusRingColor,
} from './colors';

export type ButtonVariantType = 'filled' | 'outlined' | 'text';

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
      return `${backgroundColor(color, 600)} ${hoverBackgroundColor(color, 700)} ${focusRingColor(color)}`;
    case 'outlined':
      return `${borderColor(color, 600)} ${textColor(color, 600)} hover:${backgroundColor(color, 50)} ${focusRingColor(color)}`;
    case 'text':
      return `${textColor(color, 600)} hover:${backgroundColor(color, 50)} ${focusRingColor(color)}`;
    default:
      return '';
  }
};

export const getDisabledStyle = (variant: ButtonVariantType): string => {
  switch (variant) {
    case 'filled':
      return 'bg-[var(--color-slate-300)] text-[var(--color-slate-500)] cursor-not-allowed';
    case 'outlined':
      return 'border-[var(--color-slate-300)] text-[var(--color-slate-500)] cursor-not-allowed';
    case 'text':
      return 'text-[var(--color-slate-500)] cursor-not-allowed';
    default:
      return '';
  }
};
