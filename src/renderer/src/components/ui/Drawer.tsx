import React, { useEffect } from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, children, width = 'w-96' }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="Close drawer"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClose();
        }}
        className="fixed inset-0 bg-black/60 transition-none"
      />

      {/* Drawer content */}
      <div
        className={`relative z-50 h-full ${width} max-w-full bg-[#12131a] border-l-2 border-[#2a2e42] p-4 flex flex-col shadow-[-4px_0px_0px_#000]`}
      >
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#2a2e42] mb-4">
          <h2 className="font-pixel-heading text-[12px] uppercase text-[#e4e4e7]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="pixel-btn text-[10px] px-2 py-1"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
