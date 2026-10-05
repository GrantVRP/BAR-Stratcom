import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Accessible name for the switch when there is no visible label. */
  'aria-label'?: string;
  'data-testid'?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId
}) => {
  return (
    <label
      className={`inline-flex items-center gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`.trim()}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        data-testid={testId}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-12 border-2 border-black transition-none focus-visible:outline-2 ${
          checked ? 'bg-[#0a2e16] border-[#4ade80]' : 'bg-[#181a24] border-[#3b425b]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 bg-[#e4e4e7] border border-black transform transition-none mt-0.5 ml-0.5 ${
            checked ? 'translate-x-6 bg-[#4ade80]' : 'translate-x-0 bg-zinc-500'
          }`}
        />
      </button>
      {label && <span className="font-pixel-heading text-[10px] uppercase text-[#e4e4e7]">{label}</span>}
    </label>
  );
};
