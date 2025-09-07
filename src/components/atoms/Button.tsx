import React from 'react';
import {
  getVariantStyle,
  getColorStyle,
  getDisabledStyle,
  ButtonVariantType,
} from '@/utils/button';
import { ColorType } from '@/utils/colors';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariantType;
  size?: 'sm' | 'md' | 'lg';
  color?: ColorType;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'filled',
  size = 'md',
  color = 'blue',
  children,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = getVariantStyle(variant);
  const colorClasses = disabled
    ? getDisabledStyle(variant)
    : getColorStyle(variant, color, disabled);

  const classes = `${baseClasses} ${variantClasses} ${colorClasses} ${sizeClasses[size]} ${className}`;

  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export default Button;
