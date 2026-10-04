import React from 'react';
import type { LiveSnapshot } from '../../../../core/schemas/live';
import type { CoachProjections } from '../../../../core/schemas/coach';
import { MetalIcon } from '../ui/MetalIcon';
import { EnergyIcon } from '../ui/EnergyIcon';

export interface CoachTelemetryProps {
  snapshot?: LiveSnapshot | null;
  projections?: CoachProjections | null;
  className?: string;
}

function renderBar(current: number, storage: number, fillColor: string): React.JSX.Element {
  const pct = storage > 0 ? Math.min(100, Math.max(0, (current / storage) * 100)) : 0;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#18181b]">
      <div className={`h-full transition-all duration-300 ${fillColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CoachTelemetry({
  snapshot,
  projections,
  className = ''
}: CoachTelemetryProps): React.JSX.Element {
  const res = snapshot?.res;
  const bp = snapshot?.bp;

  if (!res) {
    return (
      <div
        data-testid="coach-telemetry-empty"
        className={`rounded border border-[#27272a] bg-[#12131a] p-3 font-mono text-xs text-[#71717a] ${className}`}
      >
        <div className="flex items-center justify-between">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#a1a1aa]">TELEMETRY</span>
          <span className="rounded bg-[#1e293b] px-1.5 py-0.5 text-[10px] text-[#94a3b8]">WAITING</span>
        </div>
        <p className="mt-2 text-center text-[#71717a] italic">
          Waiting for game data.
        </p>
      </div>
    );
  }

  const bpTotal = bp?.total ?? 0;
  const bpActive = bp?.active ?? 0;
  const bpPct = bpTotal > 0 ? Math.round((bpActive / bpTotal) * 100) : 0;

  return (
    <div
      data-testid="coach-telemetry"
      className={`rounded border border-[#27272a] bg-[#12131a] p-3 font-mono text-xs space-y-2.5 ${className}`}
    >
      {/* Metal Row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[#e4e4e7]">
            <MetalIcon className="h-3.5 w-3.5 text-[#94a3b8]" />
            <span>METAL</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#e4e4e7]">
              {Math.round(res.metal.current)} / {Math.round(res.metal.storage)}
            </span>
            <span className="text-[#4ade80]">+{res.metal.income.toFixed(1)}</span>
            <span className="text-[#f87171]">−{res.metal.expense.toFixed(1)}</span>
            <span className="rounded bg-[#182334] px-1 py-0.2 text-[10px] text-[#38bdf8] border border-[#38bdf8]/30">
              MEASURED
            </span>
          </div>
        </div>
        {renderBar(res.metal.current, res.metal.storage, 'bg-[#94a3b8]')}
        {projections?.metalEmptyInSec !== null &&
          projections?.metalEmptyInSec !== undefined &&
          projections.metalEmptyInSec <= 15 && (
            <div className="text-[10px] text-[#f87171] font-bold">
              ⚠ M-STALL IN {projections.metalEmptyInSec}s
            </div>
          )}
      </div>

      {/* Energy Row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[#fbbf24]">
            <EnergyIcon className="h-3.5 w-3.5 text-[#fbbf24]" />
            <span>ENERGY</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#e4e4e7]">
              {Math.round(res.energy.current)} / {Math.round(res.energy.storage)}
            </span>
            <span className="text-[#4ade80]">+{Math.round(res.energy.income)}</span>
            <span className="text-[#f87171]">−{Math.round(res.energy.expense)}</span>
            <span className="rounded bg-[#182334] px-1 py-0.2 text-[10px] text-[#38bdf8] border border-[#38bdf8]/30">
              MEASURED
            </span>
          </div>
        </div>
        {renderBar(res.energy.current, res.energy.storage, 'bg-[#fbbf24]')}
        {projections?.energyEmptyInSec !== null &&
          projections?.energyEmptyInSec !== undefined &&
          projections.energyEmptyInSec <= 15 && (
            <div className="text-[10px] text-[#f87171] font-bold">
              ⚠ E-STALL IN {projections.energyEmptyInSec}s
            </div>
          )}
      </div>

      {/* BP Row */}
      <div className="flex items-center justify-between border-t border-[#1f2430] pt-1.5 text-[11px]">
        <span className="text-[#a1a1aa]">
          BP{' '}
          <span className="text-[#e4e4e7] font-bold">
            {bpActive}/{bpTotal}
          </span>{' '}
          used <span className="text-[#38bdf8] font-bold">{bpPct}%</span>
        </span>
        {snapshot.commander && (
          <span className="text-[#a1a1aa] text-[10px]">
            CDR: {snapshot.commander.alive ? (snapshot.commander.idle ? 'IDLE' : 'BUSY') : 'FALLEN'}
          </span>
        )}
      </div>
    </div>
  );
}
