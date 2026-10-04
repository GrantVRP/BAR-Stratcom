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

export function EconomyChart({
  states,
  plan,
  mapRecord
}: EconomyChartProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<'actual' | 'plan'>('actual');

  const actualSeries = useMemo<ChartSeries | null>(() => {
    if (!states || states.length === 0) return null;

    const points: SimSample[] = states.map((s) => {
      const metal = (s.metal as { current?: number; storage?: number; income?: number; pull?: number; expense?: number }) || {};
      const energy = (s.energy as { current?: number; storage?: number; income?: number; pull?: number; expense?: number }) || {};
      const bp = (s.bp as { total?: number; idle?: number }) || {};
      const clock = typeof s.clock === 'number' ? s.clock : typeof s.frame === 'number' ? s.frame / 30 : 0;

      const mCurrent = metal.current ?? 0;
      const mIncome = metal.income ?? 0;
      const mSpend = metal.pull ?? metal.expense ?? 0;
      const eCurrent = energy.current ?? 0;
      const eIncome = energy.income ?? 0;
      const eSpend = energy.pull ?? energy.expense ?? 0;

      return {
        t: clock,
        metal: {
          current: mCurrent,
          storage: metal.storage ?? 1000,
          income: mIncome,
          spend: mSpend
        },
        energy: {
          current: eCurrent,
          storage: energy.storage ?? 1000,
          income: eIncome,
          spend: eSpend
        },
        bpTotal: bp.total ?? 0,
        bpActive: Math.max(0, (bp.total ?? 0) - (bp.idle ?? 0)),
        stallMetal: mCurrent < 5 && mSpend > mIncome,
        stallEnergy: eCurrent < 20 && eSpend > eIncome
      };
    });

    return {
      points,
      intervals: {
        metalStall: [],
        energyStall: [],
        metalFloat: [],
        energyFloat: []
      },
      totals: {
        metalStallSec: 0,
        energyStallSec: 0,
        idleBpSec: 0
      },
      flags: []
    };
  }, [states]);

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
            NO RECORDED TELEMETRY SERIES FOR THIS SESSION
          </div>
        )
      ) : (
        <SimGraph plan={plan} mapRecord={mapRecord} />
      )}
    </div>
  );
}
