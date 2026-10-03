import React from 'react';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  label?: string;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '',
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      {(label || unit) && (
        <div className="flex justify-between items-center text-[10px] font-pixel-heading uppercase text-zinc-400">
          {label && <span>{label}</span>}
          <span className="font-mono text-[14px] text-[#e4e4e7]" data-num="true">
            {value}
            {unit}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 bg-[#0d0f17] border-2 border-[#2a2e42] appearance-none cursor-pointer accent-[#449bed] outline-none"
      />
    </div>
  );
};
