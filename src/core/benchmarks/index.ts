/**
 * Pro benchmarks (04 §7, 03 §10): percentile bands of pro games per faction + mode, and lookups.
 * Pure: the files are built by tools/build-benchmarks.ts and loaded by main.
 */
import type { Registry } from '../registry';
import type { BenchmarkFile, BenchmarkMode, Percentiles } from '../schemas/benchmark';
import { deriveModes } from '../plans/events-to-plan';

export type BenchmarkMetric = 'metalIncome' | 'energyIncome' | 'buildPower' | 'armyMetal';
export const BENCHMARK_METRICS: readonly BenchmarkMetric[] = ['metalIncome', 'energyIncome', 'buildPower', 'armyMetal'];

/** Series spacing and length (03 §10: every 30 s from 0 to 900). */
export const BENCHMARK_STEP_SEC = 30;
export const BENCHMARK_HORIZON_SEC = 900;
/** Below this many samples the UI labels a benchmark "early data" (03 §10). */
export const EARLY_DATA_SAMPLE_COUNT = 5;

export interface BenchmarkKey {
  factionId: string;
  mode: BenchmarkMode;
}

export function isEarlyData(benchmark: Pick<BenchmarkFile, 'sampleCount'>): boolean {
  return benchmark.sampleCount < EARLY_DATA_SAMPLE_COUNT;
}

export function benchmarkFileName(key: BenchmarkKey): string {
  return `${key.factionId}-${key.mode}.json`;
}

/** The benchmark for the player's own team: their faction + the mode of the team layout (04 §7). */
export function benchmarkKeyFor(
  teams: ReadonlyArray<{ teamId: number; allyTeamId: number; factionId: string | null; isMe: boolean }>
): BenchmarkKey | null {
  const me = teams.find((t) => t.isMe);
  if (!me?.factionId) return null;
  return { factionId: me.factionId, mode: deriveModes(teams.map((t) => ({ teamId: t.teamId, allyTeamId: t.allyTeamId })))[0]! };
}

/** p25 / p50 / p75 with linear interpolation between closest ranks. */
export function percentiles(values: readonly number[]): Percentiles {
  if (values.length === 0) throw new Error('percentiles of an empty list');
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number): number => {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
  };
  return { p25: at(0.25), p50: at(0.5), p75: at(0.75) };
}

/**
 * Piecewise-linear percentile through (0→0, p25→25, p50→50, p75→75, max→100), where max = p75 plus
 * the p50–p75 gap (at least 1) (04 §4.1). Returns 0–100.
 */
export function interpolatePercentile(p: Percentiles, value: number): number {
  if (value <= 0) return 0;
  const { p25, p50, p75 } = p;
  if (value <= p25) {
    return p25 > 0 ? Math.min(25, Math.round((value / p25) * 25)) : 25;
  }
  if (value <= p50) {
    const range = p50 - p25;
    return range > 0 ? Math.min(50, Math.round(25 + ((value - p25) / range) * 25)) : 50;
  }
  if (value <= p75) {
    const range = p75 - p50;
    return range > 0 ? Math.min(75, Math.round(50 + ((value - p50) / range) * 25)) : 75;
  }
  const max = p75 + Math.max(1, p75 - p50);
  if (value >= max) return 100;
  return Math.min(100, Math.round(75 + ((value - p75) / (max - p75)) * 25));
}

/** The p25–p75 band of a metric at time t, interpolated between series points; null outside the series. */
export function bandAt(benchmark: BenchmarkFile, metric: BenchmarkMetric, t: number): Percentiles | null {
  const s = benchmark.series;
  if (s.length === 0 || t < s[0]!.t || t > s[s.length - 1]!.t) return null;
  const i = s.findIndex((p) => p.t >= t);
  const b = s[i]!;
  if (b.t === t || i === 0) return b[metric];
  const a = s[i - 1]!;
  const f = (t - a.t) / (b.t - a.t);
  const mix = (x: number, y: number): number => x + (y - x) * f;
  return { p25: mix(a[metric].p25, b[metric].p25), p50: mix(a[metric].p50, b[metric].p50), p75: mix(a[metric].p75, b[metric].p75) };
}

/** Where a value sits among pro games at time t (0–100), or null when the benchmark has no data at t. */
export function percentileAt(benchmark: BenchmarkFile, metric: BenchmarkMetric, t: number, value: number): number | null {
  const band = bandAt(benchmark, metric, t);
  return band ? interpolatePercentile(band, value) : null;
}

/** One team's benchmark metrics from a state doc (04 §7): incomes, total build power, army metal. */
export function teamMetrics(
  team: {
    res: { metal: { income: number }; energy: { income: number } };
    bp: { total: number };
    counts: Record<string, { alive: number }>;
  },
  registry: Registry
): Record<BenchmarkMetric, number> {
  let armyMetal = 0;
  for (const [unitId, c] of Object.entries(team.counts)) {
    const unit = registry.get(unitId);
    if (unit && registry.classify(unitId) === 'combat') armyMetal += c.alive * unit.metalCost;
  }
  return { metalIncome: team.res.metal.income, energyIncome: team.res.energy.income, buildPower: team.bp.total, armyMetal };
}
