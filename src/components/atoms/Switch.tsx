import { FC } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  checkedLabel: string;
  uncheckedLabel: string;
  className?: string;
  color?: 'success' | 'primary';
}

export const Switch: FC<SwitchProps> = ({
  checked,
  onChange,
  checkedLabel,
  uncheckedLabel,
  className = '',
  color = 'success',
}) => {
  const colorClasses = {
    success: 'bg-success',
    primary: 'bg-primary',
  };

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? colorClasses[color] : 'bg-secondary/40'
        }`}
      >
        <div
          className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform top-0.5 ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </div>
      <span className="text-sm font-medium text-text/70">
        {checked ? checkedLabel : uncheckedLabel}
      </span>
    </label>
  );
};
