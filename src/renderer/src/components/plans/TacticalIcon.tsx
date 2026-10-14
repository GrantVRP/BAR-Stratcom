import React from 'react';
import { UnitIcon } from '../icons/UnitIcon';

export interface TacticalIconProps {
  unitId?: string;
  action?: 'build' | 'reclaim' | 'assist' | 'note';
  size?: number;
  className?: string;
}

export function TacticalIcon({
  unitId,
  action = 'build',
  size = 24,
  className = ''
}: TacticalIconProps): React.JSX.Element {
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

  // 4. A unit: its original class icon from the active snapshot
  if (unitId) {
    return <UnitIcon unitId={unitId} size={size} className={className} />;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="No unit">
      <rect x="6" y="6" width="12" height="12" fill="none" stroke="#a1a1aa" strokeWidth="1.8" />
    </svg>
  );
}
