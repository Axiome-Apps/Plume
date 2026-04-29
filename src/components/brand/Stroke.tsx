import { FC } from 'react';

interface StrokeProps {
  width?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const Stroke: FC<StrokeProps> = ({
  width = 28,
  color = 'currentColor',
  strokeWidth = 1.8,
  className,
}) => {
  const w = width;
  const h = 6;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={`M1 ${h - 2} Q ${w * 0.35} ${h - 4.5} ${w * 0.6} ${h - 2.2} T ${w - 1} ${h - 3.2}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

export default Stroke;
