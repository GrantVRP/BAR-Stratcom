import React from 'react';
import type { CoachStep } from '../../../../core/schemas/coach';
import type { BuildPlan, BuildStep } from '../../../../core/schemas/plans';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { actorTag } from '../../../../core/coach/hud-boxes';

export interface CoachNextCardProps {
  currentStep: CoachStep | null;
  planStep: BuildStep | null;
  plan: BuildPlan | null;
  aheadBehindSec: number | null;
  clock: number;
  getUnitName?: (unitId?: string) => string;
  isManualMode?: boolean;
  onMarkDone?: () => void;
  className?: string;
}

function formatMinutesSeconds(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatCountdown(
  plannedStart: number,
  plannedFinish: number,
  clock: number
): { text: string; tone: string } {
  const targetTime = plannedFinish > 0 ? plannedFinish : plannedStart;
  const targetStr = formatMinutesSeconds(targetTime);

  if (clock <= targetTime) {
    const diff = targetTime - clock;
    const tone = clock < plannedStart ? 'text-[#38bdf8]' : 'text-[#4ade80]';
    return {
      text: `@${targetStr} (in ${formatMinutesSeconds(diff)})`,
      tone
    };
  } else {
    const late = clock - targetTime;
    return {
      text: `LATE +${formatMinutesSeconds(late)}`,
      tone: 'text-[#f87171]'
    };
  }
}


export function CoachNextCard({
  currentStep,
  planStep,
  plan,
  aheadBehindSec,
  clock,
  getUnitName,
  isManualMode = false,
  onMarkDone,
  className = ''
}: CoachNextCardProps): React.JSX.Element {
  if (!currentStep || !planStep) {
    const isPlanComplete = Boolean(plan && plan.steps.length > 0 && !currentStep);
    return (
      <div
        data-testid="coach-next-card"
        className={`rounded-lg border border-[#27272a] bg-[#12131a] p-5 font-mono shadow-md ${className}`}
      >
        <div className="text-xs uppercase tracking-wider text-[#a1a1aa] font-['Press_Start_2P']">
          NEXT STEP
        </div>
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
          <div className="text-2xl font-bold text-[#4ade80]">
            {isPlanComplete ? 'ALL STEPS COMPLETE' : 'NO ACTIVE STEP'}
          </div>
          <p className="mt-1 text-sm text-[#71717a]">
            {isPlanComplete
              ? 'Opening done.'
              : 'Waiting for the game clock.'}
          </p>
        </div>
      </div>
    );
  }

  const unitName = planStep.unitId && getUnitName ? getUnitName(planStep.unitId) : undefined;
  const stepLabel = unitName ?? (planStep.unitId ? 'Unknown unit' : (planStep.text ?? planStep.action));
  const countPrefix = planStep.action === 'build' ? `${planStep.count}× ` : '';
  const fullName = `${countPrefix}${stepLabel}`;

  const countdown = formatCountdown(currentStep.plannedStart, currentStep.plannedFinish, clock);

  let paceLabel = 'PLAN ON TIME';
  let paceColor = 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/30';
  if (aheadBehindSec !== null) {
    if (aheadBehindSec > 0) {
      paceLabel = `PLAN +${aheadBehindSec}s AHEAD`;
      paceColor = 'text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/30';
    } else if (aheadBehindSec < 0) {
      const behind = Math.abs(aheadBehindSec);
      paceLabel = `PLAN -${behind}s BEHIND`;
      paceColor =
        behind >= 20
          ? 'text-[#f87171] bg-[#f87171]/10 border-[#f87171]/30'
          : 'text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/30';
    }
  }

  return (
    <div
      data-testid="coach-next-card"
      className={`rounded-lg border-2 border-[#2563eb]/40 bg-[#0d131f] p-4 font-mono shadow-lg ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <span className="font-['Press_Start_2P'] text-[11px] text-[#38bdf8]">▸ NEXT</span>
          <Tag variant="default">{actorTag(planStep.actor)}</Tag>
        </div>
        <div className={`rounded border px-2 py-0.5 text-xs font-bold ${paceColor}`}>{paceLabel}</div>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <div
          data-testid="coach-next-unit"
          className="text-[28px] lg:text-[32px] font-bold text-[#f8fafc] leading-tight truncate max-w-full"
        >
          {fullName}
        </div>
        <div
          data-testid="coach-next-countdown"
          className={`text-[28px] lg:text-[32px] font-bold ${countdown.tone} leading-tight`}
        >
          {countdown.text}
        </div>
      </div>

      {planStep.text && <div className="mt-2 text-xs italic text-[#94a3b8]">// {planStep.text}</div>}

      {isManualMode && onMarkDone && (
        <div className="mt-3 pt-2 border-t border-[#1e293b] flex justify-end">
          <Button variant="primary" size="sm" onClick={onMarkDone} data-testid="coach-next-done-btn">
            ✓ MARK DONE
          </Button>
        </div>
      )}
    </div>
  );
}
