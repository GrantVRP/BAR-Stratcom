import * as fs from 'fs';
import * as path from 'path';
import { benchmarkFileName, benchmarkKeyFor, type BenchmarkKey } from '../../core/benchmarks';
import { BenchmarkFileSchema, type BenchmarkFile } from '../../core/schemas/benchmark';
import { findDataDir } from '../registry/loader';

const cache = new Map<string, BenchmarkFile | null>();

/** data/benchmarks/<faction>-<mode>.json, or null when there is no (valid) benchmark for that key. */
export function loadBenchmark(key: BenchmarkKey, dataDir: string = findDataDir()): BenchmarkFile | null {
  const file = path.join(dataDir, 'benchmarks', benchmarkFileName(key));
  if (cache.has(file)) return cache.get(file)!;
  let bench: BenchmarkFile | null = null;
  try {
    const parsed = BenchmarkFileSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf-8')));
    bench = parsed.success && parsed.data.factionId === key.factionId && parsed.data.mode === key.mode ? parsed.data : null;
  } catch {
    bench = null;
  }
  cache.set(file, bench);
  return bench;
}

/** The benchmark for the player's own team in a session (faction + mode of the team layout). */
export function loadBenchmarkForTeams(
  teams: Parameters<typeof benchmarkKeyFor>[0],
  dataDir?: string
): BenchmarkFile | null {
  const key = benchmarkKeyFor(teams);
  return key ? loadBenchmark(key, dataDir) : null;
}
