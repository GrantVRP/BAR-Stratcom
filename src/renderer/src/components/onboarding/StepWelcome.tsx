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
          <p className="mt-1 text-xs text-[#a1a1aa]">
            LIVE IN-GAME COACH & TACTICAL ASSISTANT FOR BEYOND ALL REASON
          </p>
        </div>

        <p className="text-xs leading-relaxed text-[#e4e4e7]">
          StratCom is an unofficial companion application designed to help you execute build orders,
          prevent economy stalls, and analyze your matches with real telemetry exported directly from
          Beyond All Reason.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
            <span className="font-['Press_Start_2P'] text-[10px] text-[#4ade80]">01 // COACH</span>
            <p className="mt-2 text-[11px] text-[#a1a1aa]">
              Real-time countdowns, step alerts, and sound and HUD cues directly in game.
            </p>
          </div>
          <div className="rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
            <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">02 // PLANS</span>
            <p className="mt-2 text-[11px] text-[#a1a1aa]">
              Simulate metal & energy curves, test timings, and share build orders with share codes.
            </p>
          </div>
          <div className="rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
            <span className="font-['Press_Start_2P'] text-[10px] text-[#c084fc]">03 // REVIEW</span>
            <p className="mt-2 text-[11px] text-[#a1a1aa]">
              Post-game breakdown of idle builder time, economic floating, and adherence grades.
            </p>
          </div>
        </div>

        {/* Unofficial Community Tool Disclaimer */}
        <div className="rounded border border-[#fbbf24]/40 bg-[#1f1a10] p-3 space-y-1">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#fbbf24]">
            UNOFFICIAL COMMUNITY TOOL
          </span>
          <p className="text-xs text-[#fef08a] leading-relaxed">
            BAR StratCom is an unofficial open-source community tool. It is NOT affiliated with,
            endorsed by, or sponsored by the Beyond All Reason development team or the Spring/Recoil
            engine developers.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          variant="armada"
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
