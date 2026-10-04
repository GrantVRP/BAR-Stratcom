import React, { useState, useMemo } from 'react';
import type { SessionSummary } from '../../../../core/schemas/session';

export interface SessionListProps {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

type FilterType = 'ALL' | 'PLAYER' | 'SPECTATOR' | 'REPLAY' | 'DEMO';

function formatMss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  } catch {
    return iso.slice(0, 16);
  }
}

export function SessionList({
  sessions,
  selectedSessionId,
  onSelectSession
}: SessionListProps): React.JSX.Element {
  const [filter, setFilter] = useState<FilterType>('ALL');

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filter === 'ALL') return true;
      if (filter === 'DEMO') return s.source === 'fixture';
      if (filter === 'PLAYER') return s.mode === 'player' && s.source !== 'fixture';
      if (filter === 'SPECTATOR') return s.mode === 'spectator';
      if (filter === 'REPLAY') return s.mode === 'replay';
      return true;
    });
  }, [sessions, filter]);

  const filters: FilterType[] = ['ALL', 'PLAYER', 'SPECTATOR', 'REPLAY', 'DEMO'];

  return (
    <div
      data-testid="session-list"
      className="pixel-box flex w-80 shrink-0 flex-col gap-2 border-2 border-black bg-[#12131a] p-3 shadow-[2px_2px_0px_#000]"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
          MATCHES ({filteredSessions.length})
        </span>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            data-testid={`session-filter-${f.toLowerCase()}`}
            onClick={() => setFilter(f)}
            className={`cursor-pointer px-2 py-0.5 font-['Press_Start_2P'] text-[10px] ${
              filter === f
                ? 'border border-black bg-[#449bed] text-black'
                : 'border border-zinc-800 bg-[#0d0f17] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Session Items */}
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center font-mono text-xs text-zinc-500">
            No matches found
          </div>
        ) : (
          filteredSessions.map((s) => {
            const isSelected = s.sessionId === selectedSessionId;
            const isDemo = s.source === 'fixture';

            return (
              <button
                key={s.sessionId}
                type="button"
                data-testid={`session-item-${s.sessionId}`}
                onClick={() => onSelectSession(s.sessionId)}
                className={`w-full cursor-pointer text-left transition-none ${
                  isSelected
                    ? 'border-2 border-[#449bed] bg-[#1a2333]'
                    : 'border border-zinc-800 bg-[#0d0f17] hover:border-zinc-700'
                } p-2`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate font-mono text-xs font-semibold text-zinc-200">
                    {s.mapScriptName}
                  </span>
                  {s.grade ? (
                    <span
                      data-testid={`session-grade-${s.sessionId}`}
                      className={`border px-1.5 py-0.5 font-['Press_Start_2P'] text-[10px] ${
                        s.grade === 'S'
                          ? 'border-[#fbbf24] bg-[#2e2610] text-[#fbbf24]'
                          : s.grade === 'A'
                            ? 'border-[#4ade80] bg-[#13281b] text-[#4ade80]'
                            : s.grade === 'B'
                              ? 'border-[#60a5fa] bg-[#132032] text-[#60a5fa]'
                              : s.grade === 'C'
                                ? 'border-[#fbbf24] bg-[#2e2610] text-[#fbbf24]'
                                : 'border-[#f87171] bg-[#2e1316] text-[#f87171]'
                      }`}
                    >
                      {s.grade}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-zinc-600">-</span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between gap-1 font-mono text-xs text-zinc-400">
                  <span className="tabular-nums">{formatDate(s.startedAt)}</span>
                  <span className="tabular-nums">{formatMss(s.durationSec)}</span>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5">
                  {isDemo ? (
                    <span
                      data-testid={`session-demo-badge-${s.sessionId}`}
                      className="border border-[#2ec4b6] bg-[#0d2a28] px-1 py-0.5 font-['Press_Start_2P'] text-[10px] text-[#2ec4b6]"
                    >
                      DEMO
                    </span>
                  ) : (
                    <span className="border border-zinc-800 bg-[#12131a] px-1 py-0.5 font-['Press_Start_2P'] text-[10px] text-zinc-400 uppercase">
                      {s.mode}
                    </span>
                  )}
                  {s.factionId && (
                    <span className="font-mono text-xs uppercase text-zinc-400">
                      {s.factionId}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
