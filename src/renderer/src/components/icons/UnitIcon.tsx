import React, { useMemo } from 'react';
import { iconSpecFor } from '../../../../core/icons/icon-spec';
import { getClientRegistry } from '../../lib/registry';
import { useSnapshot } from '../../stores';
import { SpriteIcon } from './SpriteIcon';

export interface UnitIconProps {
  unitId: string;
  size?: number;
  className?: string;
}

/** Original class icon for a unit, chosen from the active snapshot (06 §4.8, T10.3). */
export function UnitIcon({ unitId, size = 24, className }: UnitIconProps): React.JSX.Element {
  const snapshot = useSnapshot((s) => s.snapshot);
  const resolved = useMemo(() => {
    if (!snapshot) return null;
    const registry = getClientRegistry(snapshot);
    const unit = registry.get(unitId);
    return unit ? { unit, spec: iconSpecFor(unit, registry) } : null;
  }, [snapshot, unitId]);

  if (!resolved) {
    return <SpriteIcon base="structure" size={size} label="Unknown unit" className={className} />;
  }
  return (
    <SpriteIcon
      {...resolved.spec}
      size={size}
      label={`${resolved.unit.name} (${resolved.unit.id})`}
      className={className}
    />
  );
}
