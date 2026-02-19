interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  color?: 'blue' | 'green' | 'slate';
  disabled?: boolean;
}

const COLOR_CLASSES = {
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  slate: 'bg-slate-600 text-white',
} as const;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  color = 'blue',
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex gap-0.5 bg-slate-200 rounded-lg p-0.5">
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              isActive
                ? COLOR_CLASSES[color]
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
