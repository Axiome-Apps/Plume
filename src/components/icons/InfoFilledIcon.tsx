import React from 'react';
import { IconProps } from './types';

interface InfoFilledIconProps extends IconProps {
  color?: string;
}

const InfoFilledIcon: React.FC<InfoFilledIconProps> = ({ size, color, className }) => {
  return (
    <svg
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? ''}
    >
      <path
        d="M11 0.5C5.20156 0.5 0.5 5.20156 0.5 11C0.5 16.7984 5.20156 21.5 11 21.5C16.7984 21.5 21.5 16.7984 21.5 11C21.5 5.20156 16.7984 0.5 11 0.5ZM11.75 16.0625C11.75 16.1656 11.6656 16.25 11.5625 16.25H10.4375C10.3344 16.25 10.25 16.1656 10.25 16.0625V9.6875C10.25 9.58438 10.3344 9.5 10.4375 9.5H11.5625C11.6656 9.5 11.75 9.58438 11.75 9.6875V16.0625ZM11 8C10.7056 7.99399 10.4253 7.87282 10.2192 7.6625C10.0132 7.45218 9.89773 7.16945 9.89773 6.875C9.89773 6.58055 10.0132 6.29782 10.2192 6.0875C10.4253 5.87718 10.7056 5.75601 11 5.75C11.2944 5.75601 11.5747 5.87718 11.7808 6.0875C11.9868 6.29782 12.1023 6.58055 12.1023 6.875C12.1023 7.16945 11.9868 7.45218 11.7808 7.6625C11.5747 7.87282 11.2944 7.99399 11 8Z"
        fill={color ?? '#393A37'}
      />
    </svg>
  );
};

export { InfoFilledIcon };
