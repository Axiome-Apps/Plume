import { FC, ReactNode, useCallback, useRef, useState } from 'react';

interface TooltipProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const WINDOW_PADDING = 12;

interface TooltipStyle {
  left: string;
  transform: string;
  maxWidth?: number;
}

export const Tooltip: FC<TooltipProps> = ({ title, children, className = '' }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<TooltipStyle>({ left: '50%', transform: 'translateX(-50%)' });
  const [arrowOffset, setArrowOffset] = useState('50%');

  const recalculate = useCallback(() => {
    const tooltip = tooltipRef.current;
    const trigger = tooltip?.parentElement;
    if (!tooltip || !trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const availableWidth = window.innerWidth - WINDOW_PADDING * 2;

    // Reset to measure natural width
    tooltip.style.maxWidth = 'none';
    const tooltipWidth = Math.min(tooltip.scrollWidth, availableWidth);
    const halfTooltip = tooltipWidth / 2;

    let offsetX = 0;
    const overflowRight = triggerCenterX + halfTooltip - (window.innerWidth - WINDOW_PADDING);
    const overflowLeft = WINDOW_PADDING - (triggerCenterX - halfTooltip);

    if (overflowRight > 0) {
      offsetX = -overflowRight;
    } else if (overflowLeft > 0) {
      offsetX = overflowLeft;
    }

    setStyle({
      left: '50%',
      transform: `translateX(calc(-50% + ${offsetX}px))`,
      maxWidth: availableWidth,
    });
    setArrowOffset(`calc(50% - ${offsetX}px)`);
  }, []);

  return (
    <div className="relative group" onMouseEnter={recalculate}>
      <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-bold cursor-help shrink-0">
        ?
      </div>
      <div
        ref={tooltipRef}
        style={{ left: style.left, transform: style.transform, maxWidth: style.maxWidth }}
        className={`absolute bottom-full mb-2 bg-secondary text-white text-xs rounded-lg px-3 py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10 w-max ${className}`}
      >
        <div className="text-center">
          <div className="font-semibold mb-1">{title}</div>
          {children}
        </div>
        <div
          style={{ left: arrowOffset }}
          className="absolute top-full -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-secondary"
        />
      </div>
    </div>
  );
};
