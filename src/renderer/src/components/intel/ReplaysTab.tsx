import React, { useEffect, useState } from 'react';
import type { IntelReplaySummary, IntelReplaysRequest } from '../../../../core/schemas/intel';
import { ipcClient } from '../../lib/ipc-client';
import { useIntel } from '../../lib/use-intel';
import { useSettings } from '../../stores';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { IntelStatus } from './IntelStatus';

const PRESETS = [
  { value: '', label: 'Any mode' },
  { value: 'duel', label: 'Duel' },
  { value: 'team', label: 'Team' },
  { value: 'ffa', label: 'FFA' }
];

/** The public replay page (www.beyondallreason.info/replays?gameId=<id> loads bar-rts.com/replays/<id>). */
export const replayPageUrl = (id: string): string => `https://www.beyondallreason.info/replays?gameId=${id}`;

const minutes = (ms: number): string => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

/** "a, b (WON)  vs  c"; ally teams without players are left out. */
export function teamsText(r: IntelReplaySummary): string {
  const teams = r.AllyTeams.map((t) => ({
    names: [...t.Players.map((p) => p.name), ...(t.AIs ?? []).map((a) => `${a.shortName} (AI)`)],
    won: t.winningTeam === true
  })).filter((t) => t.names.length > 0);
  return teams.length > 0 ? teams.map((t) => `${t.names.join(', ')}${t.won ? ' (WON)' : ''}`).join('  vs  ') : 'No players listed';
}

function CaptureSteps({ id }: { id: string }): React.JSX.Element {
  const dataDir = useSettings((s) => s.settings?.bar.dataDir ?? null);
  return (
    <ol data-testid={`intel-capture-steps-${id}`} className="mt-2 list-inside list-decimal space-y-1 border-t border-zinc-800 pt-2 font-mono text-xs text-zinc-300">
      <li>
        Download the replay from its page (copy into your browser):{' '}
        <code className="select-all break-all text-[#38bdf8]">{replayPageUrl(id)}</code>
      </li>
      <li>Put the file in {dataDir ? <code className="select-all">{`${dataDir}\\demos`}</code> : 'the demos folder of your BAR data folder'}.</li>
      <li>Watch it in BAR with the StratCom widget installed; the widget records it.</li>
      <li>Then in StratCom: Review → pick the session → CAPTURE PLAN.</li>
    </ol>
  );
}

/** Recent replays, searchable by exact map name and player (06 §4.7). */
export function ReplaysTab(): React.JSX.Element {
  const [map, setMap] = useState('');
  const [player, setPlayer] = useState('');
  const [preset, setPreset] = useState('');
  const [req, setReq] = useState<IntelReplaysRequest>({ page: 1 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [mapNames, setMapNames] = useState<string[]>([]);
  const query = useIntel('intel:replays', req);
  const page = req.page ?? 1;

  // the API needs a map's exact script name, so offer the known ones
  useEffect(() => {
    let active = true;
    void ipcClient.invoke('maps:list').then((res) => {
      if (active && res.ok) setMapNames(res.data.map((m) => m.scriptName).sort());
    });
    return () => {
      active = false;
    };
  }, []);

  const search = (e: React.FormEvent): void => {
    e.preventDefault();
    setReq({
      page: 1,
      ...(map.trim() ? { map: map.trim() } : {}),
      ...(player.trim() ? { player: player.trim() } : {}),
      ...(preset ? { preset: preset as NonNullable<IntelReplaysRequest['preset']> } : {})
    });
  };

  const replays = query.data?.data.data ?? [];

  return (
    <div data-testid="intel-replays" className="space-y-3">
      <form onSubmit={search} className="flex flex-wrap items-end gap-2">
        <Input value={map} onChange={(e) => setMap(e.target.value)} list="intel-map-names" placeholder="Map (exact name)" aria-label="Map" data-testid="intel-replays-map" className="w-56" />
        <datalist id="intel-map-names">
          {mapNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <Input value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="Player" aria-label="Player" data-testid="intel-replays-player" className="w-44" />
        <Select options={PRESETS} value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Mode" />
        <Button type="submit" variant="primary" size="md" data-testid="intel-replays-search">
          SEARCH
        </Button>
      </form>

      <IntelStatus fetchedAt={query.data?.fetchedAt} stale={query.data?.stale} error={query.error} loading={query.loading} hasData={query.data !== null} onRetry={query.reload} />

      {query.data && replays.length === 0 && <p className="font-mono text-sm text-zinc-400">No replays found. Map and player searches cover the last 30 days.</p>}

      <ul className="space-y-1.5">
        {replays.map((r) => (
          <li key={r.id} data-testid={`intel-replay-${r.id}`} className="border border-zinc-800 bg-[#0c0e18] p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-sm">
              <span className="text-zinc-100">{r.Map.scriptName}</span>
              <span data-num="true" className="text-xs text-zinc-400">
                {new Date(r.startTime).toLocaleString()} // {minutes(r.durationMs)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-zinc-300">{teamsText(r)}</span>
              <Button variant="ghost" size="sm" onClick={() => setOpenId(openId === r.id ? null : r.id)} data-testid={`intel-capture-${r.id}`} aria-expanded={openId === r.id}>
                HOW TO CAPTURE
              </Button>
            </div>
            {openId === r.id && <CaptureSteps id={r.id} />}
          </li>
        ))}
      </ul>

      {query.data && (
        <div className="flex items-center justify-center gap-3 font-mono text-xs text-zinc-400">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setReq({ ...req, page: page - 1 })}>
            PREV
          </Button>
          <span data-num="true">PAGE {page}</span>
          <Button variant="ghost" size="sm" disabled={replays.length < (query.data.data.limit ?? 24)} onClick={() => setReq({ ...req, page: page + 1 })}>
            NEXT
          </Button>
        </div>
      )}
    </div>
  );
}
