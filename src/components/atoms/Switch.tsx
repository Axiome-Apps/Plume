import { FC } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  checkedLabel?: string;
  uncheckedLabel?: string;
  className?: string;
}

export const Switch: FC<SwitchProps> = ({
  checked,
  onChange,
  checkedLabel,
  uncheckedLabel,
  className = '',
}) => {
  const label = checked ? checkedLabel : uncheckedLabel;
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        className={`relative inline-block w-8 h-[18px] rounded-full transition-colors duration-150 ${
          checked ? 'bg-primary' : 'bg-surface-2'
        }`}
      >
        <span
          className="absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform duration-150"
          style={{ transform: checked ? 'translateX(14px)' : 'translateX(0)' }}
        />
      </span>
      {label && <span className="ax-caption text-fg-2">{label}</span>}
    </label>
  );
};
