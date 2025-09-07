export type ColorType = 'blue' | 'green' | 'red' | 'yellow' | 'slate';

export const backgroundColor = (color: ColorType, shade: number = 600): string => {
  const colorMapping: Record<ColorType, Record<number, string>> = {
    blue: {
      50: 'bg-[var(--color-blue-50)]',
      100: 'bg-[var(--color-blue-100)]',
      500: 'bg-[var(--color-blue-500)]',
      600: 'bg-[var(--color-blue-600)]',
      700: 'bg-[var(--color-blue-700)]',
    },
    green: {
      50: 'bg-[var(--color-green-50)]',
      100: 'bg-[var(--color-green-100)]',
      500: 'bg-[var(--color-green-500)]',
      600: 'bg-[var(--color-green-600)]',
      700: 'bg-[var(--color-green-700)]',
    },
    red: {
      50: 'bg-[var(--color-red-50)]',
      100: 'bg-[var(--color-red-100)]',
      500: 'bg-[var(--color-red-500)]',
      600: 'bg-[var(--color-red-600)]',
      700: 'bg-[var(--color-red-700)]',
    },
    yellow: {
      50: 'bg-[var(--color-yellow-50)]',
      100: 'bg-[var(--color-yellow-100)]',
      500: 'bg-[var(--color-yellow-500)]',
      600: 'bg-[var(--color-yellow-600)]',
      700: 'bg-[var(--color-yellow-700)]',
    },
    slate: {
      50: 'bg-[var(--color-slate-50)]',
      100: 'bg-[var(--color-slate-100)]',
      300: 'bg-[var(--color-slate-300)]',
      500: 'bg-[var(--color-slate-500)]',
      600: 'bg-[var(--color-slate-600)]',
      700: 'bg-[var(--color-slate-700)]',
      800: 'bg-[var(--color-slate-800)]',
    },
  };

  return colorMapping[color]?.[shade] || '';
};

export const hoverBackgroundColor = (color: ColorType, shade: number = 700): string => {
  const colorMapping: Record<ColorType, Record<number, string>> = {
    blue: {
      50: 'hover:bg-[var(--color-blue-50)]',
      100: 'hover:bg-[var(--color-blue-100)]',
      500: 'hover:bg-[var(--color-blue-500)]',
      600: 'hover:bg-[var(--color-blue-600)]',
      700: 'hover:bg-[var(--color-blue-700)]',
    },
    green: {
      50: 'hover:bg-[var(--color-green-50)]',
      100: 'hover:bg-[var(--color-green-100)]',
      500: 'hover:bg-[var(--color-green-500)]',
      600: 'hover:bg-[var(--color-green-600)]',
      700: 'hover:bg-[var(--color-green-700)]',
    },
    red: {
      50: 'hover:bg-[var(--color-red-50)]',
      100: 'hover:bg-[var(--color-red-100)]',
      500: 'hover:bg-[var(--color-red-500)]',
      600: 'hover:bg-[var(--color-red-600)]',
      700: 'hover:bg-[var(--color-red-700)]',
    },
    yellow: {
      50: 'hover:bg-[var(--color-yellow-50)]',
      100: 'hover:bg-[var(--color-yellow-100)]',
      500: 'hover:bg-[var(--color-yellow-500)]',
      600: 'hover:bg-[var(--color-yellow-600)]',
      700: 'hover:bg-[var(--color-yellow-700)]',
    },
    slate: {
      50: 'hover:bg-[var(--color-slate-50)]',
      100: 'hover:bg-[var(--color-slate-100)]',
      300: 'hover:bg-[var(--color-slate-300)]',
      500: 'hover:bg-[var(--color-slate-500)]',
      600: 'hover:bg-[var(--color-slate-600)]',
      700: 'hover:bg-[var(--color-slate-700)]',
      800: 'hover:bg-[var(--color-slate-800)]',
    },
  };

  return colorMapping[color]?.[shade] || '';
};

export const textColor = (color: ColorType, shade: number = 600): string => {
  const colorMapping: Record<ColorType, Record<number, string>> = {
    blue: {
      500: 'text-[var(--color-blue-500)]',
      600: 'text-[var(--color-blue-600)]',
      700: 'text-[var(--color-blue-700)]',
    },
    green: {
      500: 'text-[var(--color-green-500)]',
      600: 'text-[var(--color-green-600)]',
      700: 'text-[var(--color-green-700)]',
    },
    red: {
      500: 'text-[var(--color-red-500)]',
      600: 'text-[var(--color-red-600)]',
      700: 'text-[var(--color-red-700)]',
    },
    yellow: {
      500: 'text-[var(--color-yellow-500)]',
      600: 'text-[var(--color-yellow-600)]',
      700: 'text-[var(--color-yellow-700)]',
    },
    slate: {
      500: 'text-[var(--color-slate-500)]',
      600: 'text-[var(--color-slate-600)]',
      700: 'text-[var(--color-slate-700)]',
      800: 'text-[var(--color-slate-800)]',
    },
  };

  return colorMapping[color]?.[shade] || '';
};

export const borderColor = (color: ColorType, shade: number = 600): string => {
  const colorMapping: Record<ColorType, Record<number, string>> = {
    blue: {
      500: 'border-[var(--color-blue-500)]',
      600: 'border-[var(--color-blue-600)]',
      700: 'border-[var(--color-blue-700)]',
    },
    green: {
      500: 'border-[var(--color-green-500)]',
      600: 'border-[var(--color-green-600)]',
      700: 'border-[var(--color-green-700)]',
    },
    red: {
      500: 'border-[var(--color-red-500)]',
      600: 'border-[var(--color-red-600)]',
      700: 'border-[var(--color-red-700)]',
    },
    yellow: {
      500: 'border-[var(--color-yellow-500)]',
      600: 'border-[var(--color-yellow-600)]',
      700: 'border-[var(--color-yellow-700)]',
    },
    slate: {
      300: 'border-[var(--color-slate-300)]',
      500: 'border-[var(--color-slate-500)]',
      600: 'border-[var(--color-slate-600)]',
      700: 'border-[var(--color-slate-700)]',
    },
  };

  return colorMapping[color]?.[shade] || '';
};

export const focusRingColor = (color: ColorType): string => {
  const colorMapping: Record<ColorType, string> = {
    blue: 'focus:ring-[var(--color-blue-500)]',
    green: 'focus:ring-[var(--color-green-500)]',
    red: 'focus:ring-[var(--color-red-500)]',
    yellow: 'focus:ring-[var(--color-yellow-500)]',
    slate: 'focus:ring-[var(--color-slate-500)]',
  };

  return colorMapping[color] || '';
};
