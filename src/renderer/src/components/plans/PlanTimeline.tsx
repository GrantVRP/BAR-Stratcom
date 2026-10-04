import React from 'react';
import type { BuildPlan, BuildStep } from '../../../../core/schemas';
import { useSnapshot } from '../../stores';
import { TacticalIcon } from './TacticalIcon';
import { MetalIcon } from '../ui/MetalIcon';
import { EnergyIcon } from '../ui/EnergyIcon';

export interface PlanTimelineProps {
  plan: BuildPlan;
  className?: string;
}

function formatTargetTime(seconds?: number): string {
  if (seconds === undefined) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getActorBadge(actor: BuildStep['actor']): { text: string; className: string } {
  if (actor.kind === 'commander') {
    return {
      text: '[CDR]',
      className: 'bg-[#271d05] text-[#fbbf24] border-[#b45309]'
    };
  }
  if (actor.kind === 'factory') {
    return {
      text: actor.index > 1 ? `[FAC#${actor.index}]` : '[FAC]',
      className: 'bg-[#0a1c32] text-[#38bdf8] border-[#0284c7]'
    };
  }
  return {
    text: actor.index > 1 ? `[CON#${actor.index}]` : '[CON]',
    className: 'bg-[#062c19] text-[#4ade80] border-[#16a34a]'
  };
}

export function PlanTimeline({ plan, className = '' }: PlanTimelineProps): React.JSX.Element {
  const { getUnit, getUnitName } = useSnapshot();

  return (
    <div className={`space-y-2 ${className}`} data-testid="plan-timeline">
      {plan.steps.map((step, idx) => {
        const actorBadge = getActorBadge(step.actor);
        const unit = step.unitId ? getUnit(step.unitId) : undefined;
        const unitName = step.unitId ? getUnitName(step.unitId) : '';
        const timeStr = formatTargetTime(step.targetTime);

        const totalMetal = unit ? unit.metalCost * step.count : null;
        const totalEnergy = unit ? unit.energyCost * step.count : null;

        return (
          <div
            key={step.id || idx}
            data-testid={`timeline-step-${idx}`}
            className="flex items-center gap-3 p-2.5 pixel-box transition-none bg-[#0e121d] hover:bg-[#131826]"
          >
            {/* Timestamp */}
            <div className="shrink-0 w-14">
              <span
                data-num="true"
                className="font-mono text-xs px-1.5 py-0.5 pixel-box-inset text-zinc-300 block text-center"
              >
                {timeStr}
              </span>
            </div>

            {/* Tactical Icon */}
            <div className="size-8 pixel-box-inset flex items-center justify-center shrink-0 bg-[#090b14]">
              <TacticalIcon
                unitId={step.unitId}
                action={step.action}
                size={22}
              />
            </div>

            {/* Actor badge */}
            <span
              className={`px-1.5 py-0.5 font-pixel-heading text-[10px] border shrink-0 ${actorBadge.className}`}
            >
              {actorBadge.text}
            </span>

            {/* Content line */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-pixel-heading text-[10px] text-zinc-100">
                  {step.action === 'build' ? (
                    <>
                      <span data-num="true" className="font-mono">{step.count}</span>× {unitName}
                    </>
                  ) : step.action === 'reclaim' ? (
                    'RECLAIM'
                  ) : step.action === 'assist' ? (
                    'ASSIST'
                  ) : (
                    'NOTE'
                  )}
                </span>
                {step.text && (
                  <span className="text-zinc-400 text-xs truncate">
                    // {step.text}
                  </span>
                )}
              </div>
            </div>

            {/* Metal & Energy costs */}
            {step.action === 'build' && totalMetal !== null && (
              <div className="shrink-0 flex items-center gap-3">
                <div className="flex items-center gap-1 text-zinc-300" title={`Metal cost: ${totalMetal}`}>
                  <MetalIcon size={12} />
                  <span data-num="true" className="font-mono text-xs">
                    {totalMetal}
                  </span>
                </div>
                {totalEnergy !== null && (
                  <div className="flex items-center gap-1 text-[#fbbf24]" title={`Energy cost: ${totalEnergy}`}>
                    <EnergyIcon size={12} />
                    <span data-num="true" className="font-mono text-xs">
                      {totalEnergy}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
