import { cn } from '@/lib/cn';

interface ProgressBarProps {
  progress: number;
  className?: string;
  /** Accessible name announced by assistive tech (e.g. the image being compressed). */
  ariaLabel?: string;
}

export function ProgressBar({ progress, className, ariaLabel }: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clampedProgress)}
      className={cn('w-full bg-surface-2 rounded-full h-1.5 overflow-hidden', className)}
    >
      <div
        className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
}
