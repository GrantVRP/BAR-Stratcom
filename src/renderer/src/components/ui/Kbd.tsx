import React from 'react';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const Kbd: React.FC<KbdProps> = ({ children, className = '', ...props }) => {
  return (
    <kbd
      className={`inline-flex items-center justify-center font-mono text-[10px] uppercase font-bold text-zinc-300 bg-[#1e2230] border-2 border-black px-1.5 py-0.5 shadow-[1px_1px_0px_#000] select-none ${className}`.trim()}
      {...props}
    >
      {children}
    </kbd>
  );
};
