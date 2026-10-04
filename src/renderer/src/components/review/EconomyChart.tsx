import React, { useState, useMemo } from 'react';
import type { BuildPlan, MapRecord } from '../../../../core/schemas';
import type { ChartSeries } from '../../../../core/sim/chart';
import type { SimSample } from '../../../../core/sim/types';
import { SimGraph } from '../plans/SimGraph';
import { Provenance } from '../ui/Provenance';

export interface EconomyChartProps {
  states?: Array<Record<string, unknown>> | null;
  plan?: BuildPlan | null;
  mapRecord?: MapRecord | null;
}

interface RecordedPool {
  current: number;
  storage: number;
  income: number;
  pull?: number;
  expense?: number;
}

/**
 * Your recorded economy as a chart series. Reads the widget's state docs as stored (`gameSeconds`,
 * `res.metal` / `res.energy`, `bp.total` / `bp.active`); spectator docs (no `res`) are skipped.
 */
export function statesToChartSeries(states: EconomyChartProps['states']): ChartSeries | null {
  const points: SimSample[] = [];
  for (const s of states ?? []) {
    const res = s.res as { metal?: RecordedPool; energy?: RecordedPool } | null | undefined;
    if (!res?.metal || !res.energy) continue;
    const bp = (s.bp as { total?: number; active?: number } | undefined) ?? {};
    const t = typeof s.gameSeconds === 'number' ? s.gameSeconds : typeof s.frame === 'number' ? s.frame / 30 : 0;
    const m = res.metal;
    const e = res.energy;
    const mSpend = m.pull ?? m.expense ?? 0;
    const eSpend = e.pull ?? e.expense ?? 0;
    points.push({
      t,
      metal: { current: m.current, storage: m.storage, income: m.income, spend: mSpend },
      energy: { current: e.current, storage: e.storage, income: e.income, spend: eSpend },
      bpTotal: bp.total ?? 0,
      bpActive: bp.active ?? 0,
      stallMetal: m.current < 5 && mSpend > m.income,
      stallEnergy: e.current < 20 && eSpend > e.income
    });
  }
  if (points.length === 0) return null;
  return {
    points,
    intervals: { metalStall: [], energyStall: [], metalFloat: [], energyFloat: [] },
    totals: { metalStallSec: 0, energyStallSec: 0, idleBpSec: 0 },
    flags: []
  };
}

export function EconomyChart({
  states,
  plan,
  mapRecord
}: EconomyChartProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<'actual' | 'plan'>('actual');

  const actualSeries = useMemo(() => statesToChartSeries(states), [states]);

  const hasPlan = !!plan;

  return (
    <div
      data-testid="review-economy-chart"
      className="pixel-box space-y-2 border-2 border-black bg-[#12131a] p-3 shadow-[2px_2px_0px_#000]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
            ECONOMY RUN
          </span>
          <Provenance kind={viewMode === 'actual' ? 'MEASURED' : 'SIMULATED'} />
        </div>

        {hasPlan && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="eco-toggle-actual"
              onClick={() => setViewMode('actual')}
              className={`cursor-pointer px-2 py-1 font-['Press_Start_2P'] text-[10px] ${
                viewMode === 'actual'
                  ? 'border border-black bg-[#4ade80] text-black'
                  : 'border border-zinc-800 bg-[#0d0f17] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ACTUAL (MEASURED)
            </button>
            <button
              type="button"
              data-testid="eco-toggle-plan"
              onClick={() => setViewMode('plan')}
              className={`cursor-pointer px-2 py-1 font-['Press_Start_2P'] text-[10px] ${
                viewMode === 'plan'
                  ? 'border border-black bg-[#449bed] text-black'
                  : 'border border-zinc-800 bg-[#0d0f17] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              PLAN SIM (SIMULATED)
            </button>
          </div>
        )}
      </div>

      {viewMode === 'actual' ? (
        actualSeries ? (
          <SimGraph chartSeries={actualSeries} />
        ) : (
          <div className="p-4 text-center font-mono text-xs text-zinc-500">
            NO RECORDED DATA
          </div>
        )
      ) : (
        <SimGraph plan={plan} mapRecord={mapRecord} />
      )}
    </div>
  );
}
