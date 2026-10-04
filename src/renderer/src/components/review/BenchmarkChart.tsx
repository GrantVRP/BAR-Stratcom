import React, { useEffect, useMemo, useState } from 'react';
import { benchmarkKeyFor, isEarlyData } from '../../../../core/benchmarks';
import type { BenchmarkFile, SessionMeta } from '../../../../core/schemas';
import type { SessionReportBenchmark } from '../../../../core/schemas/report';
import { ipcClient } from '../../lib/ipc-client';
import { factionAccent } from '../../lib/faction-style';
import { Provenance } from '../ui/Provenance';

export interface BenchmarkChartProps {
  /** Report percentiles at 5:00 / 10:00 (0–100). */
  benchmark?: SessionReportBenchmark | null;
  meta?: SessionMeta | null;
  /** Recorded state docs of the session (your metal income line). */
  states?: Array<Record<string, unknown>> | null;
}

const W = 560;
const H = 170;
const PAD = { l: 36, r: 8, t: 8, b: 20 };
const BAND = '#94a3b8';

const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/** Your metal income from the recorded state docs (player sessions only; every 5 s). */
export function playerMetalIncome(states: BenchmarkChartProps['states']): Array<{ t: number; v: number }> {
  const out: Array<{ t: number; v: number }> = [];
  for (const s of states ?? []) {
    const t = typeof s.gameSeconds === 'number' ? s.gameSeconds : null;
    const income = (s.res as { metal?: { income?: unknown } } | null | undefined)?.metal?.income;
    if (t === null || typeof income !== 'number' || Math.round(t) % 5 !== 0) continue;
    if (out.length > 0 && out[out.length - 1]!.t === Math.round(t)) continue;
    out.push({ t: Math.round(t), v: income });
  }
  return out;
}

function PercentileTile({ label, value }: { label: string; value: number | null | undefined }): React.JSX.Element {
  return (
    <div className="border border-zinc-800 bg-[#0d0f17] p-2">
      <div className="font-['Press_Start_2P'] text-[10px] text-zinc-400">{label}</div>
      <div data-num="true" className="mt-1 font-mono text-sm font-bold text-zinc-100">
        {value === null || value === undefined ? 'N/A' : `p${Math.round(value)}`}
      </div>
    </div>
  );
}

