import React from 'react';
import type { SessionReportStep } from '../../../../core/schemas/report';
import type { BuildPlan } from '../../../../core/schemas/plans';
import { Provenance } from '../ui/Provenance';

export interface StepAdherenceChartProps {
  steps: SessionReportStep[];
  plan?: BuildPlan | null;
}

function formatMss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StepAdherenceChart({
  steps,
  plan
}: StepAdherenceChartProps): React.JSX.Element {
  if (steps.length === 0) {
    return (
      <div
        data-testid="step-adherence-chart"
        className="pixel-box border-2 border-black bg-[#12131a] p-4 text-center text-xs text-zinc-500"
      >
        NO PLAN STEPS TO EVALUATE
      </div>
    );
  }

  const completedSteps = steps.filter((s) => s.actualFinish !== null);
  const onTimeSteps = steps.filter(
    (s) => s.actualFinish !== null && s.deltaSec !== null && s.deltaSec <= 5
  );

  return (
    <div
      data-testid="step-adherence-chart"
      className="pixel-box space-y-3 border-2 border-black bg-[#12131a] p-3 shadow-[2px_2px_0px_#000]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
            STEP ADHERENCE TIMELINE
          </span>
          <Provenance kind="MEASURED" />
        </div>
        <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-zinc-400">
          <span>
            COMPLETED: <strong className="text-zinc-200">{completedSteps.length}/{steps.length}</strong>
          </span>
          <span>
            ON TIME: <strong className="text-[#4ade80]">{onTimeSteps.length}/{steps.length}</strong>
          </span>
        </div>
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {steps.map((step, idx) => {
          const planStep = plan?.steps.find((s) => s.id === step.stepId) ?? plan?.steps[idx];
          const actorKind = planStep?.actor.kind === 'commander' ? 'CDR' : planStep?.actor.kind === 'factory' ? 'FAC' : 'CON';
          const unitName = planStep?.unitId ?? 'Step';
          const count = planStep?.count ?? 1;

          const isMissed = step.actualFinish === null;
          const delta = step.deltaSec ?? 0;
          const isEarlyOrOnTime = !isMissed && delta <= 0;
          const isSlightlyLate = !isMissed && delta > 0 && delta <= 10;
          const isVeryLate = !isMissed && delta > 10;

          // Bar magnitude capped at 30s for 100%
          const barWidthPercent = Math.min(100, (Math.abs(delta) / 30) * 100);

          return (
            <div
              key={step.stepId || idx}
              data-testid={`adherence-row-${idx}`}
              className="flex items-center gap-3 border border-zinc-900 bg-[#0d0f17] px-2.5 py-1.5 text-xs hover:border-zinc-700"
            >
              {/* Step info */}
              <div className="w-6 shrink-0 font-mono text-zinc-500 tabular-nums">
                #{idx + 1}
              </div>
              <div className="w-10 shrink-0 font-['Press_Start_2P'] text-[10px] text-zinc-400">
                {actorKind}
              </div>
              <div className="w-36 shrink-0 truncate font-mono text-zinc-200">
                {count > 1 ? `${count}× ` : ''}
                {unitName}
              </div>

              {/* Planned vs Actual times */}
              <div className="flex w-32 shrink-0 items-center gap-1.5 font-mono tabular-nums">
                <span className="text-zinc-400" title="Planned">
                  {formatMss(step.plannedFinish)}
                </span>
                <span className="text-zinc-600">▸</span>
                <span
                  className={
                    isMissed
                      ? 'text-[#f87171]'
                      : isEarlyOrOnTime
                        ? 'text-[#4ade80]'
                        : 'text-zinc-200'
                  }
                  title="Actual"
                >
                  {isMissed ? 'MISSED' : formatMss(step.actualFinish!)}
                </span>
              </div>

              {/* Delta bar */}
              <div className="relative hidden h-3 flex-1 overflow-hidden bg-zinc-900 sm:block">
                {!isMissed && (
                  <div
                    className={`h-full ${
                      isEarlyOrOnTime
                        ? 'bg-[#4ade80]'
                        : isSlightlyLate
                          ? 'bg-[#fbbf24]'
                          : 'bg-[#f87171]'
                    }`}
                    style={{ width: `${barWidthPercent}%` }}
                  />
                )}
              </div>

              {/* Delta badge */}
              <div className="w-20 shrink-0 text-right">
                {isMissed ? (
                  <span className="border border-[#f87171] bg-[#2a1318] px-1 py-0.5 font-['Press_Start_2P'] text-[10px] text-[#f87171]">
                    SKIP
                  </span>
                ) : isEarlyOrOnTime ? (
                  <span className="font-mono text-xs font-bold tabular-nums text-[#4ade80]">
                    {delta === 0 ? '0s' : `${delta.toFixed(0)}s`}
                  </span>
                ) : (
                  <span
                    className={`font-mono text-xs font-bold tabular-nums ${
                      isVeryLate ? 'text-[#f87171]' : 'text-[#fbbf24]'
                    }`}
                  >
                    +{delta.toFixed(0)}s
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
