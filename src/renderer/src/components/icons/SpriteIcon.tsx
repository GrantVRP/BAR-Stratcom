import React from 'react';
import type { IconBase, IconBadge } from '../../../../core/icons/icon-spec';
import { shadesFor, SPRITE_SIZE } from './palette';
import { gridToPaths } from './pixel-paths';
import { BADGE_SIZE, BADGE_SPRITES } from './sprites-badges';
import { BUILDING_SPRITES } from './sprites-buildings';
import { UNIT_SPRITES } from './sprites-units';

const SPRITES: Record<IconBase, readonly string[]> = { ...UNIT_SPRITES, ...BUILDING_SPRITES };

export interface SpriteIconProps {
  base: IconBase;
  badge?: IconBadge | null;
  tech?: number | null;
  factionId?: string | null;
  size?: number;
  label: string;
  className?: string;
}

/** One original pixel-art icon: body sprite, corner badge and tech pips (T10.3). */
export function SpriteIcon({
  base,
  badge = null,
  tech = null,
  factionId = null,
  size = 24,
  label,
  className = ''
}: SpriteIconProps): React.JSX.Element {
  const shades = shadesFor(factionId);
  const badgeAt = base === 'factory' ? { x: SPRITE_SIZE - BADGE_SIZE, y: 0 } : { x: SPRITE_SIZE - BADGE_SIZE, y: SPRITE_SIZE - BADGE_SIZE };
  const paths = [
    ...gridToPaths(SPRITES[base], shades),
    ...(badge ? gridToPaths(BADGE_SPRITES[badge], shades, badgeAt.x, badgeAt.y) : [])
  ];
  const pips = tech !== null && tech > 1 ? Math.floor(tech) : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      data-icon-base={base}
      data-icon-badge={badge ?? undefined}
      className={`shrink-0 ${className}`}
    >
      <title>{label}</title>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
      {Array.from({ length: pips }, (_, i) => (
        <rect key={`pip${i}`} x={i * 2} y={0} width={1} height={1} fill="#fbbf24" />
      ))}
    </svg>
  );
}
