import React from 'react';
import { radarContacts } from '../../../../core/coach/hud-boxes';
import { formatTimeMinutesSeconds } from '../../../../core/coach/hud-text';
import { Provenance } from '../ui/Provenance';

export interface RadarContactsProps {
  /** Identified enemies in LOS by unit (state.json \`enemies\`). */
  enemies: Readonly<Record<string, number>> | null;
  seenAt: Readonly<Record<string, number>>;
  clock: number;
  getUnitName: (unitId?: string) => string;
}

/**
 * Radar mode's panel: every identified enemy in sight, in the widget's order
 * (biggest group first), NEW for 15 s, then how long it has been in sight. The scope itself is drawn
 * in game, where the unit positions are.
 */
export function RadarContacts({ enemies, seenAt, clock, getUnitName }: RadarContactsProps): React.JSX.Element {
  const contacts = enemies ? radarContacts(enemies, seenAt, clock) : [];
  const total = contacts.reduce((n, c) => n + c.count, 0);
  return (
    <div data-testid="radar-contacts" className="rounded border border-[#27272a] bg-[#12131a] p-3 font-mono text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-['Press_Start_2P'] text-[10px] text-[#a1a1aa]">ENEMY CONTACTS</span>
        <span className="flex items-center gap-2">
          <span data-testid="radar-contacts-total" className={total > 0 ? 'text-[#f87171]' : 'text-[#71717a]'}>
            {total > 0 ? `${total} IN SIGHT` : 'NO CONTACT'}
          </span>
          {enemies && <Provenance kind="MEASURED" />}
        </span>
      </div>
      {contacts.length === 0 ? (
        <p className="py-2 text-[11px] text-[#71717a]">{enemies ? 'No enemies in sight.' : 'Waiting for the game.'}</p>
      ) : (
        <ul className="space-y-1">
          {contacts.map((c) => (
            <li key={c.unitId} data-testid="radar-contact" className="flex items-baseline justify-between">
              <span className="text-[13px] text-[#e4e4e7]">
                <span className="text-[#a1a1aa]">{c.count}×</span> {getUnitName(c.unitId)}
              </span>
              <span className={c.fresh ? 'font-bold text-[#fbbf24]' : 'text-[#71717a]'}>
                {c.fresh ? 'NEW' : `${formatTimeMinutesSeconds(c.ageSec)} in sight`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 border-t border-[#1f2430] pt-2 text-[11px] text-[#71717a]">The radar scope is drawn in game, around your commander.</p>
    </div>
  );
}
