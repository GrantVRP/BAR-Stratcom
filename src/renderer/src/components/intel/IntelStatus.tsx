import React from 'react';
import { Button } from '../ui/Button';

export interface IntelStatusProps {
  fetchedAt?: string;
  stale?: boolean;
  error: string | null;
  loading: boolean;
  hasData: boolean;
  onRetry: () => void;
}

const time = (iso: string): string => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Where the data came from: fetch time, or the cached copy, or the error. */
export function IntelStatus({ fetchedAt, stale, error, loading, hasData, onRetry }: IntelStatusProps): React.JSX.Element | null {
  if (!hasData && error) {
    return (
      <div data-testid="intel-offline" className="flex flex-wrap items-center gap-3 border border-[#f87171]/50 bg-[#2b0c10] p-3 font-mono text-sm text-zinc-200">
        <span>
          Could not reach BAR&apos;s servers ({error}). Check your connection, then retry. <span className="text-zinc-400">(INTEL-OFFLINE)</span>
        </span>
        <Button variant="default" size="sm" onClick={onRetry}>
          RETRY
        </Button>
      </div>
    );
  }
  if (!hasData) {
    return loading ? <div className="p-6 text-center font-['Press_Start_2P'] text-[10px] text-zinc-400">LOADING…</div> : null;
  }
  return (
    <div data-testid="intel-status" className="flex items-center gap-2 font-mono text-xs text-zinc-400">
      {stale ? (
        <span className="text-[#fbbf24]">OFFLINE // data from {fetchedAt ? time(fetchedAt) : 'unknown'}</span>
      ) : (
        <span data-num="true">UPDATED {fetchedAt ? time(fetchedAt) : 'unknown'}</span>
      )}
      {loading && <span>// refreshing…</span>}
    </div>
  );
}
