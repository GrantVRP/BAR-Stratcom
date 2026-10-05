import React from 'react';

export interface WindTurbineProps {
  /** Average wind from BAR's table; null = unknown (the rotor stands still). */
  avgWind: number | null;
  faction?: string;
  className?: string;
}

/** Seconds per rotor turn: 10 wind turns it once a second, as in the legacy telemetry widget. */
export function rotorPeriodSec(avgWind: number | null): number | null {
  return avgWind && avgWind > 0 ? Math.max(0.25, 10 / avgWind) : null;
}

const BLADE_ARMADA = (
  <>
    <polygon points="0,0 -1.8,-4 -2.2,-13 0,-16 1.8,-13 1,-4" fill="#cbd5e1" />
    <path d="M0,0 L-2.2,-13 L0,-16 L-0.6,-5 Z" fill="#09090b" opacity="0.6" />
    <line x1="-1.6" y1="-7" x2="1.3" y2="-7" stroke="#475569" strokeWidth="0.5" />
  </>
);

const BLADE_CORTEX = (
  <>
    <polygon points="-1.5,0 -1.9,-13 -0.5,-16.5 1.5,-15 1.9,-12 1.2,0" fill="#3f3f46" stroke="#18181b" strokeWidth="0.4" />
    <line x1="0" y1="0" x2="0.5" y2="-15.5" stroke="#71717a" strokeWidth="0.6" />
  </>
);

/**
 * Decorative wind turbine (ported from the legacy WindmillTelemetry, original art): the rotor turns in
 * 45° steps at a speed set by the map's average wind from BAR's table, stands still with reduced
 * motion or unknown wind, and claims nothing beyond the average itself.
 */
export function WindTurbine({ avgWind, faction = 'armada', className = '' }: WindTurbineProps): React.JSX.Element {
  const cortex = faction === 'cortex';
  const period = rotorPeriodSec(avgWind);
  const blade = cortex ? BLADE_CORTEX : BLADE_ARMADA;
  return (
    <div data-testid="wind-turbine" className={`flex items-center gap-3 ${className}`}>
      <div className="relative h-[54px] w-[48px] shrink-0" aria-hidden="true">
        <svg viewBox="0 0 48 54" className="absolute inset-0 h-full w-full" fill="none">
          {cortex ? (
            <>
              <polygon points="14,50 34,50 36,52 12,52" fill="#09090b" />
              <polygon points="16,46 32,46 34,50 14,50" fill="#27272a" />
              <polygon points="22,46 26,46 26,51 22,51" fill="#ef4444" />
              <polygon points="21.5,19 26.5,19 28,41 20,41" fill="#52525b" />
              <rect x="20" y="41" width="8" height="5" fill="#18181b" />
              <polygon points="20.5,16 27.5,16 27.5,20 20.5,20" fill="#27272a" />
            </>
          ) : (
            <>
              <polygon points="17,50 31,50 34,52 14,52" fill="#09090b" />
              <polygon points="18,48 30,48 33,50 15,50" fill="#27272a" />
              <polygon points="22,48 26,48 26,52 22,52" fill="#1d4ed8" />
              <polygon points="21,38 27,38 29,48 19,48" fill="#3f3f46" />
              <rect x="22.5" y="18" width="3" height="20" fill="#3f3f46" />
              <rect x="22" y="29.5" width="4" height="1.6" fill="#3b82f6" />
              <polygon points="21.5,15 26.5,15 26.5,20 21.5,20" fill="#27272a" />
            </>
          )}
        </svg>
        <svg
          viewBox="-18 -18 36 36"
          data-testid="wind-turbine-rotor"
          data-period={period ?? ''}
          className={`absolute left-1/2 top-[34%] h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 motion-reduce:animate-none ${period ? 'animate-spin' : ''}`}
          style={period ? { animationDuration: `${period}s`, animationTimingFunction: 'steps(8)' } : undefined}
          fill="none"
        >
          <g>{blade}</g>
          <g transform="rotate(120)">{blade}</g>
          <g transform="rotate(240)">{blade}</g>
          {cortex ? (
            <polygon points="0,-3.2 2.8,-1.6 2.8,1.6 0,3.2 -2.8,1.6 -2.8,-1.6" fill="#dc2626" />
          ) : (
            <circle cx="0" cy="0" r="2.2" fill="#18181b" stroke="#449bed" strokeWidth="0.6" />
          )}
        </svg>
      </div>
      <span className="font-mono text-xs text-zinc-300" data-num="true">
        {avgWind === null ? 'avg wind unknown' : `avg wind ${Math.round(avgWind * 10) / 10} (BAR table)`}
      </span>
    </div>
  );
}
