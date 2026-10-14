import React from 'react';
import type { SessionReportMetrics } from '../../../../core/schemas/report';
import { Provenance } from '../ui/Provenance';

export interface MetricTilesProps {
  metrics: SessionReportMetrics;
}

interface TileItem {
  id: string;
  testId: string;
  label: string;
  value: string;
  status: 'normal' | 'warn' | 'danger' | 'good';
}

export function MetricTiles({ metrics }: MetricTilesProps): React.JSX.Element {
  const tiles: TileItem[] = [
    {
      id: 'energy-stall',
      testId: 'metric-tile-energy-stall',
      label: 'ENERGY STALL',
      value: `${metrics.energyStallSec.toFixed(1)}s`,
      status: metrics.energyStallSec > 15 ? 'danger' : metrics.energyStallSec > 5 ? 'warn' : 'good'
    },
    {
      id: 'metal-stall',
      testId: 'metric-tile-metal-stall',
      label: 'METAL STALL',
      value: `${metrics.metalStallSec.toFixed(1)}s`,
      status: metrics.metalStallSec > 15 ? 'danger' : metrics.metalStallSec > 5 ? 'warn' : 'good'
    },
    {
      id: 'metal-float',
      testId: 'metric-tile-metal-float',
      label: 'METAL FLOAT',
      value: `${metrics.metalFloatSec.toFixed(1)}s`,
      status: metrics.metalFloatSec > 30 ? 'warn' : 'normal'
    },
    {
      id: 'idle-factory',
      testId: 'metric-tile-idle-factory',
      label: 'IDLE FACTORY',
      value: `${metrics.idleFactorySec.toFixed(1)}s`,
      status: metrics.idleFactorySec > 15 ? 'danger' : metrics.idleFactorySec > 5 ? 'warn' : 'good'
    },
    {
      id: 'idle-builders',
      testId: 'metric-tile-idle-builders',
      label: 'IDLE BUILDERS',
      value: `${metrics.idleBuilderSec.toFixed(1)}s`,
      status: metrics.idleBuilderSec > 30 ? 'warn' : 'normal'
    },
    {
      id: 'idle-commander',
      testId: 'metric-tile-idle-commander',
      label: 'IDLE COMMANDER',
      value: `${metrics.idleCommanderSec.toFixed(1)}s`,
      status: metrics.idleCommanderSec > 20 ? 'danger' : metrics.idleCommanderSec > 8 ? 'warn' : 'good'
    },
    {
      id: 'bp-utilisation',
      testId: 'metric-tile-bp-utilisation',
      label: 'BP UTILISATION',
      value: `${Math.round(metrics.bpUtilisation * 100)}%`,
      status: metrics.bpUtilisation >= 0.75 ? 'good' : metrics.bpUtilisation < 0.5 ? 'danger' : 'warn'
    }
  ];

  // one provenance label for the whole group; each tile leads with its number
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-400">MATCH METRICS</span>
        <Provenance kind="MEASURED" />
      </div>
      <div data-testid="metric-tiles-grid" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            data-testid={tile.testId}
            className="flex flex-col gap-1 rounded border border-zinc-800 bg-[#12131a] p-3"
          >
            <div
              data-num="true"
              className={`font-mono text-xl font-bold tabular-nums ${
                tile.status === 'danger'
                  ? 'text-[#f87171]'
                  : tile.status === 'warn'
                    ? 'text-[#fbbf24]'
                    : tile.status === 'good'
                      ? 'text-[#4ade80]'
                      : 'text-zinc-200'
              }`}
            >
              {tile.value}
            </div>
            <span className="font-mono text-[11px] uppercase leading-tight text-zinc-400">{tile.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
