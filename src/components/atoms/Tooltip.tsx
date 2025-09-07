import { FC, ReactNode } from 'react';

interface TooltipProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export const Tooltip: FC<TooltipProps> = ({ title, children, className = '' }) => {
  return (
    <div className="relative group">
      <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold cursor-help">
        ?
      </div>
      <div
        className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 ${className}`}
      >
        <div className="text-center">
          <div className="font-semibold mb-1">{title}</div>
          {children}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
};
