import React from 'react';
import type { MapRecord } from '../../../../core/schemas';
import type { IpcResponseData } from '../../../../shared';
import { Provenance } from '../ui/Provenance';
import { PlanTimeline } from './PlanTimeline';
import { SimGraph } from './SimGraph';
import { ValidationPanel } from './ValidationPanel';

export type AiDraftResultData = IpcResponseData<'ai:draft'>;

export interface AiDraftResultProps {
  result: AiDraftResultData;
  map: MapRecord | null;
}

/** An AI draft as returned by the pipeline: report first, then the plan if there is one. */
export function AiDraftResult({ result, map }: AiDraftResultProps): React.JSX.Element {
  const { plan, report } = result;
  const repairs = result.rounds - 1;

  return (
    <div data-testid="ai-draft-result" className="space-y-4 font-mono text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Provenance kind="AI DRAFT" />
        {plan && <span className="font-pixel-heading text-[10px] text-zinc-100">{plan.title}</span>}
        <span className="text-zinc-400">
          {result.provider} // {result.model} // {repairs === 0 ? 'first try': `${repairs} ${repairs === 1 ? 'repair': 'repairs'}`}
        </span>
      </div>

      {!plan && (
        <p data-testid="ai-draft-unusable" className="text-[#f87171]">
          The model did not return a usable plan. Try again, or try another model.
        </p>
      )}

      <ValidationPanel title="CHECKED AGAINST YOUR GAME DATA" validation={{ errors: report.errors, warnings: report.warnings }} />

      {plan && report.errors.length > 0 && (
        <p className="text-zinc-400">Plans with errors cannot be saved. Draft again or pick another model.</p>
      )}

      {plan && report.sim && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3 font-pixel-heading text-[10px] text-zinc-400">
            <span>ECONOMY</span>
            <span data-num="true" className="font-mono text-zinc-300">
              E-STALL {report.sim.energyStallSec}s // M-STALL {report.sim.metalStallSec}s
            </span>
            {report.sim.flags.includes('windUnknown') && (
              <span data-testid="ai-draft-wind-unknown" className="font-mono text-[#fbbf24]">Wind unknown: pick a map for real numbers</span>
            )}
          </div>
          <SimGraph plan={plan} mapRecord={map} />
        </div>
      )}

      {plan && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 font-pixel-heading text-[10px] text-zinc-400">
            <span>
              STEPS (<span data-num="true">{plan.steps.length}</span>)
            </span>
            <Provenance kind="MEASURED" tooltip="Unit costs from your game's unit data" />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <PlanTimeline plan={plan} />
          </div>
        </div>
      )}
    </div>
  );
}
