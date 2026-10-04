import React from 'react';
import type { CoachStep } from '../../../../core/schemas/coach';
import type { BuildPlan, Actor } from '../../../../core/schemas/plans';
import { Tag } from '../ui/Tag';

export interface CoachUpNextProps {
  plan: BuildPlan | null;
  steps: readonly CoachStep[];
  currentStepIndex: number;
  getUnitName?: (unitId?: string) => string;
  maxItems?: number;
  className?: string;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getActorLabel(actor: Actor): string {
  if (actor.kind === 'commander') return 'CDR';
  if (actor.kind === 'factory') return actor.index > 1 ? `FAC#${actor.index}` : 'FAC';
  return actor.index > 1 ? `CON#${actor.index}` : 'CON';
}

export function CoachUpNext({
  plan,
  steps,
  currentStepIndex,
  getUnitName,
  maxItems = 4,
  className = ''
}: CoachUpNextProps): React.JSX.Element {
  if (!plan || plan.steps.length === 0) {
    return <div className="hidden" />;
  }

  // Steps after the current one
  const upcomingIndices: number[] = [];
  for (let i = currentStepIndex + 1; i < plan.steps.length && upcomingIndices.length < maxItems; i++) {
    upcomingIndices.push(i);
  }

  return (
    <div
      data-testid="coach-up-next"
      className={`rounded border border-[#27272a] bg-[#12131a] p-3 font-mono text-xs ${className}`}
    >
      <div className="mb-2 flex items-center justify-between border-b border-[#1f2430] pb-1">
        <span className="font-['Press_Start_2P'] text-[10px] text-[#a1a1aa]">UP NEXT</span>
        <span className="text-[10px] text-[#71717a]">
          {Math.max(0, plan.steps.length - (currentStepIndex + 1))} remaining
        </span>
      </div>

      {upcomingIndices.length === 0 ? (
        <div className="py-2 text-center text-xs text-[#71717a] italic">
          No further steps scheduled in opening sequence.
        </div>
      ) : (
        <div className="space-y-1.5">
          {upcomingIndices.map((idx) => {
            const planStep = plan.steps[idx];
            if (!planStep) return null;
            const coachStep = idx < steps.length ? steps[idx] : null;
            const unitName = planStep.unitId && getUnitName ? getUnitName(planStep.unitId) : undefined;
            const targetLabel = unitName ?? (planStep.unitId ? 'Unknown unit' : (planStep.text ?? planStep.action));
            const countPrefix = planStep.action === 'build' ? `${planStep.count}× ` : '';
            const plannedTime = coachStep ? coachStep.plannedStart : idx * 15;

            return (
              <div
                key={planStep.id}
                className="flex items-center justify-between rounded bg-[#0a0c14]/70 px-2 py-1.5 text-xs text-[#d4d4d8] hover:bg-[#181d28]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[11px] text-[#38bdf8] w-10">{formatTime(plannedTime)}</span>
                  <Tag variant="default">{getActorLabel(planStep.actor)}</Tag>
                  <span className="truncate text-[#e4e4e7]">
                    {countPrefix}
                    {targetLabel}
                  </span>
                </div>
                {planStep.text && (
                  <span className="text-[10px] text-[#71717a] italic truncate max-w-[120px] ml-2">
                    {planStep.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
