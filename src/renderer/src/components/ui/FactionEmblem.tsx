import React from 'react';
import armada64 from '../../assets/factions-32/armada-64.png';
import armada32 from '../../assets/factions-32/armada-32.png';
import cortex64 from '../../assets/factions-32/cortex-64.png';
import cortex32 from '../../assets/factions-32/cortex-32.png';

/** 32-bit versions of the BAR faction icons (sidepics). */
const EMBLEMS: Record<string, { 32: string; 64: string; label: string }> = {
  armada: { 32: armada32, 64: armada64, label: 'Armada' },
  cortex: { 32: cortex32, 64: cortex64, label: 'Cortex' }
};

export interface FactionEmblemProps {
  faction: 'armada' | 'cortex' | string;
  size?: number;
  className?: string;
}

export function FactionEmblem({ faction, size = 24, className = '' }: FactionEmblemProps): React.JSX.Element {
  const emblem = EMBLEMS[faction.toLowerCase()];
  if (!emblem) {
    // Factions without an emblem (e.g. Legion while it is disabled): a plain neutral badge
    return (
      <svg
        viewBox="0 0 8 8"
        width={size}
        height={size}
        shapeRendering="crispEdges"
        className={`inline-block align-middle ${className}`.trim()}
        aria-label={`${faction} faction emblem`}
      >
        <rect x="1" y="1" width="6" height="6" fill="#475569" />
        <rect x="2" y="2" width="4" height="4" fill="#94a3b8" />
      </svg>
    );
  }
  const native = size <= 32 ? 32 : 64;
  return (
    <img
      src={emblem[native]}
      width={size}
      height={size}
      alt={`${emblem.label} faction emblem`}
      draggable={false}
      data-faction-emblem={faction.toLowerCase()}
      className={`inline-block select-none align-middle ${className}`.trim()}
      style={{ imageRendering: size >= native ? 'pixelated' : 'auto' }}
    />
  );
}
