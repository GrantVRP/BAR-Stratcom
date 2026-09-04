"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { Zap, AlertTriangle, Activity, TrendingUp, Info } from "lucide-react";
import { type ParsedBuildStep } from "@/lib/timeline-parser";
import { type Faction } from "@/lib/game-data";

export interface ResourceGraphProps {
  steps: ParsedBuildStep[];
  mapWindAvg?: number;
  faction?: Faction;
  className?: string;
}

interface DataPoint {
  time: number; // seconds (0 to 300)
  netEnergy: number; // +E/s
  netMetal: number; // +M/s
  isStall: boolean;
}

interface StallInterval {
  start: number; // seconds
  end: number;
}

/**
 * Converts timestamp string "01:24" to total seconds
 */
function timeToSeconds(ts: string): number {
  if (!ts) return 0;
  const parts = ts.replace(/[[\]]/g, "").split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }
  return 0;
}

/**
 * Generates an SVG path using smooth monotonic cubic bezier curves
 */
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to Cubic Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

export const ResourceGraph: React.FC<ResourceGraphProps> = ({
  steps,
  mapWindAvg = 14,
  faction = "Armada",
  className = "",
}) => {
  const [hoveredSecond, setHoveredSecond] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Faction color
  const isArmada = faction === "Armada";
  const metalColor = isArmada ? "#00f0ff" : "#94a3b8";

  // Simulate economic runway from t = 0 to 300s
  const { trajectoryData, stallIntervals } = useMemo(() => {
    // Collect step events
    const events: {
      time: number;
      type: "solar" | "wind" | "mex" | "factory" | "reclaim" | "unit" | "other";
      count: number;
    }[] = [];

    steps.forEach((step) => {
      const sec = timeToSeconds(step.timestamp);
      const name = step.itemName.toLowerCase();
      const countMatch = step.count.match(/\d+/);
      const count = countMatch ? parseInt(countMatch[0], 10) : 1;

      if (name.includes("solar")) events.push({ time: sec, type: "solar", count });
      else if (name.includes("wind") || name.includes("turbine")) events.push({ time: sec, type: "wind", count });
      else if (name.includes("extractor") || name.includes("mex")) events.push({ time: sec, type: "mex", count });
      else if (name.includes("factory") || name.includes("lab") || name.includes("plant")) events.push({ time: sec, type: "factory", count });
      else if (name.includes("reclaim")) events.push({ time: sec, type: "reclaim", count });
      else events.push({ time: sec, type: "unit", count });
    });

    // Sample every 5 seconds from 0 to 300s
    const points: DataPoint[] = [];
    const sampleInterval = 5;
    const totalSamples = 300 / sampleInterval;

    for (let i = 0; i <= totalSamples; i++) {
      const t = i * sampleInterval;

      // Base Commander production
      let e = 25.0; // +25 E/s
      let m = 2.0;  // +2.0 M/s

      // Accumulate completed structures up to time t
      events.forEach((ev) => {
        if (ev.type === "solar" && t >= ev.time + 12) {
          e += 20 * ev.count;
        } else if (ev.type === "wind" && t >= ev.time + 8) {
          e += mapWindAvg * ev.count;
        } else if (ev.type === "mex" && t >= ev.time + 6) {
          m += 2.2 * ev.count;
          e -= 3.0 * ev.count;
        } else if (ev.type === "reclaim" && t >= ev.time && t < ev.time + 15) {
          m += 16.0; // Temporary reclaim influx
        } else if (ev.type === "factory" && t >= ev.time + 24) {
          // Active continuous production draw
          m -= 6.5;
          e -= 32.0;
        }
      });

      // Factor in construction drain if something is building right now
      const isBuildingStructure = events.some(
        (ev) =>
          (ev.type === "solar" || ev.type === "wind" || ev.type === "factory") &&
          t >= ev.time &&
          t < ev.time + 12
      );

      if (isBuildingStructure) {
        e -= 8.0;
        m -= 6.0;
      }

      // Detect energy stall hazard (net energy under 0)
      const isStall = e < 0;

      points.push({
        time: t,
        netEnergy: Math.round(e * 10) / 10,
        netMetal: Math.round(m * 10) / 10,
        isStall,
      });
    }

    // Detect contiguous stall intervals
    const stalls: StallInterval[] = [];
    let currentStart: number | null = null;

    points.forEach((p) => {
      if (p.isStall && currentStart === null) {
        currentStart = p.time;
      } else if (!p.isStall && currentStart !== null) {
        stalls.push({ start: currentStart, end: p.time });
        currentStart = null;
      }
    });

    if (currentStart !== null) {
      stalls.push({ start: currentStart, end: 300 });
    }

    return { trajectoryData: points, stallIntervals: stalls };
  }, [steps, mapWindAvg]);

  // Coordinate mapping dimensions
  const viewWidth = 600;
  const viewHeight = 120;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 22;

  const graphWidth = viewWidth - padLeft - padRight;
  const graphHeight = viewHeight - padTop - padBottom;

  // Domain: Y from -15 to +65
  const minY = -15;
  const maxY = 65;
  const rangeY = maxY - minY;

  const getX = useCallback(
    (timeSec: number) => padLeft + (timeSec / 300) * graphWidth,
    [padLeft, graphWidth]
  );

  const getY = useCallback(
    (val: number) => {
      const clamped = Math.max(minY, Math.min(maxY, val));
      return padTop + (1 - (clamped - minY) / rangeY) * graphHeight;
    },
    [padTop, graphHeight, minY, rangeY]
  );

  const zeroY = getY(0);

  // SVG Paths
  const energyPoints = useMemo(
    () => trajectoryData.map((d) => ({ x: getX(d.time), y: getY(d.netEnergy) })),
    [trajectoryData, getX, getY]
  );

  const metalPoints = useMemo(
    () => trajectoryData.map((d) => ({ x: getX(d.time), y: getY(d.netMetal) })),
    [trajectoryData, getX, getY]
  );

  const energyPath = useMemo(() => createSmoothPath(energyPoints), [energyPoints]);
  const metalPath = useMemo(() => createSmoothPath(metalPoints), [metalPoints]);

  const energyArea = useMemo(() => {
    if (energyPoints.length === 0) return "";
    const first = energyPoints[0];
    const last = energyPoints[energyPoints.length - 1];
    return `${energyPath} L ${last.x.toFixed(1)} ${zeroY.toFixed(1)} L ${first.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  }, [energyPoints, energyPath, zeroY]);

  const metalArea = useMemo(() => {
    if (metalPoints.length === 0) return "";
    const first = metalPoints[0];
    const last = metalPoints[metalPoints.length - 1];
    return `${metalPath} L ${last.x.toFixed(1)} ${zeroY.toFixed(1)} L ${first.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  }, [metalPoints, metalPath, zeroY]);

  // Handle Scrubbing
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = viewWidth / rect.width;
    const svgX = clientX * scaleX;

    const clampedX = Math.max(padLeft, Math.min(padLeft + graphWidth, svgX));
    const sec = Math.round(((clampedX - padLeft) / graphWidth) * 300);
    setHoveredSecond(sec);
  };

  const handleMouseLeave = () => {
    setHoveredSecond(null);
  };

  // Currently scrubbed data point
  const currentScrub = useMemo(() => {
    if (hoveredSecond === null) return null;
    const closest = trajectoryData.reduce((prev, curr) =>
      Math.abs(curr.time - hoveredSecond) < Math.abs(prev.time - hoveredSecond) ? curr : prev
    );
    const min = Math.floor(hoveredSecond / 60);
    const sec = hoveredSecond % 60;
    const ts = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return {
      timeStr: ts,
      energy: closest.netEnergy,
      metal: closest.netMetal,
      isStall: closest.isStall,
    };
  }, [hoveredSecond, trajectoryData]);

  // Peak and average stats
  const stats = useMemo(() => {
    let maxE = 0;
    let maxM = 0;
    trajectoryData.forEach((d) => {
      if (d.netEnergy > maxE) maxE = d.netEnergy;
      if (d.netMetal > maxM) maxM = d.netMetal;
    });
    return { maxE, maxM };
  }, [trajectoryData]);

  return (
    <div className={`rounded bg-[#0d0f15] border border-zinc-800/60 p-3 space-y-2.5 ${className}`}>
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Activity className="size-3.5 text-zinc-400" />
          <span className="font-bold text-zinc-200 uppercase tracking-wider text-[11px]">
            PROJECTED ECONOMIC RUNWAY (0:00 - 5:00)
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400">
            WIND: {mapWindAvg} m/s
          </span>
        </div>

        {/* Live Scrub Telemetry / Legend */}
        <div className="flex items-center gap-4 text-[11px]">
          {currentScrub ? (
            <div className="flex items-center gap-3 bg-zinc-900/90 px-2.5 py-0.5 rounded border border-zinc-800">
              <span className="text-zinc-400 font-bold">T+{currentScrub.timeStr}</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Zap className="size-3" />
                {currentScrub.energy >= 0 ? `+${currentScrub.energy}` : currentScrub.energy} E/s
              </span>
              <span className="text-zinc-300 font-bold flex items-center gap-1" style={{ color: metalColor }}>
                <span>⛊</span>
                {currentScrub.metal >= 0 ? `+${currentScrub.metal}` : currentScrub.metal} M/s
              </span>
              {currentScrub.isStall && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 flex items-center gap-1 font-bold animate-pulse">
                  <AlertTriangle className="size-2.5 text-red-400" />
                  STALL HAZARD
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[10px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400" />
                <span>ENERGY (+E/s) [PEAK: +{stats.maxE}]</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: metalColor }} />
                <span>METAL (+M/s) [PEAK: +{stats.maxM}]</span>
              </div>
              {stallIntervals.length > 0 && (
                <div className="flex items-center gap-1 text-red-400 font-semibold">
                  <AlertTriangle className="size-3" />
                  <span>STALL ZONE DETECTED</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pure SVG Graph Container */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          className="w-full h-28 cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Energy Gradient Area Fill */}
            <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.0" />
            </linearGradient>

            {/* Metal Gradient Area Fill */}
            <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metalColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={metalColor} stopOpacity="0.0" />
            </linearGradient>

            {/* Stall Warning Pattern */}
            <pattern id="stallHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="1.2" strokeOpacity="0.35" />
            </pattern>
          </defs>

          {/* Grid Background Lines (Horizontal Telemetry: +10, +25, +50) */}
          {[0, 10, 25, 50].map((val) => {
            const y = getY(val);
            const isZero = val === 0;
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + graphWidth}
                  y2={y}
                  stroke={isZero ? "#52525b" : "#27272a"}
                  strokeWidth={isZero ? "1.2" : "0.8"}
                  strokeDasharray={isZero ? undefined : "3 3"}
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="font-mono text-[9px] fill-zinc-500"
                >
                  {val > 0 ? `+${val}` : val}
                </text>
              </g>
            );
          })}

          {/* Grid Vertical Time Markers: 1-min intervals */}
          {[60, 120, 180, 240, 300].map((sec) => {
            const x = getX(sec);
            const min = sec / 60;
            return (
              <g key={sec}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + graphHeight}
                  stroke="#27272a"
                  strokeWidth="0.8"
                  strokeDasharray="2 3"
                />
                <text
                  x={x}
                  y={viewHeight - 6}
                  textAnchor="middle"
                  className="font-mono text-[9px] fill-zinc-500"
                >
                  0{min}:00
                </text>
              </g>
            );
          })}

          {/* Stall Hazard Zones Highlights */}
          {stallIntervals.map((zone, idx) => {
            const startX = getX(zone.start);
            const endX = getX(zone.end);
            const w = Math.max(8, endX - startX);
            return (
              <g key={idx}>
                <rect
                  x={startX}
                  y={padTop}
                  width={w}
                  height={graphHeight}
                  fill="url(#stallHatch)"
                />
                <rect
                  x={startX}
                  y={padTop}
                  width={w}
                  height={graphHeight}
                  fill="#ef4444"
                  fillOpacity="0.08"
                />
                <text
                  x={startX + w / 2}
                  y={padTop + 12}
                  textAnchor="middle"
                  className="font-mono text-[8px] fill-red-400 font-bold uppercase tracking-wider"
                >
                  ENERGY STALL
                </text>
              </g>
            );
          })}

          {/* Shaded Area Under Curves */}
          {energyArea && <path d={energyArea} fill="url(#energyGrad)" pointerEvents="none" />}
          {metalArea && <path d={metalArea} fill="url(#metalGrad)" pointerEvents="none" />}

          {/* Smooth Bezier Path Lines */}
          {energyPath && (
            <path
              d={energyPath}
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {metalPath && (
            <path
              d={metalPath}
              fill="none"
              stroke={metalColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Scrub Hairline & Intersections */}
          {hoveredSecond !== null && (
            <g pointerEvents="none">
              <line
                x1={getX(hoveredSecond)}
                y1={padTop}
                x2={getX(hoveredSecond)}
                y2={padTop + graphHeight}
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {currentScrub && (
                <>
                  <circle
                    cx={getX(hoveredSecond)}
                    cy={getY(currentScrub.energy)}
                    r="3.5"
                    fill="#eab308"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={getX(hoveredSecond)}
                    cy={getY(currentScrub.metal)}
                    r="3.5"
                    fill={metalColor}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default ResourceGraph;
