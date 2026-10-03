import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { BuildPlan, MapRecord } from '../../../../core/schemas';
import { simulate, toChartSeries, type ChartSeries, type SimInput } from '../../../../core/sim';
import { avgWindFor } from '../../../../core/maps';
import { Provenance } from '../ui/Provenance';
import { MetalIcon } from '../ui/MetalIcon';
import { EnergyIcon } from '../ui/EnergyIcon';
import { useSnapshot } from '../../stores';
import { getClientRegistry } from '../../lib/registry';
import { AVG_WIND_TABLE } from '../../lib/wind-table';

export interface SimGraphProps {
  plan?: BuildPlan | null;
  mapRecord?: MapRecord | null;
  chartSeries?: ChartSeries | null;
  className?: string;
}

function createSteppedPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  let d = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const next = points[i + 1]!;
    d += ` H ${next.x.toFixed(1)} V ${next.y.toFixed(1)}`;
  }
  return d;
}

function formatMss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SimGraph({
  plan,
  mapRecord,
  chartSeries: externalSeries,
  className = ''
}: SimGraphProps): React.JSX.Element {
  const [hoveredT, setHoveredT] = useState<number | null>(null);
  const [metric, setMetric] = useState<'stored' | 'flow'>('stored');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const snapshot = useSnapshot((s) => s.snapshot);

  const series = useMemo<ChartSeries | null>(() => {
    if (externalSeries) return externalSeries;
    if (!plan || !snapshot) return null;

    try {
      const registry = getClientRegistry(snapshot);
      const windAvg = mapRecord ? avgWindFor(mapRecord, AVG_WIND_TABLE) : null;
      const simInput: SimInput = {
        registry,
        plan,
        map: {
          windAvg,
          windMin: mapRecord?.wind.min ?? 0,
          windMax: mapRecord?.wind.max ?? 0,
          tidalStrength: mapRecord?.tidalStrength ?? 0,
          mexYield: mapRecord?.mexYield?.value ?? 1.5,
          mexYieldProvenance: mapRecord?.mexYield?.provenance ?? 'estimated'
        }
      };
      const result = simulate(simInput);
      return toChartSeries(result);
    } catch {
      return null;
    }
  }, [externalSeries, plan, mapRecord, snapshot]);

  const viewWidth = 640;
  const viewHeight = 160;
  const padLeft = 45;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 25;
  const graphWidth = viewWidth - padLeft - padRight;
  const graphHeight = viewHeight - padTop - padBottom;

  const points = useMemo(() => series?.points ?? [], [series]);
  const maxT = Math.max(60, points[points.length - 1]?.t ?? 300);

  const getX = useCallback((t: number) => padLeft + (t / maxT) * graphWidth, [padLeft, maxT, graphWidth]);

  const { minY, maxY, rangeY } = useMemo(() => {
    if (points.length === 0) return { minY: 0, maxY: 100, rangeY: 100 };
    if (metric === 'stored') {
      const vals = points.flatMap((p) => [p.metal.current, p.energy.current]);
      const max = Math.max(100, Math.ceil(Math.max(...vals) * 1.1));
      return { minY: 0, maxY: max, rangeY: max };
    }
    const vals = points.flatMap((p) => [
      p.metal.income - p.metal.spend,
      p.energy.income - p.energy.spend
    ]);
    const min = Math.min(-10, Math.floor(Math.min(...vals) * 1.1));
    const max = Math.max(20, Math.ceil(Math.max(...vals) * 1.1));
    return { minY: min, maxY: max, rangeY: max - min || 1 };
  }, [points, metric]);

  const getY = useCallback(
    (v: number) => padTop + (1 - (v - minY) / rangeY) * graphHeight,
    [padTop, minY, rangeY, graphHeight]
  );

  const metalPoints = useMemo(() => {
    return points.map((p) => ({
      x: getX(p.t),
      y: getY(metric === 'stored' ? p.metal.current : p.metal.income - p.metal.spend)
    }));
  }, [points, metric, getX, getY]);

  const energyPoints = useMemo(() => {
    return points.map((p) => ({
      x: getX(p.t),
      y: getY(metric === 'stored' ? p.energy.current : p.energy.income - p.energy.spend)
    }));
  }, [points, metric, getX, getY]);

  const metalPath = useMemo(() => createSteppedPath(metalPoints), [metalPoints]);
  const energyPath = useMemo(() => createSteppedPath(energyPoints), [energyPoints]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>): void => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * viewWidth;
    const clampedX = Math.max(padLeft, Math.min(padLeft + graphWidth, svgX));
    const t = ((clampedX - padLeft) / graphWidth) * maxT;
    setHoveredT(t);
  };

  const scrubPoint = useMemo(() => {
    if (hoveredT === null || points.length === 0) return null;
    return points.reduce((prev, curr) =>
      Math.abs(curr.t - hoveredT) < Math.abs(prev.t - hoveredT) ? curr : prev
    );
  }, [hoveredT, points]);

  if (!series || points.length === 0) {
    return (
      <div className={`p-4 pixel-box bg-[#0c0e18] text-center text-xs text-zinc-500 ${className}`}>
        SIMULATION DATA UNAVAILABLE
      </div>
    );
  }

  const allStalls = [...series.intervals.metalStall, ...series.intervals.energyStall];
  const allFloats = [...series.intervals.metalFloat, ...series.intervals.energyFloat];

  return (
    <div className={`p-3 pixel-box bg-[#0c0e18] space-y-2 select-none ${className}`} data-testid="sim-graph">
      {/* Top Header & Telemetry */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Provenance kind="SIMULATED" />
          {series.flags.map((flag) => (
            <span
              key={flag}
              data-testid={`sim-flag-${flag}`}
              className="px-1.5 py-0.5 border border-zinc-700 bg-zinc-900 text-zinc-400 font-pixel-heading text-[10px]"
            >
              {flag === 'windUnknown' ? 'WIND UNKNOWN' : flag === 'mexYieldEstimated' ? 'ESTIMATED MEX' : flag.toUpperCase()}
            </span>
          ))}
        </div>

        {/* Scrubber readout or Mode buttons */}
        <div className="flex items-center gap-3">
          {scrubPoint ? (
            <div data-testid="scrubber-readout" className="flex items-center gap-3 pixel-box-inset px-2 py-0.5 bg-[#090b14] text-[10px]">
              <span data-num="true" className="font-mono text-zinc-400">T+{formatMss(scrubPoint.t)}</span>
              <span className="flex items-center gap-1 text-zinc-300">
                <MetalIcon size={12} />
                <span data-num="true" className="font-mono">
                  {metric === 'stored' ? Math.round(scrubPoint.metal.current) : (scrubPoint.metal.income - scrubPoint.metal.spend).toFixed(1)}
                </span>
              </span>
              <span className="flex items-center gap-1 text-[#fbbf24]">
                <EnergyIcon size={12} />
                <span data-num="true" className="font-mono">
                  {metric === 'stored' ? Math.round(scrubPoint.energy.current) : (scrubPoint.energy.income - scrubPoint.energy.spend).toFixed(1)}
                </span>
              </span>
              {(scrubPoint.stallMetal || scrubPoint.stallEnergy) && (
                <span className="font-pixel-heading text-[10px] text-red-400">STALL</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMetric('stored')}
                className={`px-1.5 py-0.5 font-pixel-heading text-[10px] border transition-none cursor-pointer ${
                  metric === 'stored' ? 'border-[#449bed] bg-[#0a1c32] text-[#449bed]' : 'border-zinc-800 text-zinc-500'
                }`}
              >
                STORED
              </button>
              <button
                type="button"
                onClick={() => setMetric('flow')}
                className={`px-1.5 py-0.5 font-pixel-heading text-[10px] border transition-none cursor-pointer ${
                  metric === 'flow' ? 'border-[#449bed] bg-[#0a1c32] text-[#449bed]' : 'border-zinc-800 text-zinc-500'
                }`}
              >
                FLOW
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        className="w-full h-32 overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredT(null)}
        onPointerLeave={() => setHoveredT(null)}
      >
        <defs>
          <pattern id="stallHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Hatched Stall Intervals */}
        {allStalls.map((interval, idx) => {
          const x = getX(interval.start);
          const w = Math.max(2, getX(interval.end) - x);
          return (
            <rect
              key={`stall-${idx}`}
              data-testid="stall-rect"
              x={x}
              y={padTop}
              width={w}
              height={graphHeight}
              fill="url(#stallHatch)"
            />
          );
        })}

        {/* Outlined Float Intervals */}
        {allFloats.map((interval, idx) => {
          const x = getX(interval.start);
          const w = Math.max(2, getX(interval.end) - x);
          return (
            <rect
              key={`float-${idx}`}
              data-testid="float-rect"
              x={x}
              y={padTop}
              width={w}
              height={graphHeight}
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeDasharray="3 2"
              fill="#38bdf8"
              fillOpacity="0.06"
            />
          );
        })}

        {/* Y Axis Grid & Labels */}
        {[minY, Math.round((minY + maxY) / 2), maxY].map((val) => (
          <g key={val}>
            <line
              x1={padLeft}
              y1={getY(val)}
              x2={padLeft + graphWidth}
              y2={getY(val)}
              stroke={val === 0 ? '#52525b' : '#1f2430'}
              strokeWidth={val === 0 ? '1' : '0.8'}
              strokeDasharray={val === 0 ? undefined : '2 2'}
            />
            <text x={padLeft - 6} y={getY(val) + 3} textAnchor="end" className="font-mono text-[10px] fill-zinc-500">
              {val}
            </text>
          </g>
        ))}

        {/* X Axis Time Ticks */}
        {[0, Math.floor(maxT / 2), maxT].map((sec) => (
          <text
            key={sec}
            x={getX(sec)}
            y={viewHeight - 6}
            textAnchor={sec === 0 ? 'start' : sec === maxT ? 'end' : 'middle'}
            className="font-mono text-[10px] fill-zinc-500"
          >
            {formatMss(sec)}
          </text>
        ))}

        {/* Stepped Raster Paths */}
        {metalPath && (
          <path d={metalPath} fill="none" stroke="#94a3b8" strokeWidth="1.8" shapeRendering="crispEdges" pointerEvents="none" />
        )}
        {energyPath && (
          <path d={energyPath} fill="none" stroke="#fbbf24" strokeWidth="1.8" shapeRendering="crispEdges" pointerEvents="none" />
        )}

        {/* Scrubber Guideline */}
        {scrubPoint && (
          <g pointerEvents="none">
            <line
              data-testid="scrubber-line"
              x1={getX(scrubPoint.t)}
              y1={padTop}
              x2={getX(scrubPoint.t)}
              y2={padTop + graphHeight}
              stroke="#ffffff"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
