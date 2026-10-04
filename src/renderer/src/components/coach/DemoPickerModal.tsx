import React, { useState } from 'react';
import type { DemoInfo } from '../../../../shared/ipc';
import { Button } from '../ui/Button';
import { getMostRecentDemo } from '../../lib/demo-pairing';

export interface DemoPickerModalProps {
  isOpen: boolean;
  demos: DemoInfo[];
  onSelectDemo: (demoId: string) => void;
  onClose: () => void;
}

export function DemoPickerModal({
  isOpen,
  demos,
  onSelectDemo,
  onClose
}: DemoPickerModalProps): React.JSX.Element | null {
  const mostRecent = getMostRecentDemo(demos);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const effectiveSelectedId = selectedId ?? mostRecent?.id ?? demos[0]?.id ?? '';

  function handleConfirm(): void {
    if (effectiveSelectedId) {
      onSelectDemo(effectiveSelectedId);
    }
  }

  return (
    <div
      data-testid="demo-picker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 font-mono"
    >
      <div className="w-full max-w-lg rounded-lg border border-[#27272a] bg-[#0c0e17] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-3">
          <span className="font-['Press_Start_2P'] text-xs text-[#38bdf8]">CHOOSE DEMO FIXTURE</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#71717a] hover:text-[#e4e4e7]"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-xs text-[#a1a1aa]">
          Pick a game to replay at 4×.
        </p>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
          {demos.map((d) => {
            const isSelected = d.id === effectiveSelectedId;
            return (
              <div
                key={d.id}
                data-testid={`demo-item-${d.id}`}
                onClick={() => setSelectedId(d.id)}
                className={`cursor-pointer rounded border p-3 transition-colors ${
                  isSelected
                    ? 'border-[#38bdf8] bg-[#18283d]'
                    : 'border-[#1f2430] bg-[#12131a] hover:border-[#38bdf8]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#e4e4e7]">{d.title}</span>
                  <span className="rounded bg-[#0a0c14] px-1.5 py-0.5 text-[10px] text-[#38bdf8]">
                    {Math.floor(d.durationSec / 60)}m {d.durationSec % 60}s
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#71717a]">
                  <span>{d.description}</span>
                  {d.id === mostRecent?.id && (
                    <span className="text-[10px] text-[#4ade80]">★ MOST RECENT</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end gap-3 border-t border-[#1f2430] pt-3">
          <Button variant="default" size="sm" onClick={onClose}>
            CANCEL
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            data-testid="demo-picker-start-btn"
          >
            START DEMO (4×)
          </Button>
        </div>
      </div>
    </div>
  );
}
