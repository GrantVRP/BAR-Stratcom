"use client";

import React, { useRef, useEffect } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";

export interface WindmillTelemetryProps {
  currentWind?: number; // Wind speed in m/s
  minWind?: number;     // Map minimum wind
  maxWind?: number;     // Map maximum wind
  className?: string;
}

export function WindmillTelemetry({
  currentWind = 9.0,
  minWind = 4,
  maxWind = 14,
  className = "",
}: WindmillTelemetryProps) {
  // Beyond All Reason viability benchmarks
  const isViable = currentWind >= 8.5;
  const isHighRisk = currentWind < 5.0;

  const statusColor = isHighRisk
    ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
    : isViable
    ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
    : "text-amber-400 border-amber-500/30 bg-amber-500/10";

  const statusLabel = isHighRisk
    ? "SOLAR ONLY (STALL RISK)"
    : isViable
    ? "WIND HIGHLY VIABLE"
    : "MARGINAL VARIANCE";

  const bladeColor = isHighRisk ? "#fb7185" : isViable ? "#22d3ee" : "#f59e0b";

  // Continuous frame-by-frame rotation
  const rotateAngle = useMotionValue(0);
  const windRef = useRef(currentWind);
  useEffect(() => {
    windRef.current = currentWind;
  }, [currentWind]);

  useAnimationFrame((_, delta) => {
    // Math: Speed in degrees per millisecond.
    // 10 m/s yields ~360 deg/sec (1 full rotation per second).
    const degreesPerSecond = Math.max(0, windRef.current) * 36;
    const increment = (degreesPerSecond * delta) / 1000;
    rotateAngle.set((rotateAngle.get() + increment) % 360);
  });

  return (
    <div
      className={`flex items-center gap-3 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-sm font-mono text-xs ${className}`}
    >
      {/* Turbine Frame */}
      <div className="relative w-8 h-8 shrink-0 flex items-center justify-center bg-zinc-900/80 border border-zinc-800/80 rounded-sm overflow-hidden">
        {/* Static Tower & Nacelle Mount */}
        <svg
          viewBox="0 0 32 32"
          className="absolute inset-0 w-full h-full pointer-events-none"
          fill="none"
        >
          <line x1="10" y1="28" x2="22" y2="28" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14.5 28 L15.5 11 L16.5 11 L17.5 28 Z" fill="#3f3f46" />
          <circle cx="16" cy="11" r="2" fill="#71717a" />
        </svg>

        {/* Dynamic Continuous Spinner */}
        <motion.div
          className="absolute top-[3px] left-1/2 -translate-x-1/2 w-4 h-4 flex items-center justify-center pointer-events-none"
          style={{
            rotate: rotateAngle,
            transformOrigin: "center center",
          }}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0 overflow-visible" fill="none">
            <circle cx="12" cy="12" r="2" fill="#e4e4e7" />
            {/* North Blade */}
            <path d="M12 12 L13 2.5 C13 1.5 11 1.5 11 2.5 L12 12 Z" fill={bladeColor} />
            {/* Blade 2 (120 deg) */}
            <path d="M12 12 L13 2.5 C13 1.5 11 1.5 11 2.5 L12 12 Z" fill={bladeColor} transform="rotate(120 12 12)" />
            {/* Blade 3 (240 deg) */}
            <path d="M12 12 L13 2.5 C13 1.5 11 1.5 11 2.5 L12 12 Z" fill={bladeColor} transform="rotate(240 12 12)" />
          </svg>
        </motion.div>
      </div>

      {/* Telemetry Display */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 uppercase tracking-wider text-[10px]">
            Atmospheric Velocity
          </span>
          <span className="text-zinc-100 font-bold text-xs">
            {currentWind.toFixed(1)} <span className="text-zinc-500 font-normal">m/s</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.2 rounded-xs border text-[9px] font-semibold uppercase tracking-tight ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="text-zinc-500 text-[10px]">
            Range: [{minWind}–{maxWind}]
          </span>
        </div>
      </div>
    </div>
  );
}

export default WindmillTelemetry;
