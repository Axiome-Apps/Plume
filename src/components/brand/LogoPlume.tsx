import { FC } from 'react';

interface LogoPlumeProps {
  size?: number;
  color?: string;
  className?: string;
}

const LogoPlume: FC<LogoPlumeProps> = ({
  size = 64,
  color = 'var(--color-primary)',
  className,
}) => {
  const sw = size * 0.06;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path
        d="M 14 56 L 46 14"
        stroke={color}
        strokeWidth={sw * 1.4}
        strokeLinecap="round"
        fill="none"
      />
      <path d="M 22 48 L 32 48" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <path d="M 26 42 L 38 42" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <path d="M 30 36 L 42 36" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <path d="M 34 30 L 44 30" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <path d="M 38 24 L 46 24" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
    </svg>
  );
};

export default LogoPlume;
