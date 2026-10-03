import React from 'react';

export type PanelVariant = 'default' | 'armada' | 'cortex';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<PanelVariant, string> = {
  default: 'pixel-box',
  armada: 'pixel-box-armada',
  cortex: 'pixel-box-cortex'
};

export const Panel: React.FC<PanelProps> = ({ variant = 'default', className = '', children, ...props }) => {
  const variantClass = VARIANT_CLASSES[variant];

  return (
    <div className={`${variantClass} p-3 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
