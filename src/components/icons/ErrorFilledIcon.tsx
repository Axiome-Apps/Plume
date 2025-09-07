import React from 'react';
import { IconProps } from './types';

interface ErrorFilledIconProps extends IconProps {
  color?: string;
}

const ErrorFilledIcon: React.FC<ErrorFilledIconProps> = ({ size, color, className }) => {
  return (
    <svg
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 22 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? ''}
    >
      <path
        d="M12 12H10V7H12V12ZM12 16H10V14H12V16ZM0 19H22L11 0L0 19Z"
        fill={color ?? '#393A37'}
      />
    </svg>
  );
};

export { ErrorFilledIcon };
