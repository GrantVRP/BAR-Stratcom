import React from 'react';

export interface FactionEmblemProps extends React.SVGProps<SVGSVGElement> {
  faction: 'armada' | 'cortex' | string;
  size?: number;
}

export function FactionEmblem({
  faction,
  size = 24,
  className = '',
  ...props
}: FactionEmblemProps): React.JSX.Element {
  const isArmada = faction.toLowerCase() === 'armada';
  const color = isArmada ? '#449bed' : '#ff2244';

  if (isArmada) {
    return (
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block pixelated align-middle ${className}`.trim()}
        aria-label="Armada Faction Emblem"
        {...props}
      >
        {/* Original Geometric Armada Crest */}
        <polygon points="16,2 28,14 24,18 16,10 8,18 4,14" fill={color} />
        <polygon points="16,13 24,21 21,24 16,19 11,24 8,21" fill={color} opacity="0.85" />
        <rect x="14" y="22" width="4" height="7" fill={color} />
        <rect x="6" y="27" width="20" height="2" fill={color} opacity="0.7" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block pixelated align-middle ${className}`.trim()}
      aria-label="Cortex Faction Emblem"
      {...props}
    >
      {/* Original Geometric Cortex Crest */}
      <polygon points="16,3 28,10 28,22 16,29 4,22 4,10" stroke={color} strokeWidth="2.5" fill="#140608" />
      <polygon points="16,8 23,16 16,24 9,16" fill={color} />
      <rect x="14.5" y="11" width="3" height="10" fill="#ffffff" opacity="0.9" />
      <rect x="11" y="14.5" width="10" height="3" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}
