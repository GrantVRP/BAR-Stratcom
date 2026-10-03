import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({ options, className = '', disabled = false, ...props }) => {
  return (
    <div className="relative inline-block">
      <select
        disabled={disabled}
        className={`pixel-box-inset appearance-none font-mono text-[14px] text-[#e4e4e7] bg-[#0d0f17] border-[#2a2e42] focus:border-[#449bed] px-3 py-1.5 pr-8 outline-none cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`.trim()}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#12131a] text-[#e4e4e7]">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#449bed] text-[10px] font-pixel-heading">
        ▼
      </div>
    </div>
  );
};
