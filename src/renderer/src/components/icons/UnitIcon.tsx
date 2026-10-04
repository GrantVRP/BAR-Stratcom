import React, { useMemo } from 'react';
import { iconSpecFor } from '../../../../core/icons/icon-spec';
import { getClientRegistry } from '../../lib/registry';
import { useSnapshot } from '../../stores';
import { SpriteIcon } from './SpriteIcon';
import { unitSpriteUrl } from './unit-sprites';

const ART_TOOLTIP = 'unit art by IceXuick & Floris';

export interface UnitIconProps {
  unitId: string;
  size?: number;
  className?: string;
}

/**
 * A unit's icon: its 32-bit pixel sprite (T10.5) when we have one, otherwise the original class
 * sprite chosen from the active snapshot (06 §4.8, T10.3).
 */
export function UnitIcon({ unitId, size = 24, className = '' }: UnitIconProps): React.JSX.Element {
  const snapshot = useSnapshot((s) => s.snapshot);
  const resolved = useMemo(() => {
    if (!snapshot) return null;
    const registry = getClientRegistry(snapshot);
    const unit = registry.get(unitId);
    return unit ? { unit, spec: iconSpecFor(unit, registry) } : null;
  }, [snapshot, unitId]);

  const sprite = unitSpriteUrl(unitId, size);
  const label = resolved ? `${resolved.unit.name} (${resolved.unit.id})` : unitId;

  if (sprite) {
    return (
      <img
        src={sprite.url}
        alt={label}
        title={`${label} // ${ART_TOOLTIP}`}
        width={size}
        height={size}
        draggable={false}
        data-unit-sprite={unitId}
        className={`shrink-0 select-none ${className}`}
        // Whole-pixel upscales stay crisp; downscales are smoothed so small icons keep their shape
        style={{ imageRendering: size >= sprite.nativeSize ? 'pixelated' : 'auto' }}
      />
    );
  }
  if (!resolved) {
    return <SpriteIcon base="structure" size={size} label="Unknown unit" className={className} />;
  }
  return <SpriteIcon {...resolved.spec} size={size} label={label} className={className} />;
}
