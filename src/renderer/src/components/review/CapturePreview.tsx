import React, { useEffect, useState } from 'react';
import type { BuildPlan, MapRecord, PlanValidationResult } from '../../../../core/schemas';
import { ipcClient } from '../../lib/ipc-client';
import { PlanTimeline } from '../plans/PlanTimeline';
import { FactionTag } from '../ui/FactionTag';
import { SimGraph } from '../plans/SimGraph';

export interface CapturePreviewProps {
  plan: BuildPlan;
  issues: PlanValidationResult;
  /** The session's map, so the simulation uses its wind and mex data when we have them. */
  mapScriptName: string;
}

type PreviewTab = 'timeline' | 'graph';

function tabClass(active: boolean): string {
  return `cursor-pointer border px-2 py-0.5 font-['Press_Start_2P'] text-[10px] ${
    active ? 'border-black bg-[#449bed] text-black' : 'border-zinc-800 bg-[#0d0f17] text-zinc-400'
  }`;
}

const tagClass = "border border-zinc-800 bg-[#12131a] px-2 py-0.5 font-['Press_Start_2P'] text-[10px]";

/** Captured plan preview: summary tags, validation, then timeline or simulated economy (06 §4.6). */
export function CapturePreview({ plan, issues, mapScriptName }: CapturePreviewProps): React.JSX.Element {
  const [tab, setTab] = useState<PreviewTab>('timeline');
  const [mapRecord, setMapRecord] = useState<MapRecord | null>(null);

  useEffect(() => {
    let active = true;
    void ipcClient.invoke('maps:list').then((res) => {
      if (active && res.ok) setMapRecord(res.data.find((m) => m.scriptName === mapScriptName) ?? null);
    });
    return () => {
      active = false;
    };
  }, [mapScriptName]);
  const errorCount = issues.errors.length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <FactionTag factionId={plan.factionId} />
          <span className={`${tagClass} text-[#449bed]`}>{plan.opening.toUpperCase()}</span>
          <span className={`${tagClass} text-[#fbbf24]`}>{plan.energyStyle.toUpperCase()}</span>
          <span className="font-mono text-sm text-zinc-300">{plan.steps.length} STEPS</span>
          <span
            data-testid="capture-validation-badge"
            className={`font-['Press_Start_2P'] text-[10px] ${errorCount === 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}
          >
            {errorCount === 0 ? 'VALID' : `${errorCount} ERRORS`}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="btn-preview-timeline"
            onClick={() => setTab('timeline')}
            className={tabClass(tab === 'timeline')}
          >
            TIMELINE
          </button>
          <button
            type="button"
            data-testid="btn-preview-sim"
            onClick={() => setTab('graph')}
            className={tabClass(tab === 'graph')}
          >
            SIM GRAPH
          </button>
        </div>
      </div>

      {errorCount > 0 && (
        <ul data-testid="capture-validation-errors" className="space-y-1 font-mono text-sm text-[#f87171]">
          {issues.errors.map((issue, i) => (
            <li key={`${issue.code}-${issue.stepId ?? i}`}>
              {issue.code} {issue.stepId ? `[${issue.stepId}] ` : ''}
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      {tab === 'timeline' ? (
        <div data-testid="capture-preview-timeline" className="max-h-72 overflow-y-auto">
          <PlanTimeline plan={plan} />
        </div>
      ) : (
        <div data-testid="capture-preview-graph">
          <SimGraph plan={plan} mapRecord={mapRecord} />
        </div>
      )}
    </div>
  );
}
