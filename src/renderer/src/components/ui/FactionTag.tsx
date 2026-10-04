import React from 'react';
import { FactionEmblem } from './FactionEmblem';
import { Tag } from './Tag';
import { factionTagVariant } from '../../lib/faction-style';

export interface FactionTagProps {
  factionId: string | null | undefined;
  /** Emblem size in px; 0 hides the emblem. */
  emblemSize?: number;
  className?: string;
}

/** A faction's emblem and name in that faction's colour (Armada blue, Cortex red). */
export function FactionTag({ factionId, emblemSize = 14, className = '' }: FactionTagProps): React.JSX.Element | null {
  if (!factionId) return null;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`.trim()} data-faction-tag={factionId.toLowerCase()}>
      {emblemSize > 0 && <FactionEmblem faction={factionId} size={emblemSize} />}
      <Tag variant={factionTagVariant(factionId)}>{factionId}</Tag>
    </span>
  );
}
