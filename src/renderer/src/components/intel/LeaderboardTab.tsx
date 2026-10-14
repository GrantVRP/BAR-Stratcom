import React, { useState } from 'react';
import { useIntel } from '../../lib/use-intel';
import { Tabs } from '../ui/Tabs';
import { IntelStatus } from './IntelStatus';

/** Ranked players per category; the season is discovered from the server, not hard-coded. */
export function LeaderboardTab(): React.JSX.Element {
  const query = useIntel('intel:leaderboard');
  const [category, setCategory] = useState<string | null>(null);
  const board = query.data?.data ?? null;
  const active = board?.categories.find((c) => c.name === category) ?? board?.categories[0] ?? null;

  return (
    <div data-testid="intel-leaderboard" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {board && <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">SEASON {board.season}</span>}
        <IntelStatus
          fetchedAt={query.data?.fetchedAt}
          stale={query.data?.stale}
          error={query.error}
          loading={query.loading}
          hasData={query.data !== null}
          onRetry={query.reload}
        />
      </div>

      {board && active && (
        <>
          <Tabs tabs={board.categories.map((c) => ({ id: c.name, label: c.name.toUpperCase() }))} activeId={active.name} onChange={setCategory} />
          <table className="w-full border-collapse font-mono text-sm" aria-label={`${active.name} leaderboard`}>
            <thead>
              <tr className="text-left text-xs text-zinc-400">
                <th className="w-12 py-1 font-normal">#</th>
                <th className="py-1 font-normal">PLAYER</th>
                <th className="py-1 text-right font-normal">RATING</th>
              </tr>
            </thead>
            <tbody>
              {active.players.map((p, i) => (
                <tr key={p.id} className="border-t border-zinc-800">
                  <td data-num="true" className="py-1.5 text-zinc-400">{i + 1}</td>
                  <td className="py-1.5 text-zinc-100">{p.name}</td>
                  <td data-num="true" className="py-1.5 text-right text-[#38bdf8]">{p.rating.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {active.players.length === 0 && <p className="font-mono text-sm text-zinc-400">No ranked players yet.</p>}
        </>
      )}
    </div>
  );
}
