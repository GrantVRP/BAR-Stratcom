import type { WidgetEvent } from '../schemas/protocol';

/**
 * FinishedLedger maps unitDef name (unitId) to a sorted list of game seconds when units finished.
 * Never decremented when units die.
 */
export type FinishedLedger = Record<string, number[]>;

export function createFinishedLedger(): FinishedLedger {
  return {};
}

export interface ApplyEventsOptions {
  teamId?: number;
  seenUnitIds?: Set<number>;
}

/**
 * Applies widget events to a FinishedLedger.
 * Only 'finished' events for the specified team add to the ledger.
 * 'destroyed' events are strictly ignored (ledger never decrements).
 */
export function applyEventsToLedger(
  ledger: FinishedLedger,
  events: readonly WidgetEvent[],
  options?: number | ApplyEventsOptions
): FinishedLedger {
  const teamId = typeof options === 'number' ? options : options?.teamId;
  const seenUnitIds = typeof options === 'object' ? options?.seenUnitIds : undefined;

  const updated: FinishedLedger = {};
  for (const [k, v] of Object.entries(ledger)) {
    updated[k] = [...v];
  }

  for (const ev of events) {
    if (ev.e !== 'finished') {
      continue;
    }

    if (teamId !== undefined && ev.tm !== teamId) {
      continue;
    }

    if (seenUnitIds) {
      if (seenUnitIds.has(ev.u)) {
        continue;
      }
      seenUnitIds.add(ev.u);
    }

    const unitDef = ev.d;
    const finishSec = ev.f / 30;

    if (!updated[unitDef]) {
      updated[unitDef] = [];
    }
    updated[unitDef].push(finishSec);
    updated[unitDef].sort((a, b) => a - b);
  }

  return updated;
}
