interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center bg-surface-2 rounded-[10px] p-1 gap-0.5 ${fullWidth ? 'w-full' : ''}`}
    >
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`px-3 h-8 rounded-[7px] text-[12.5px] transition-colors ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? 'bg-primary text-white font-semibold'
                : 'bg-transparent text-fg-2 font-medium hover:text-fg'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
