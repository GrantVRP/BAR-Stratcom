import React from 'react';
import armadaWindImg from '../../assets/original/armada-wind.png';
import cortexWindImg from '../../assets/original/cortex-wind.png';

export interface TacticalIconProps {
  unitId?: string;
  action?: 'build' | 'reclaim' | 'assist' | 'note';
  factionId?: string;
  size?: number;
  className?: string;
}

export function TacticalIcon({
  unitId,
  action = 'build',
  factionId = 'armada',
  size = 24,
  className = ''
}: TacticalIconProps): React.JSX.Element {
  const isCortex = factionId.toLowerCase() === 'cortex';
  const factionAccent = isCortex ? '#ff2244' : '#449bed';
  const id = (unitId || '').toLowerCase().trim();

  // 1. Reclaim action
  if (action === 'reclaim' || id.includes('reclaim')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Reclaim action"
      >
        <path d="M7 11V7H11" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 7L3.5 10.5C5.5 5 11 3.5 16 5.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 13V17H13" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 17L20.5 13.5C18.5 19 13 20.5 8 18.5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.5" fill="#10b981" />
      </svg>
    );
  }

  // 2. Assist action
  if (action === 'assist' || id.includes('assist')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Assist action"
      >
        <path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
          stroke="#38bdf8"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // 3. Note action
  if (action === 'note') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Note"
      >
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          stroke="#a1a1aa"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#a1a1aa" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  // 4. Wind generator / turbine (Approved owner original asset)
  if (id.includes('win')) {
    return (
      <img
        src={isCortex ? cortexWindImg : armadaWindImg}
        alt="Wind Turbine"
        width={size}
        height={size}
        className={`${className} object-contain pixelated drop-shadow-[1px_1px_0px_#000]`}
      />
    );
  }

  // 5. Metal Extractor
  if (id.includes('mex') || id.includes('extractor')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Metal Extractor"
      >
        <rect x="4" y="14" width="16" height="7" stroke="#71717a" strokeWidth="1.8" fill="#18181b" />
        <path d="M12 3v11M8 8l4-4 4 4" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="17" r="1.5" fill="#e4e4e7" />
      </svg>
    );
  }

  // 6. Solar Collector
  if (id.includes('solar')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Solar Collector"
      >
        <polygon points="4,18 8,6 16,6 20,18" stroke="#fbbf24" strokeWidth="1.8" fill="#2e230a" />
        <line x1="12" y1="6" x2="12" y2="18" stroke="#fbbf24" strokeWidth="1.5" />
        <line x1="6" y1="12" x2="18" y2="12" stroke="#fbbf24" strokeWidth="1.5" />
        <line x1="7" y1="21" x2="17" y2="21" stroke="#a1a1aa" strokeWidth="2" />
      </svg>
    );
  }

  // 7. Factory / Bot Lab / Vehicle Plant
  if (id.includes('lab') || id.includes('plant') || id.includes('fac') || id.includes('vp') || id.includes('ap')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Factory"
      >
        <rect x="3" y="10" width="18" height="11" stroke={factionAccent} strokeWidth="1.8" fill="#0f1118" />
        <path d="M3 10l5-6v6l5-6v6" stroke={factionAccent} strokeWidth="1.8" strokeLinejoin="round" />
        <rect x="9" y="15" width="6" height="6" stroke="#e4e4e7" strokeWidth="1.5" />
      </svg>
    );
  }

  // 8. Construction Bot / Unit
  if (id.includes('ck') || id.includes('cv') || id.includes('ca') || id.includes('con')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Constructor"
      >
        <rect x="5" y="12" width="14" height="8" rx="1" stroke="#4ade80" strokeWidth="1.8" fill="#0c1e13" />
        <circle cx="12" cy="7" r="3" stroke="#4ade80" strokeWidth="1.8" />
        <line x1="12" y1="10" x2="12" y2="12" stroke="#4ade80" strokeWidth="1.8" />
        <path d="M17 12l3-4M7 12L4 8" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 9. Artillery / Rocket bot
  if (id.includes('rock') || id.includes('storm') || id.includes('arty')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Rocket Bot"
      >
        <circle cx="12" cy="14" r="6" stroke="#c084fc" strokeWidth="1.8" fill="#1f102e" />
        <line x1="12" y1="8" x2="12" y2="2" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 4l3-2 3 2" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="14" r="2" fill={factionAccent} />
      </svg>
    );
  }

  // 10. Default Infantry / Combat unit
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Tactical Unit"
    >
      <polygon points="12,3 20,8 20,16 12,21 4,16 4,8" stroke="#71717a" strokeWidth="1.8" fill="#12131a" />
      <circle cx="12" cy="12" r="3" fill={factionAccent} />
      <line x1="12" y1="5" x2="12" y2="7" stroke="#ffffff" strokeWidth="1.2" />
      <line x1="12" y1="17" x2="12" y2="19" stroke="#ffffff" strokeWidth="1.2" />
    </svg>
  );
}
