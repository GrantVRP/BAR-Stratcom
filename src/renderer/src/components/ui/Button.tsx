import React from 'react';

/** primary: the one main action of a screen (filled); default: secondary (outlined); ghost: tertiary. */
export type ButtonVariant = 'primary' | 'default' | 'armada' | 'cortex' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'pixel-btn-primary',
  default: '',
  armada: 'pixel-btn-armada',
  cortex: 'pixel-btn-cortex',
  danger: 'pixel-btn-danger',
  ghost: 'pixel-btn-ghost'
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-[10px] px-2 py-1',
  md: 'text-[11px] px-3 py-1.5',
  lg: 'text-[13px] px-4 py-2'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
  disabled = false,
  children,
  ...props
}) => {
  const variantClass = VARIANT_CLASSES[variant];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <button
      type="button"
      disabled={disabled}
      className={`pixel-btn ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};
