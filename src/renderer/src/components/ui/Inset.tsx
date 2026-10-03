import React from 'react';

export interface InsetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Inset: React.FC<InsetProps> = ({ className = '', children, ...props }) => {
  return (
    <div className={`pixel-box-inset p-3 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
