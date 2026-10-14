import React, { useState } from 'react';
import type { IntelBalanceChange, IntelPropertyChange } from '../../../../core/schemas/intel';
import { useIntel } from '../../lib/use-intel';
import { useSnapshot } from '../../stores';
import { Button } from '../ui/Button';
import { IntelStatus } from './IntelStatus';
import { UnitLink, UnitLinkedText } from './UnitLinkedText';

interface ChangeLine {
  path: string;
  prev: unknown;
  next: unknown;
  percent: number | null;
}

/** Flattens a unit's change tree into "Weapons › Rocket › Turn Rate" lines with old → new values. */
export function changeLines(unit: IntelPropertyChange): ChangeLine[] {
  const lines: ChangeLine[] = [];
  const walk = (node: IntelPropertyChange, path: string[]): void => {
    if (node.changes && node.changes.length > 0) {
      for (const child of node.changes) walk(child, [...path, child.propertyName]);
      return;
    }
    lines.push({ path: path.join(' › '), prev: node.prevValue, next: node.newValue, percent: node.percentChange ?? null });
  };
  for (const child of unit.changes ?? []) walk(child, [child.propertyName]);
  return lines;
}

const show = (v: unknown): string => (v === undefined || v === null ? '–' : typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : typeof v === 'string' ? v : JSON.stringify(v));

function UnitChanges({ unit }: { unit: IntelPropertyChange }): React.JSX.Element {
  const known = useSnapshot((s) => s.getUnit(unit.propertyId));
  return (
    <div className="space-y-1">
      <div className="font-mono text-sm">
        {known ? <UnitLink unitId={known.id}>{known.name}</UnitLink> : <span className="text-zinc-200">{unit.propertyName}</span>}
        <span className="ml-2 text-xs text-zinc-400">{unit.propertyId}{known ? '' : ' // not in your game data'}</span>
      </div>
      <ul className="space-y-0.5 pl-3 font-mono text-xs text-zinc-300">
        {changeLines(unit).map((l, i) => (
          <li key={i}>
            {l.path}: <span data-num="true">{show(l.prev)} → {show(l.next)}</span>
            {l.percent !== null && (
              <span data-num="true" className={l.percent >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}>
                {' '}
                ({l.percent >= 0 ? '+' : ''}
                {Math.round(l.percent)}%)
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChangeEntry({ change, open }: { change: IntelBalanceChange; open: boolean }): React.JSX.Element {
  const [title, ...rest] = change.message.split('\n');
  const body = rest.join('\n').trim();
  return (
    <details open={open} data-testid={`intel-balance-${change.sha.slice(0, 7)}`} className="border border-zinc-800 bg-[#0c0e18] p-3">
      <summary className="cursor-pointer font-mono text-sm text-zinc-100">
        <span data-num="true" className="mr-2 text-xs text-zinc-400">{change.date.slice(0, 10)}</span>
        <UnitLinkedText text={title ?? ''} />
        <span className="ml-2 text-xs text-zinc-400">// {change.author.name}</span>
      </summary>
      <div className="mt-2 space-y-3">
        {body && (
          <p className="whitespace-pre-wrap font-mono text-xs text-zinc-300">
            <UnitLinkedText text={body} />
          </p>
        )}
        {change.changes.map((c) => (
          <UnitChanges key={c.unit.propertyId} unit={c.unit} />
        ))}
      </div>
    </details>
  );
}

/** Balance changes from BAR's API, unit names linked to the catalog. */
export function BalanceTab(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const query = useIntel('intel:balance', { page });
  const result = query.data?.data ?? null;

  return (
    <div data-testid="intel-balance" className="space-y-3">
      <IntelStatus fetchedAt={query.data?.fetchedAt} stale={query.data?.stale} error={query.error} loading={query.loading} hasData={query.data !== null} onRetry={query.reload} />
      {result && result.data.length === 0 && <p className="font-mono text-sm text-zinc-400">No balance changes listed.</p>}
      {result?.data.map((c, i) => (
        <ChangeEntry key={c.sha} change={c} open={i === 0} />
      ))}
      {result && (
        <div className="flex items-center justify-center gap-3 font-mono text-xs text-zinc-400">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            NEWER
          </Button>
          <span data-num="true">PAGE {page}</span>
          <Button variant="ghost" size="sm" disabled={page * result.limit >= result.totalResults} onClick={() => setPage(page + 1)}>
            OLDER
          </Button>
        </div>
      )}
    </div>
  );
}
