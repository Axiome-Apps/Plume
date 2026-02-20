interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  color?: 'primary' | 'success' | 'accent';
  disabled?: boolean;
  fullWidth?: boolean;
}

const COLOR_CLASSES = {
  primary: 'bg-primary text-white',
  success: 'bg-success text-white',
  accent: 'bg-accent text-white',
} as const;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  color = 'primary',
  disabled = false,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div className={`flex gap-0.5 bg-secondary/15 rounded-lg p-0.5 ${fullWidth ? 'w-full' : ''}`}>
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              fullWidth ? 'flex-1 text-center' : ''
            } ${
              isActive
                ? COLOR_CLASSES[color]
                : 'text-text/60 hover:text-text/80 hover:bg-secondary/10'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
