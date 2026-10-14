import type { LiveSnapshot } from '../../core/schemas/live';

/**
 * The coach's input before the game sends data (and in manual-clock mode): nothing measured. No
 * player, no resources (every resource alert needs `res`), zero counts; never a made-up "typical"
 * wind or build power.
 */
export function noTelemetrySnapshot(gameSeconds: number): LiveSnapshot {
  return {
    frame: Math.round(gameSeconds * 30),
    gameSeconds,
    me: null,
    wind: { current: 0 },
    res: null,
    counts: {},
    builders: { total: 0, idle: 0 },
    factories: { total: 0, idle: 0 },
    commander: { alive: false, idle: false },
    bp: { total: 0, active: 0 },
    enemies: {}
  };
}

export interface TickSummary {
  count: number;
  p50: number;
  p95: number;
  max: number;
}

/** Coach tick durations (evaluate + write) for the budget: the last `capacity` ticks. */
export class TickStats {
  private readonly samples: number[] = [];
  constructor(private readonly capacity = 1200) {}

  record(ms: number): void {
    this.samples.push(ms);
    if (this.samples.length > this.capacity) this.samples.shift();
  }

  summary(): TickSummary {
    const sorted = [...this.samples].sort((a, b) => a - b);
    const at = (p: number): number => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)]! : 0);
    return { count: sorted.length, p50: at(0.5), p95: at(0.95), max: sorted.at(-1) ?? 0 };
  }
}
