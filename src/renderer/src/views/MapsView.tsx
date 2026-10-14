import React, { useEffect, useMemo, useState } from 'react';
import type { MapRecord } from '../../../core/schemas';
import { ipcClient } from '../lib/ipc-client';
import { usePlans } from '../stores';
import { MapDetail } from '../components/maps/MapDetail';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';

/** Most maps shown in the list at once; the search narrows it. */
const LIST_LIMIT = 100;

/** Popularity rank first (most played), unranked maps after, by name. */
export function sortMaps(maps: readonly MapRecord[]): MapRecord[] {
  return [...maps].sort(
    (a, b) => (a.popularity?.rank ?? Infinity) - (b.popularity?.rank ?? Infinity) || a.name.localeCompare(b.name)
  );
}

export function searchMaps(maps: readonly MapRecord[], query: string): MapRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...maps];
  return maps.filter((m) => [m.name, m.scriptName, m.author ?? ''].some((t) => t.toLowerCase().includes(q)));
}

/** Navigation goes through the hash router. */
const goTo = (hash: string): void => {
  window.location.hash = hash;
};

const mapFromHash = (): string | null => {
  const m = /^#\/maps\/(.+)$/.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]!) : null;
};

/** Maps: searchable list by popularity, detail with the map's facts. */
export function MapsView(): React.JSX.Element {
  const loadPlans = usePlans((s) => s.loadPlans);
  const [maps, setMaps] = useState<MapRecord[] | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(mapFromHash);

  useEffect(() => {
    let active = true;
    void ipcClient.invoke('maps:list').then((res) => {
      if (active) setMaps(res.ok ? sortMaps(res.data) : []);
    });
    void loadPlans();
    const onHash = (): void => {
      const name = mapFromHash();
      if (name) setSelected(name);
    };
    window.addEventListener('hashchange', onHash);
    return () => {
      active = false;
      window.removeEventListener('hashchange', onHash);
    };
  }, [loadPlans]);

  const found = useMemo(() => searchMaps(maps ?? [], query), [maps, query]);
  const current = (maps ?? []).find((m) => m.fileName === selected) ?? found[0] ?? null;

  const select = (m: MapRecord): void => {
    setSelected(m.fileName);
    goTo(`#/maps/${encodeURIComponent(m.fileName)}`);
  };

  return (
    <div data-testid="view-maps" className="mx-auto max-w-6xl space-y-4 p-6">
      <PageHeader title="MAPS" actions={maps ? <span className="font-mono text-xs text-zinc-400" data-num="true">{maps.length} MAPS</span> : undefined} />
      {maps === null && <p className="font-mono text-sm text-zinc-400">Loading maps…</p>}
      {maps !== null && maps.length === 0 && <p className="font-mono text-sm text-zinc-400">No map data found.</p>}
      {maps !== null && maps.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search maps or authors" aria-label="Search maps" data-testid="maps-search" className="w-full" />
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto pr-1" aria-label="Maps">
              {found.slice(0, LIST_LIMIT).map((m) => (
                <li key={m.fileName}>
                  <button
                    type="button"
                    data-testid={`map-item-${m.fileName}`}
                    onClick={() => select(m)}
                    className={`w-full border bg-[#0c0e18] px-2.5 py-1.5 text-left ${m.fileName === current?.fileName ? 'border-[#449bed]' : 'border-zinc-800 hover:border-zinc-600'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-sm text-zinc-100">{m.scriptName}</span>
                      {m.popularity && <span className="shrink-0 font-mono text-xs text-zinc-400" data-num="true">#{m.popularity.rank}</span>}
                    </div>
                    <div className="font-mono text-xs text-zinc-400" data-num="true">
                      {m.sizeX}×{m.sizeZ} // wind {m.wind.min}–{m.wind.max}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <p className="font-mono text-xs text-zinc-400" data-num="true">
              {found.length > LIST_LIMIT ? `Showing ${LIST_LIMIT} of ${found.length}; search to narrow.` : `${found.length} maps`}
            </p>
          </div>
          {current ? (
            <MapDetail map={current} onAdapted={(plan) => goTo(`#/library/${plan.id}`)} />
          ) : (
            <p className="font-mono text-sm text-zinc-400">No map matches.</p>
          )}
        </div>
      )}
    </div>
  );
}
