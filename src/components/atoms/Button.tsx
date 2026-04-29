import React from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'link' | 'icon' | 'destructive';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white border-0 hover:bg-primary-deep shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_22px_-10px_rgba(120,136,200,0.55)] cursor-pointer',
  ghost: 'bg-surface text-fg-2 border border-rule hover:border-rule-2 hover:text-fg cursor-pointer',
  link: 'bg-transparent text-primary-light hover:text-fg cursor-pointer px-0 py-0',
  icon: 'bg-surface text-fg-2 border border-rule hover:border-rule-2 hover:text-fg cursor-pointer',
  destructive: 'bg-transparent text-error border border-error/40 hover:bg-error/10 cursor-pointer',
};

const SIZE = {
  sm: 'h-8 px-3 text-[12.5px] rounded-md',
  md: 'h-10 px-4 text-[13.5px] rounded-md',
  lg: 'h-11 px-[18px] text-[14px] rounded-md',
};

const ICON_SIZE = {
  sm: 'h-8 w-8 rounded-md',
  md: 'h-9 w-9 rounded-md',
  lg: 'h-10 w-10 rounded-md',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const sizeClass = variant === 'icon' ? ICON_SIZE[size] : SIZE[size];
  const widthClass = fullWidth ? 'w-full' : '';
  return (
    <button
      className={`${BASE} ${VARIANT[variant]} ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
