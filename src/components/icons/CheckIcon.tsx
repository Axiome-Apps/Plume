import { FC } from 'react';
import { IconProps } from './types';

export const CheckIcon: FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
    {...props}
  >
    <polyline points="20,6 9,17 4,12" />
  </svg>
);
