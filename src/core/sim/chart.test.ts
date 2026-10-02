import { describe, expect, it } from 'vitest';
import { toChartSeries } from './chart';
import type { SimResult, SimSample } from './types';

function createSyntheticSample(t: number, overrides: Partial<SimSample> = {}): SimSample {
  return {
    t,
    metal: { current: 500, storage: 1000, income: 5, spend: 2 },
    energy: { current: 500, storage: 1000, income: 30, spend: 10 },
    bpTotal: 300,
    bpActive: 300,
    stallMetal: false,
    stallEnergy: false,
    ...overrides
  };
}

function createSyntheticResult(
  sampleCount: number,
  modifySample?: (t: number) => Partial<SimSample>,
  resultOverrides: Partial<SimResult> = {}
): SimResult {
  const samples: SimSample[] = [];
  for (let t = 0; t < sampleCount; t++) {
    const overrides = modifySample ? modifySample(t) : {};
    samples.push(createSyntheticSample(t, overrides));
  }
  return {
    samples,
    steps: [],
    intervals: {
      metalStall: [],
      energyStall: [],
      metalFloat: [],
      energyFloat: []
    },
    totals: { metalStallSec: 0, energyStallSec: 0, idleBpSec: 0 },
    flags: [],
    ...resultOverrides
  };
}

describe('toChartSeries (04 §2.4, T04.6)', () => {
  it('returns all points when sample count is less than or equal to maxPoints', () => {
    const result = createSyntheticResult(150);
    const series = toChartSeries(result, { maxPoints: 300 });

    expect(series.points).toHaveLength(150);
    expect(series.points[0]?.t).toBe(0);
    expect(series.points[149]?.t).toBe(149);
    expect(series.intervals).toBe(result.intervals);
    expect(series.totals).toBe(result.totals);
    expect(series.flags).toBe(result.flags);
  });

  it('downsamples to at most maxPoints when sample count exceeds maxPoints', () => {
    const result = createSyntheticResult(901);
    const series = toChartSeries(result, { maxPoints: 300 });

    expect(series.points.length).toBeLessThanOrEqual(300);
    expect(series.points[0]?.t).toBe(0);
    expect(series.points[series.points.length - 1]?.t).toBe(900);
  });

  it('keeps exact interval start and end boundaries for stall and float intervals', () => {
    const result = createSyntheticResult(901, (t) => ({
      stallMetal: t >= 123 && t <= 145,
      stallEnergy: t >= 310 && t <= 330
    }), {
      intervals: {
        metalStall: [{ start: 123, end: 145 }],
        energyStall: [{ start: 310, end: 330 }],
        metalFloat: [{ start: 512, end: 580 }],
        energyFloat: [{ start: 720, end: 750 }]
      }
    });

    const series = toChartSeries(result, { maxPoints: 200 });

    const timestamps = new Set(series.points.map((p) => p.t));
    expect(timestamps.has(123)).toBe(true);
    expect(timestamps.has(145)).toBe(true);
    expect(timestamps.has(310)).toBe(true);
    expect(timestamps.has(330)).toBe(true);
    expect(timestamps.has(512)).toBe(true);
    expect(timestamps.has(580)).toBe(true);
    expect(timestamps.has(720)).toBe(true);
    expect(timestamps.has(750)).toBe(true);
    expect(series.points.length).toBeLessThanOrEqual(200);
  });

  it('keeps stall transition sample points exact when flags toggle', () => {
    const result = createSyntheticResult(901, (t) => ({
      stallMetal: t === 42 || t === 43,
      stallEnergy: t === 80
    }));

    const series = toChartSeries(result, { maxPoints: 100 });
    const timestamps = new Set(series.points.map((p) => p.t));

    // Transitions: 41->42, 43->44, 79->80, 80->81
    expect(timestamps.has(41)).toBe(true);
    expect(timestamps.has(42)).toBe(true);
    expect(timestamps.has(43)).toBe(true);
    expect(timestamps.has(44)).toBe(true);
    expect(timestamps.has(79)).toBe(true);
    expect(timestamps.has(80)).toBe(true);
    expect(timestamps.has(81)).toBe(true);
  });

  it('ensures timestamps in points are strictly monotonically increasing without duplicates', () => {
    const result = createSyntheticResult(901, (t) => ({
      stallMetal: t >= 50 && t <= 75
    }), {
      intervals: {
        metalStall: [{ start: 50, end: 75 }],
        energyStall: [],
        metalFloat: [],
        energyFloat: []
      }
    });

    const series = toChartSeries(result, { maxPoints: 150 });
    for (let i = 1; i < series.points.length; i++) {
      expect(series.points[i]!.t).toBeGreaterThan(series.points[i - 1]!.t);
    }
  });

  it('preserves all critical boundaries even if maxPoints is smaller than critical count', () => {
    const result = createSyntheticResult(500, undefined, {
      intervals: {
        metalStall: [
          { start: 10, end: 20 },
          { start: 30, end: 40 },
          { start: 50, end: 60 }
        ],
        energyStall: [],
        metalFloat: [],
        energyFloat: []
      }
    });

    // maxPoints: 4 is smaller than critical boundaries (0, 10, 20, 30, 40, 50, 60, 499)
    const series = toChartSeries(result, { maxPoints: 4 });
    const timestamps = new Set(series.points.map((p) => p.t));
    expect(timestamps.has(0)).toBe(true);
    expect(timestamps.has(10)).toBe(true);
    expect(timestamps.has(20)).toBe(true);
    expect(timestamps.has(30)).toBe(true);
    expect(timestamps.has(40)).toBe(true);
    expect(timestamps.has(50)).toBe(true);
    expect(timestamps.has(60)).toBe(true);
    expect(timestamps.has(499)).toBe(true);
  });

  it('defaults to 300 maxPoints when options is omitted', () => {
    const result = createSyntheticResult(901);
    const series = toChartSeries(result);
    expect(series.points.length).toBeLessThanOrEqual(300);
    expect(series.points.length).toBeGreaterThan(200);
  });

  it('handles fractional interval boundaries by selecting closest integer sample', () => {
    const result = createSyntheticResult(500, undefined, {
      intervals: {
        metalStall: [{ start: 12.4, end: 18.7 }],
        energyStall: [],
        metalFloat: [],
        energyFloat: []
      }
    });

    const series = toChartSeries(result, { maxPoints: 100 });
    const timestamps = new Set(series.points.map((p) => p.t));
    expect(timestamps.has(12)).toBe(true);
    expect(timestamps.has(19)).toBe(true);
  });
});
