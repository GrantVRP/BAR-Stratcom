import { describe, expect, it } from 'vitest';
import { LiveSnapshotSchema } from '../../core/schemas/live';
import { TickStats, noTelemetrySnapshot } from './tick-support';

describe('coach tick support', () => {
  it('summarises tick durations as p50 / p95 / max over the last ticks', () => {
    const stats = new TickStats(100);
    expect(stats.summary()).toEqual({ count: 0, p50: 0, p95: 0, max: 0 });
    for (let i = 1; i <= 200; i++) stats.record(i); // only the last 100 (101..200) are kept
    expect(stats.summary()).toEqual({ count: 100, p50: 150, p95: 195, max: 200 });
  });

  it('feeds the coach nothing measured before game data arrives', () => {
    const snap = LiveSnapshotSchema.parse(noTelemetrySnapshot(42));
    expect(snap).toMatchObject({ frame: 1260, gameSeconds: 42, me: null, res: null, bp: { total: 0, active: 0 }, wind: { current: 0 } });
  });
});
