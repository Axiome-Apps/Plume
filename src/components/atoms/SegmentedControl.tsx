import { cn } from '@/lib/cn';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Accessible name for the group — the visible label of the setting it controls. */
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  fullWidth = false,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center bg-surface-2 rounded-control p-1 gap-0.5',
        fullWidth && 'w-full'
      )}
    >
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              'px-3 h-8 rounded-sm text-control-sm transition-colors',
              fullWidth && 'flex-1',
              isActive
                ? 'bg-primary text-white font-semibold'
                : 'bg-transparent text-fg-2 font-medium hover:text-fg',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
