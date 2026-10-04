import React from 'react';
import { Button } from '../ui/Button';

export interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps): React.JSX.Element {
  return (
    <div data-testid="onboarding-step-1" className="space-y-6 font-mono text-xs">
      {/* Title & Introduction */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-5 space-y-4">
        <div className="border-b border-[#1f2430] pb-3">
          <span className="font-['Press_Start_2P'] text-sm text-[#38bdf8]">
            WELCOME TO BAR STRATCOM
          </span>
        </div>

        <p className="text-xs leading-relaxed text-[#e4e4e7]">A live build-order coach for Beyond All Reason.</p>

        {/* Unofficial Community Tool Disclaimer */}
        <div className="rounded border border-[#fbbf24]/40 bg-[#1f1a10] p-3 space-y-1">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#fbbf24]">
            UNOFFICIAL COMMUNITY TOOL
          </span>
          <p className="text-xs text-[#fef08a] leading-relaxed">
            Not affiliated with the Beyond All Reason team.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          data-testid="onboarding-next-btn"
        >
          START SETUP ▸
        </Button>
      </div>
    </div>
  );
}
