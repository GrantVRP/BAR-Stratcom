import { describe, it, expect } from 'vitest';
import type { WidgetEvent } from '../schemas/protocol';
import { createFinishedLedger, applyEventsToLedger } from './ledger';

describe('FinishedLedger', () => {
  it('creates an empty ledger', () => {
    const ledger = createFinishedLedger();
    expect(ledger).toEqual({});
  });

  it('accumulates finished events and sorts them chronologically', () => {
    const events: WidgetEvent[] = [
      { f: 900, e: 'finished', u: 101, d: 'armmex', tm: 0 }, // 30s
      { f: 300, e: 'finished', u: 102, d: 'armmex', tm: 0 }, // 10s
      { f: 600, e: 'finished', u: 103, d: 'armsolar', tm: 0 } // 20s
    ];

    const ledger = applyEventsToLedger({}, events, 0);
    expect(ledger['armmex']).toEqual([10, 30]);
    expect(ledger['armsolar']).toEqual([20]);
  });

  it('filters out events from other teams', () => {
    const events: WidgetEvent[] = [
      { f: 300, e: 'finished', u: 101, d: 'armmex', tm: 0 },
      { f: 300, e: 'finished', u: 102, d: 'armmex', tm: 1 }
    ];

    const ledger = applyEventsToLedger({}, events, { teamId: 0 });
    expect(ledger['armmex']).toEqual([10]);
  });

  it('deduplicates unit instance IDs when seenUnitIds is provided', () => {
    const seen = new Set<number>();
    const events: WidgetEvent[] = [
      { f: 300, e: 'finished', u: 101, d: 'armmex', tm: 0 },
      { f: 300, e: 'finished', u: 101, d: 'armmex', tm: 0 }
    ];

    const ledger = applyEventsToLedger({}, events, { teamId: 0, seenUnitIds: seen });
    expect(ledger['armmex']).toEqual([10]);
    expect(seen.has(101)).toBe(true);
  });

  it('ignores non-finished events (including destroyed)', () => {
    const events: WidgetEvent[] = [
      { f: 0, e: 'gamestart' },
      { f: 100, e: 'created', u: 101, d: 'armmex', tm: 0 },
      { f: 300, e: 'finished', u: 101, d: 'armmex', tm: 0 },
      { f: 600, e: 'destroyed', u: 101, d: 'armmex', tm: 0 },
      { f: 900, e: 'gameover' }
    ];

    const ledger = applyEventsToLedger({}, events, 0);
    expect(ledger['armmex']).toEqual([10]);
  });
});
