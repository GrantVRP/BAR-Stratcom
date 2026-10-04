import React from 'react';
import type { SessionReportBenchmark } from '../../../../core/schemas/report';
import { Provenance } from '../ui/Provenance';

export interface BenchmarkChartProps {
  benchmark?: SessionReportBenchmark | null;
}

export function BenchmarkChart({ benchmark }: BenchmarkChartProps): React.JSX.Element {
  const hasData = benchmark && (benchmark.percentileMetalAt300 !== null || benchmark.percentileMetalAt600 !== null);

  return (
    <div
      data-testid="review-benchmark-chart"
      className="pixel-box space-y-3 border-2 border-black bg-[#12131a] p-3 shadow-[2px_2px_0px_#000]"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
          PRO BENCHMARK COMPARISON
        </span>
        <Provenance kind="ESTIMATED" />
      </div>

      {hasData ? (
        <div className="grid grid-cols-2 gap-3 p-2">
          <div className="border border-zinc-800 bg-[#0d0f17] p-2">
            <div className="font-['Press_Start_2P'] text-[10px] text-zinc-400">
              METAL INCOME @ 5:00
            </div>
            <div data-num="true" className="mt-1 font-mono text-sm font-bold text-zinc-100">
              {benchmark.percentileMetalAt300 !== null
                ? `p${Math.round(benchmark.percentileMetalAt300 * 100)}`
                : 'N/A'}
            </div>
          </div>
          <div className="border border-zinc-800 bg-[#0d0f17] p-2">
            <div className="font-['Press_Start_2P'] text-[10px] text-zinc-400">
              METAL INCOME @ 10:00
            </div>
            <div data-num="true" className="mt-1 font-mono text-sm font-bold text-zinc-100">
              {benchmark.percentileMetalAt600 !== null
                ? `p${Math.round(benchmark.percentileMetalAt600 * 100)}`
                : 'N/A'}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-[#0d0f17] p-6 text-center">
          <div className="font-['Press_Start_2P'] text-[10px] text-[#fbbf24]">
            NO BENCHMARK YET
          </div>
          <div className="mt-2 font-mono text-xs text-zinc-400">
            Pro benchmarks unlock in Milestone M08 (P25–P75 baseline distributions).
          </div>
        </div>
      )}
    </div>
  );
}
