import { describe, expect, it } from 'vitest';
import { statesToChartSeries } from './EconomyChart';

// Player-mode state docs shaped like data/fixtures/sessions/2026-10-02-armada-1v1-vs-ai-isthmus.
function doc(gameSeconds: number, metalIncome: number): Record<string, unknown> {
  const pool = (current: number, income: number) => ({ share: 0.99, current, storage: 1000, received: 0, pull: 2, expense: 2, sent: 0, income });
  return {
    gameSeconds,
    frame: gameSeconds * 30,
    res: { energy: pool(800, 25), metal: pool(300, metalIncome) },
    bp: { active: 280, total: 300 },
    me: { factionId: 'armada', teamId: 0 }
  };
}

describe('Review economy chart series', () => {
  it('reads income, storage and build power from res / bp of recorded state docs', () => {
    const series = statesToChartSeries([doc(0, 0), doc(60, 4.5), doc(120, 9)])!;
    expect(series.points.map((p) => [p.t, p.metal.income])).toEqual([
      [0, 0],
      [60, 4.5],
      [120, 9]
    ]);
    expect(series.points[1]).toMatchObject({
      metal: { current: 300, storage: 1000, income: 4.5, spend: 2 },
      energy: { current: 800, storage: 1000, income: 25, spend: 2 },
      bpTotal: 300,
      bpActive: 280
    });
  });

  it('has no series for spectator docs (no own resources) or no docs', () => {
    expect(statesToChartSeries([{ gameSeconds: 10, res: null, teams: [] }])).toBeNull();
    expect(statesToChartSeries([])).toBeNull();
    expect(statesToChartSeries(null)).toBeNull();
  });
});