export function BenchmarkChart({ benchmark, meta, states }: BenchmarkChartProps): React.JSX.Element {
  const key = useMemo(() => (meta ? benchmarkKeyFor(meta.teams) : null), [meta]);
  // the fetched file together with the key it belongs to, so a stale answer is never shown
  const [fetched, setFetched] = useState<{ key: typeof key; bench: BenchmarkFile | null } | null>(null);
  const bench = fetched && fetched.key === key ? fetched.bench : null;

  useEffect(() => {
    let current = true;
    if (!key) return;
    ipcClient
      .invoke('benchmarks:get', key)
      .then((res) => {
        if (current) setFetched({ key, bench: res.ok ? res.data : null });
      })
      .catch(() => {
        if (current) setFetched({ key, bench: null });
      });
    return () => {
      current = false;
    };
  }, [key]);

  const mine = useMemo(() => playerMetalIncome(states), [states]);
  const accent = factionAccent(key?.factionId);

  const chart = useMemo(() => {
    if (!bench || bench.series.length < 2) return null;
    const tMax = bench.series[bench.series.length - 1]!.t;
    const you = mine.filter((p) => p.t <= tMax);
    const yMax = Math.max(1, ...bench.series.map((p) => p.metalIncome.p75), ...you.map((p) => p.v)) * 1.1;
    const x = (t: number): number => PAD.l + (t / tMax) * (W - PAD.l - PAD.r);
    const y = (v: number): number => H - PAD.b - (v / yMax) * (H - PAD.t - PAD.b);
    const pts = (list: Array<[number, number]>): string => list.map(([a, b]) => `${x(a).toFixed(1)},${y(b).toFixed(1)}`).join(' ');
    return {
      tMax,
      yMax,
      x,
      y,
      band: pts([
        ...bench.series.map((p): [number, number] => [p.t, p.metalIncome.p75]),
        ...[...bench.series].reverse().map((p): [number, number] => [p.t, p.metalIncome.p25])
      ]),
      median: pts(bench.series.map((p) => [p.t, p.metalIncome.p50])),
      you: you.length > 1 ? pts(you.map((p) => [p.t, p.v])) : null
    };
  }, [bench, mine]);

  return (
    <div
      data-testid="review-benchmark-chart"
      className="pixel-box space-y-3 border-2 border-black bg-[#12131a] p-3 shadow-[2px_2px_0px_#000]"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">PRO BENCHMARK: METAL INCOME</span>
        <div className="flex items-center gap-2">
          {bench && isEarlyData(bench) && (
            <span data-testid="benchmark-early-data" className="font-mono text-[10px] font-bold uppercase text-[#fbbf24]">
              EARLY DATA
            </span>
          )}
          <Provenance kind="MEASURED" tooltip="Band measured from recorded pro games" />
        </div>
      </div>

      {bench && chart ? (
        <>
          <div className="font-mono text-[11px] text-zinc-400">
            {bench.factionId.toUpperCase()} {bench.mode.toUpperCase()} · <span data-num="true">{bench.sampleCount}</span> PRO
            PLAYERS · METAL/S
          </div>
          <svg data-testid="benchmark-band-chart" viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Pro metal income band and your metal income">
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={PAD.l} x2={W - PAD.r} y1={chart.y(chart.yMax * f)} y2={chart.y(chart.yMax * f)} stroke="#27272a" />
                <text x={PAD.l - 4} y={chart.y(chart.yMax * f) + 3} textAnchor="end" fontSize="10" fill="#71717a" fontFamily="JetBrains Mono, monospace">
                  {Math.round(chart.yMax * f)}
                </text>
              </g>
            ))}
            {Array.from({ length: Math.floor(chart.tMax / 120) + 1 }, (_, i) => i * 120).map((t) => (
              <text key={t} x={chart.x(t)} y={H - 6} textAnchor="middle" fontSize="10" fill="#71717a" fontFamily="JetBrains Mono, monospace">
                {mmss(t)}
              </text>
            ))}
            <polygon data-testid="benchmark-band" points={chart.band} fill={BAND} fillOpacity={0.18} stroke="none" />
            <polyline points={chart.median} fill="none" stroke={BAND} strokeWidth={1.5} strokeDasharray="4 3" />
            {chart.you && <polyline data-testid="benchmark-you" points={chart.you} fill="none" stroke={accent} strokeWidth={2} />}
          </svg>
          <div className="flex flex-wrap gap-4 font-mono text-[10px] text-zinc-400">
            <span><span className="mr-1 inline-block h-2 w-4 align-middle" style={{ backgroundColor: BAND, opacity: 0.4 }} />PRO P25-P75</span>
            <span><span className="mr-1 inline-block w-4 border-t border-dashed align-middle" style={{ borderColor: BAND }} />PRO MEDIAN</span>
            <span><span className="mr-1 inline-block w-4 border-t-2 align-middle" style={{ borderColor: accent }} />YOU</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PercentileTile label="METAL INCOME @ 5:00" value={benchmark?.percentileMetalAt300} />
            <PercentileTile label="METAL INCOME @ 10:00" value={benchmark?.percentileMetalAt600} />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-[#0d0f17] p-6 text-center">
          <div className="font-['Press_Start_2P'] text-[10px] text-[#fbbf24]">NO PRO BENCHMARK</div>
          <div className="mt-2 font-mono text-xs text-zinc-400">
            {key
              ? `No pro data for ${key.factionId} ${key.mode} yet.`
              : 'Only for your own games.'}
          </div>
        </div>
      )}
    </div>
  );
}
