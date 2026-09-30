"use client";

import React, { useRef, useEffect } from "react";
import { motion, useAnimationFrame, useMotionValue, useTransform } from "framer-motion";

export interface WindmillTelemetryProps {
  faction?: "Armada" | "Cortex" | "both" | "Spectator";
  currentWind?: number; // Wind speed in m/s
  minWind?: number;     // Map minimum wind
  maxWind?: number;     // Map maximum wind
  avgWind?: number;     // Map average wind
  className?: string;
}

export function WindmillTelemetry({
  minWind = 4,
  maxWind = 18,
  avgWind = 11,
  currentWind = 11,
  faction = "Armada",
  className = "",
}: WindmillTelemetryProps) {
  const isCortex = faction === "Cortex";
  const isHighRisk = minWind <= 2 && avgWind < 10;
  const isViable = avgWind >= 10;

  const statusColor = isHighRisk
    ? "text-amber-400 border-amber-500/50 bg-amber-500/20"
    : isViable
    ? isCortex
      ? "text-[#ff2244] border-[#ff2244]/50 bg-[#ff2244]/20"
      : "text-[#449bed] border-[#449bed]/50 bg-[#449bed]/20"
    : "text-amber-400 border-amber-500/50 bg-amber-500/20";

  const statusLabel = isHighRisk
    ? "SOLAR ONLY [STALL RISK]"
    : isViable
    ? "WIND HIGHLY VIABLE"
    : "MARGINAL VARIANCE";

  // Stepped 8-direction retro sprite rotation (45-degree steps)
  const continuousAngle = useMotionValue(0);
  const rotateAngle = useTransform(continuousAngle, (val: number) => Math.floor(val / 45) * 45);
  const windRef = useRef(currentWind);
  useEffect(() => {
    windRef.current = currentWind;
  }, [currentWind]);

  useAnimationFrame((_, delta) => {
    // 10 m/s yields ~360 deg/sec (1 full rotation per second)
    const degreesPerSecond = Math.max(0, windRef.current) * 36;
    const increment = (degreesPerSecond * delta) / 1000;
    continuousAngle.set((continuousAngle.get() + increment) % 360);
  });

  return (
    <div
      className={`flex items-center gap-2.5 px-2.5 py-1 pixel-box select-none shrink-0 ${className}`}
    >
      {/* Turbine Frame Viewport */}
      <div
        className={`relative w-[36px] h-[38px] shrink-0 pixel-box-inset overflow-hidden ${
          isCortex
            ? "border-[#ff2244]/50"
            : "border-[#449bed]/50"
        }`}
      >
        {isCortex ? (
          /* ========================================================
             CORTEX WIND TURBINE (corwin)
             - Rugged monolithic obelisk pylon
             - Industrial cooling vent louvers
             - Heavy bunker foundation with crimson red armor slabs
             - Mechanical nacelle housing with top rear sensor vane
             - Distinctive RED hexagonal gear hub + heavy steel girder blades
             ======================================================== */
          <>
            {/* Static Cortex Tower */}
            <svg viewBox="0 0 48 54" className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
              <defs>
                <linearGradient id="cortexTowerGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#27272a" />
                  <stop offset="50%" stopColor="#52525b" />
                  <stop offset="100%" stopColor="#18181b" />
                </linearGradient>
              </defs>

              {/* Heavy Bunker Foundation */}
              <polygon points="14,50 34,50 36,52 12,52" fill="#09090b" />
              <polygon points="16,46 32,46 34,50 14,50" fill="#27272a" />
              
              {/* Red Armor Plates on Base */}
              <polygon points="14,48 18,47 18,51 13,51" fill="#dc2626" />
              <polygon points="30,47 34,48 35,51 30,51" fill="#dc2626" />
              <polygon points="22,46 26,46 26,51 22,51" fill="#ef4444" />
              <line x1="22" y1="48.5" x2="26" y2="48.5" stroke="#7f1d1d" strokeWidth="0.6" />

              {/* Cooling Vent Section with Horizontal Louvers */}
              <rect x="20" y="41" width="8" height="5" fill="#18181b" stroke="#27272a" strokeWidth="0.5" />
              <line x1="22" y1="42.5" x2="26" y2="42.5" stroke="#71717a" strokeWidth="0.6" />
              <line x1="22" y1="44" x2="26" y2="44" stroke="#71717a" strokeWidth="0.6" />
              <line x1="22" y1="45.5" x2="26" y2="45.5" stroke="#71717a" strokeWidth="0.6" />

              {/* Tapered Monolithic Obelisk Pylon */}
              <polygon points="21.5,19 26.5,19 28,41 20,41" fill="url(#cortexTowerGrad)" stroke="#27272a" strokeWidth="0.4" />

              {/* Nacelle Mechanical Head & Sensor Vane */}
              <polygon points="20.5,16 27.5,16 27.5,20 20.5,20" fill="#27272a" stroke="#3f3f46" strokeWidth="0.5" />
              <polygon points="23.5,11 24.5,11 24.5,16 23.5,16" fill="#71717a" />
            </svg>

            {/* Dynamic Rotating Cortex Rotor */}
            <motion.div
              className="absolute pointer-events-none w-[30px] h-[30px]"
              style={{
                top: "34%",
                left: "50%",
                x: "-50%",
                y: "-50%",
                rotate: rotateAngle,
              }}
            >
              <svg viewBox="-18 -18 36 36" className="w-full h-full" fill="none">
                <defs>
                  <linearGradient id="cortexBladeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3f3f46" />
                    <stop offset="50%" stopColor="#27272a" />
                    <stop offset="100%" stopColor="#18181b" />
                  </linearGradient>
                </defs>

                {/* Blade 1 (North) */}
                <g>
                  <polygon points="-1.5,0 -1.9,-13 -0.5,-16.5 1.5,-15 1.9,-12 1.2,0" fill="url(#cortexBladeGrad)" stroke="#18181b" strokeWidth="0.4" />
                  <line x1="0" y1="0" x2="0.5" y2="-15.5" stroke="#71717a" strokeWidth="0.6" />
                  <line x1="-0.5" y1="-16.5" x2="1.5" y2="-15" stroke="#e4e4e7" strokeWidth="0.7" />
                </g>

                {/* Blade 2 (120 deg) */}
                <g transform="rotate(120)">
                  <polygon points="-1.5,0 -1.9,-13 -0.5,-16.5 1.5,-15 1.9,-12 1.2,0" fill="url(#cortexBladeGrad)" stroke="#18181b" strokeWidth="0.4" />
                  <line x1="0" y1="0" x2="0.5" y2="-15.5" stroke="#71717a" strokeWidth="0.6" />
                  <line x1="-0.5" y1="-16.5" x2="1.5" y2="-15" stroke="#e4e4e7" strokeWidth="0.7" />
                </g>

                {/* Blade 3 (240 deg) */}
                <g transform="rotate(240)">
                  <polygon points="-1.5,0 -1.9,-13 -0.5,-16.5 1.5,-15 1.9,-12 1.2,0" fill="url(#cortexBladeGrad)" stroke="#18181b" strokeWidth="0.4" />
                  <line x1="0" y1="0" x2="0.5" y2="-15.5" stroke="#71717a" strokeWidth="0.6" />
                  <line x1="-0.5" y1="-16.5" x2="1.5" y2="-15" stroke="#e4e4e7" strokeWidth="0.7" />
                </g>

                {/* Iconic Cortex RED Hexagonal Gear Hub */}
                <polygon points="0,-3.2 2.8,-1.6 2.8,1.6 0,3.2 -2.8,1.6 -2.8,-1.6" fill="#dc2626" stroke="#991b1b" strokeWidth="0.5" />
                <polygon points="0,-2.0 1.7,-1.0 1.7,1.0 0,2.0 -1.7,1.0 -1.7,-1.0" fill="#ef4444" />
                <circle cx="0" cy="0" r="0.8" fill="#18181b" />
              </svg>
            </motion.div>
          </>
        ) : (
          /* ========================================================
             ARMADA WIND TURBINE (armwin)
             - Sleek dark cylindrical pillar with flared fluted base
             - Cobalt blue pedestal armor pads
             - Glowing yellow/amber power indicator light
             - Neon blue team-color stripe
             - Aero-composite segmented blades (ceramic tiles + carbon leading edge)
             ======================================================== */
          <>
            {/* Static Armada Tower */}
            <svg viewBox="0 0 48 54" className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
              <defs>
                <linearGradient id="armadaMastGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#18181b" />
                  <stop offset="50%" stopColor="#3f3f46" />
                  <stop offset="100%" stopColor="#09090b" />
                </linearGradient>
                <filter id="armadaLightGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#fde047" floodOpacity="0.8" />
                </filter>
              </defs>

              {/* Pedestal Base */}
              <polygon points="17,50 31,50 34,52 14,52" fill="#09090b" />
              <polygon points="18,48 30,48 33,50 15,50" fill="#27272a" />
              
              {/* Blue Base Armor Pads */}
              <polygon points="15,49 20,49 19,52 14,52" fill="#2563eb" />
              <polygon points="28,49 33,49 34,52 29,52" fill="#2563eb" />
              <polygon points="22,48 26,48 26,52 22,52" fill="#1d4ed8" />

              {/* Flared Lower Mast with Vertical Panel Flutes */}
              <polygon points="21,38 27,38 29,48 19,48" fill="url(#armadaMastGrad)" />
              <line x1="22.5" y1="39" x2="21" y2="47" stroke="#09090b" strokeWidth="0.8" />
              <line x1="25.5" y1="39" x2="27" y2="47" stroke="#09090b" strokeWidth="0.8" />

              {/* Mid Mast Column */}
              <rect x="22.5" y="18" width="3" height="20" fill="url(#armadaMastGrad)" />

              {/* Glowing Yellow Energy Light Ring */}
              <rect x="22" y="32" width="4" height="2" fill="#fde047" rx="0.5" filter="url(#armadaLightGlow)" />
              {/* Neon Blue Team Stripe */}
              <rect x="22" y="29.5" width="4" height="1.6" fill="#3b82f6" rx="0.3" />

              {/* Nacelle Swivel Joint */}
              <polygon points="21.5,15 26.5,15 26.5,20 21.5,20" fill="#27272a" stroke="#3f3f46" strokeWidth="0.6" />
            </svg>

            {/* Dynamic Rotating Armada Rotor */}
            <motion.div
              className="absolute pointer-events-none w-[30px] h-[30px]"
              style={{
                top: "34%",
                left: "50%",
                x: "-50%",
                y: "-50%",
                rotate: rotateAngle,
              }}
            >
              <svg viewBox="-18 -18 36 36" className="w-full h-full" fill="none">
                <defs>
                  <linearGradient id="armadaBladeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="60%" stopColor="#cbd5e1" />
                    <stop offset="100%" stopColor="#64748b" />
                  </linearGradient>
                </defs>

                {/* Blade 1 (North) */}
                <g>
                  <polygon points="0,0 -1.8,-4 -2.2,-13 0,-16 1.8,-13 1,-4" fill="url(#armadaBladeGrad)" />
                  <path d="M0,0 L-2.2,-13 L0,-16 L-0.6,-5 Z" fill="#09090b" opacity="0.6" />
                  <line x1="-1.6" y1="-7" x2="1.3" y2="-7" stroke="#475569" strokeWidth="0.5" />
                  <line x1="-2.0" y1="-10.5" x2="1.6" y2="-10.5" stroke="#475569" strokeWidth="0.5" />
                </g>

                {/* Blade 2 (120 deg) */}
                <g transform="rotate(120)">
                  <polygon points="0,0 -1.8,-4 -2.2,-13 0,-16 1.8,-13 1,-4" fill="url(#armadaBladeGrad)" />
                  <path d="M0,0 L-2.2,-13 L0,-16 L-0.6,-5 Z" fill="#09090b" opacity="0.6" />
                  <line x1="-1.6" y1="-7" x2="1.3" y2="-7" stroke="#475569" strokeWidth="0.5" />
                  <line x1="-2.0" y1="-10.5" x2="1.6" y2="-10.5" stroke="#475569" strokeWidth="0.5" />
                </g>

                {/* Blade 3 (240 deg) */}
                <g transform="rotate(240)">
                  <polygon points="0,0 -1.8,-4 -2.2,-13 0,-16 1.8,-13 1,-4" fill="url(#armadaBladeGrad)" />
                  <path d="M0,0 L-2.2,-13 L0,-16 L-0.6,-5 Z" fill="#09090b" opacity="0.6" />
                  <line x1="-1.6" y1="-7" x2="1.3" y2="-7" stroke="#475569" strokeWidth="0.5" />
                  <line x1="-2.0" y1="-10.5" x2="1.6" y2="-10.5" stroke="#475569" strokeWidth="0.5" />
                </g>

                {/* Central Hub Cap with Cerulean Core */}
                <circle cx="0" cy="0" r="2.2" fill="#18181b" stroke="#449bed" strokeWidth="0.6" />
                <circle cx="0" cy="0" r="0.9" fill="#449bed" />
              </svg>
            </motion.div>
          </>
        )}
      </div>

      {/* Telemetry Display */}
      <div className="flex flex-col gap-0.5 min-w-0 font-pixel-body">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-zinc-400 uppercase tracking-wider text-[8px] font-pixel-heading whitespace-nowrap">
            WIND VELOCITY:
          </span>
          <span className="text-zinc-100 font-bold text-xs tracking-wider font-pixel-heading whitespace-nowrap">
            {currentWind.toFixed(1)} <span className="text-zinc-500 text-[8px]">M/S</span>
          </span>
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className={`px-1.5 py-0.5 text-[8px] font-pixel-heading uppercase border shadow-[1px_1px_0px_#000] whitespace-nowrap shrink-0 ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="text-zinc-400 text-xs tracking-wider font-pixel-body whitespace-nowrap shrink-0">
            RANGE: [{minWind}–{maxWind} M/S]
          </span>
        </div>
      </div>
    </div>
  );
}

export default WindmillTelemetry;
