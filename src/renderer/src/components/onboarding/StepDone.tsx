import React from 'react';
import { Button } from '../ui/Button';

export interface StepDoneProps {
  onBack: () => void;
  onFinish: () => void;
}

export function StepDone({ onBack, onFinish }: StepDoneProps): React.JSX.Element {
  return (
    <div data-testid="onboarding-step-6" className="space-y-6 font-mono text-xs">
      <div className="rounded border border-[#27272a] bg-[#12131a] p-5 space-y-4">
        <div className="border-b border-[#1f2430] pb-3">
          <span className="font-['Press_Start_2P'] text-sm text-[#4ade80]">
            YOU&apos;RE ALL SET!
          </span>
          <p className="mt-1 text-xs text-[#a1a1aa]">
            SETUP COMPLETE
          </p>
        </div>

        <div className="rounded border border-[#4ade80]/30 bg-[#0c2415] p-4 space-y-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#4ade80]">
            HOW TO START COACHING IN GAME
          </span>
        </div>

        <div className="space-y-2 text-xs text-[#e4e4e7]">
          <div className="flex items-start gap-2">
            <span className="text-[#38bdf8] font-bold">1.</span>
            <span>Enable the widget in game (<kbd className="px-1 py-0.5 bg-[#1e293b] rounded font-bold text-white">F11</kbd>).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#38bdf8] font-bold">2.</span>
            <span>Start any match. Coaching starts with it.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#38bdf8] font-bold">3.</span>
            <span>Press <kbd className="px-1 py-0.5 bg-[#1e293b] rounded font-bold text-white">Ctrl+Alt+S</kbd> to show the coach window.</span>
          </div>
        </div>

      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="md" onClick={onBack} data-testid="onboarding-back-btn">
          ◂ BACK
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onFinish}
          data-testid="onboarding-finish-btn"
        >
          FINISH SETUP & GO TO HOME ▸
        </Button>
      </div>
    </div>
  );
}
