import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
}

export const Input: React.FC<InputProps> = ({
  isError = false,
  className = '',
  disabled = false,
  ...props
}) => {
  const borderClass = isError
    ? 'border-[#f87171] focus:border-[#f87171]'
    : 'border-[#2a2e42] focus:border-[#449bed]';

  return (
    <input
      disabled={disabled}
      className={`pixel-box-inset font-mono text-[14px] text-[#e4e4e7] placeholder-zinc-500 px-3 py-1.5 outline-none transition-none ${borderClass} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`.trim()}
      {...props}
    />
  );
};
