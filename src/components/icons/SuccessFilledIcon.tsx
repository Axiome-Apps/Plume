import React from 'react';
import { IconProps } from './types';

interface SuccessFilledIconProps extends IconProps {
  color?: string;
}

const SuccessFilledIcon: React.FC<SuccessFilledIconProps> = ({ size = 24, color, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="10" cy="10" r="10" fill={color ? color : 'currentColor'} />
      <path
        d="M13.9177 6.21793L9.32544 11.4394L6.86699 8.96854C6.4496 8.54905 5.75376 8.54905 5.31305 8.96854C4.89565 9.38804 4.89565 10.0874 5.31305 10.5303L8.60649 13.8403C8.81519 14.0501 9.09363 14.1666 9.37186 14.1666H9.4183C9.71986 14.1666 9.99813 14.0268 10.2068 13.7936L15.5645 7.66314C15.9587 7.19698 15.9123 6.49764 15.4718 6.10138C15.0078 5.70513 14.3119 5.75163 13.9177 6.21796L13.9177 6.21793Z"
        fill="white"
      />
    </svg>
  );
};

export { SuccessFilledIcon };
