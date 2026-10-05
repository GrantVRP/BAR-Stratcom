import React, { useMemo, useState } from 'react';
import type { IntelBattle } from '../../../../core/schemas/intel';
import { useIntel } from '../../lib/use-intel';
import { Input } from '../ui/Input';
import { IntelStatus } from './IntelStatus';

/** Battles refresh every 20 s while this tab is shown and the window is visible (06 §4.7). */
export const BATTLES_REFRESH_MS = 20_000;

const clock = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const playing = (b: IntelBattle): IntelBattle['players'] => b.players.filter((p) => p.gameStatus === 'Playing');

function stateLabel(b: IntelBattle): { text: string; live: boolean } {
  if (b.gameStatus === 'running') return { text: b.gameTime ? `IN GAME ${clock(b.gameTime)}` : 'IN GAME', live: true };
  return { text: 'LOBBY', live: false };
}

export function BattlesTab(): React.JSX.Element {
  const query = useIntel('intel:battles', undefined, BATTLES_REFRESH_MS);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const battles = useMemo(() => {
    const all = query.data?.data ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return all;
    return all.filter((b) => [b.title, b.map, ...b.players.map((p) => p.username)].some((t) => t.toLowerCase().includes(q)));
  }, [query.data, filter]);
  const selected = battles.find((b) => b.battleId === selectedId) ?? battles[0] ?? null;

  return (
    <div data-testid="intel-battles" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by title, map or player"
          aria-label="Filter battles"
          className="w-full max-w-sm"
          data-testid="intel-battles-filter"
        />
        <IntelStatus
          fetchedAt={query.data?.fetchedAt}
          stale={query.data?.stale}
          error={query.error}
          loading={query.loading}
          hasData={query.data !== null}
          onRetry={query.reload}
        />
      </div>

      {query.data && battles.length === 0 && <p className="font-mono text-sm text-zinc-400">No battles match.</p>}

      {battles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <ul className="space-y-1.5 lg:col-span-3" aria-label="Battles">
            {battles.map((b) => {
              const state = stateLabel(b);
              return (
                <li key={b.battleId}>
                  <button
                    type="button"
                    data-testid={`intel-battle-${b.battleId}`}
                    onClick={() => setSelectedId(b.battleId)}
                    className={`w-full border bg-[#0c0e18] p-2.5 text-left ${b.battleId === selected?.battleId ? 'border-[#449bed]' : 'border-zinc-800 hover:border-zinc-600'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-sm text-zinc-100">{b.title}</span>
                      <span className={`shrink-0 font-mono text-xs ${state.live ? 'text-[#4ade80]' : 'text-zinc-400'}`}>{state.text}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-xs text-zinc-400">
                      <span className="truncate">{b.map}</span>
                      <span data-num="true" className="shrink-0">
                        {playing(b).length}/{b.maxPlayers} PLAYING{b.spectators ? ` // ${b.spectators} SPEC` : ''}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <section data-testid="intel-battle-detail" className="space-y-2 border border-zinc-800 bg-[#0c0e18] p-3 lg:col-span-2">
              <h3 className="font-mono text-sm text-zinc-100">{selected.title}</h3>
              <p className="font-mono text-xs text-zinc-400">
                {selected.map} // {selected.preset ?? selected.gameType ?? 'custom'} // host {selected.founder.username}
              </p>
              <ul className="space-y-1 font-mono text-sm">
                {playing(selected).map((p) => (
                  <li key={p.username} className="flex justify-between gap-2">
                    <span className="truncate text-zinc-200">{p.username}</span>
                    <span data-num="true" className="shrink-0 text-zinc-400">{p.skill ?? 'unknown'}</span>
                  </li>
                ))}
              </ul>
              {playing(selected).length === 0 && <p className="font-mono text-xs text-zinc-400">No players listed.</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
