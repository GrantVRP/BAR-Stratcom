import React from 'react';

export type TagVariant = 'default' | 'armada' | 'cortex' | 'good' | 'warn' | 'danger' | 'ai';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<TagVariant, string> = {
  default: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  armada: 'border-[#449bed] bg-[#0a1c32] text-[#449bed]',
  cortex: 'border-[#ff2244] bg-[#380b12] text-[#ff2244]',
  good: 'border-[#4ade80] bg-[#0a2e16] text-[#4ade80]',
  warn: 'border-[#fbbf24] bg-[#2e230a] text-[#fbbf24]',
  danger: 'border-[#f87171] bg-[#380b12] text-[#f87171]',
  ai: 'border-[#c084fc] bg-[#220d3a] text-[#c084fc]'
};

export const Tag: React.FC<TagProps> = ({ variant = 'default', className = '', children, ...props }) => {
  const variantClass = VARIANT_STYLES[variant];

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 border font-pixel-heading text-[10px] uppercase tracking-wider ${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};
