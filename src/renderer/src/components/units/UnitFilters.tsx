import React from 'react';
import { Search } from 'lucide-react';
import type { UnitClass } from '../../../../core/registry';
import type { Faction } from '../../../../core/schemas';
import { CLASS_LABELS } from '../../lib/unit-catalog';

export interface UnitFiltersProps {
  factions: Faction[];
  factionId: string;
  onFaction: (id: string) => void;
  unitClass: UnitClass | 'all';
  onClass: (c: UnitClass | 'all') => void;
  techLevels: number[];
  tech: number | 'all';
  onTech: (t: number | 'all') => void;
  query: string;
  onQuery: (q: string) => void;
}

function chip(active: boolean): string {
  return `cursor-pointer border-2 px-2 py-1 font-['Press_Start_2P'] text-[10px] active:translate-y-0.5 ${
    active ? 'border-black bg-[#fbbf24] text-black' : 'border-zinc-800 bg-[#0d0f17] text-zinc-400 hover:text-zinc-200'
  }`;
}

const ALL_CLASSES = Object.keys(CLASS_LABELS) as UnitClass[];

/** Units view filters: faction (enabled only), search, class chips and tech chips (06 §4.8). */
export function UnitFilters(props: UnitFiltersProps): React.JSX.Element {
  const { factions, factionId, onFaction, unitClass, onClass, techLevels, tech, onTech, query, onQuery } = props;
  return (
    <div className="pixel-box space-y-3 bg-[#0c0e18] p-3">
      <div className="flex flex-wrap items-center gap-2">
        {factions.map((f) => (
          <button
            key={f.id}
            type="button"
            data-testid={`units-faction-${f.id}`}
            onClick={() => onFaction(f.id)}
            className={`cursor-pointer border-2 px-3 py-1.5 font-['Press_Start_2P'] text-[10px] active:translate-y-0.5 ${
              factionId === f.id ? 'border-black text-black' : 'border-zinc-800 bg-[#0d0f17] text-zinc-400'
            }`}
            style={factionId === f.id ? { backgroundColor: f.accent } : undefined}
          >
            {f.displayName.toUpperCase()}
          </button>
        ))}
        <div className="flex min-w-60 flex-1 items-center gap-2 border-2 border-zinc-800 bg-[#090b14] px-2.5 py-1.5">
          <Search className="size-3.5 shrink-0 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search by name, old name or unit id…"
            data-testid="input-units-search"
            className="w-full bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2" data-testid="units-class-chips">
        <button type="button" onClick={() => onClass('all')} className={chip(unitClass === 'all')}>
          ALL
        </button>
        {ALL_CLASSES.map((c) => (
          <button key={c} type="button" onClick={() => onClass(c)} className={chip(unitClass === c)} data-testid={`units-class-${c}`}>
            {CLASS_LABELS[c]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onTech('all')} className={chip(tech === 'all')}>
          ALL TECH
        </button>
        {techLevels.map((t) => (
          <button key={t} type="button" onClick={() => onTech(t)} className={chip(tech === t)} data-testid={`units-tech-${t}`}>
            T{t}
          </button>
        ))}
      </div>
    </div>
  );
}
