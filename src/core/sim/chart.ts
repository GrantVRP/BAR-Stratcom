import type { SimResult, SimSample } from './types';

export interface ChartSeriesOptions {
  /** Maximum number of points in the downsampled series (default 300, min 2) */
  maxPoints?: number;
}

export interface ChartSeries {
  points: SimSample[];
  intervals: SimResult['intervals'];
  totals: SimResult['totals'];
  flags: SimResult['flags'];
}

/**
 * Finds the index of the sample whose timestamp is closest to targetT.
 */
function findClosestSampleIndex(samples: readonly SimSample[], targetT: number): number {
  if (samples.length === 0) return 0;
  let low = 0;
  let high = samples.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midT = samples[mid]!.t;
    if (midT === targetT) return mid;
    if (midT < targetT) low = mid + 1;
    else high = mid - 1;
  }

  const idx1 = Math.max(0, Math.min(samples.length - 1, high));
  const idx2 = Math.max(0, Math.min(samples.length - 1, low));
  return Math.abs(samples[idx1]!.t - targetT) <= Math.abs(samples[idx2]!.t - targetT)
    ? idx1
    : idx2;
}

/**
 * Downsamples simulation samples to at most maxPoints while keeping
 * stall and float interval boundaries and transitions exact.
 */
export function toChartSeries(
  result: SimResult,
  options: ChartSeriesOptions = {}
): ChartSeries {
  const maxPoints = Math.max(2, options.maxPoints ?? 300);
  const samples = result.samples;

  if (samples.length <= maxPoints) {
    return {
      points: [...samples],
      intervals: result.intervals,
      totals: result.totals,
      flags: result.flags
    };
  }

  // 1. Identify all critical boundary indices that must be preserved
  const critical = new Set<number>();
  critical.add(0);
  critical.add(samples.length - 1);

  const allIntervals = [
    ...result.intervals.metalStall,
    ...result.intervals.energyStall,
    ...result.intervals.metalFloat,
    ...result.intervals.energyFloat
  ];

  for (const interval of allIntervals) {
    critical.add(findClosestSampleIndex(samples, interval.start));
    critical.add(findClosestSampleIndex(samples, interval.end));
  }

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]!;
    const curr = samples[i]!;
    if (prev.stallMetal !== curr.stallMetal || prev.stallEnergy !== curr.stallEnergy) {
      critical.add(i - 1);
      critical.add(i);
    }
  }

  // 2. Select points: start with all critical points
  const selected = new Set<number>(critical);

  // If budget allows, uniformly sample across the time range
  if (selected.size < maxPoints) {
    const step = (samples.length - 1) / (maxPoints - 1);
    for (let k = 0; k < maxPoints; k++) {
      const idx = Math.round(k * step);
      selected.add(idx);
    }
  }

  // If adding uniform samples exceeded maxPoints, thin non-critical points
  if (selected.size > maxPoints && critical.size < maxPoints) {
    const sorted = Array.from(selected).sort((a, b) => a - b);
    const nonCritical = sorted.filter((idx) => !critical.has(idx));
    const toRemoveCount = selected.size - maxPoints;
    const removeStep = nonCritical.length / toRemoveCount;

    for (let i = 0; i < toRemoveCount; i++) {
      const idxToRemove = nonCritical[Math.floor(i * removeStep)]!;
      selected.delete(idxToRemove);
    }
  }

  // 3. Collect final points sorted by t ascending
  const finalIndices = Array.from(selected).sort((a, b) => a - b);
  const points = finalIndices.map((idx) => samples[idx]!);

  return {
    points,
    intervals: result.intervals,
    totals: result.totals,
    flags: result.flags
  };
}
