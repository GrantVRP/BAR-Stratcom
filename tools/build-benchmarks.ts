/**
 * Pro benchmarks, data/benchmarks/<faction>-<mode>.json.
 *
 *   npx tsx tools/build-benchmarks.ts
 *
 * Pro games only (fixture folders whose name contains `-pro-`). Every human team of an enabled
 * faction is one sample; its metrics are read from the recorded state every 30 s from 0 to 900 s, and
 * each series point holds p25/p50/p75 over the samples that reach that time.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Registry } from '../src/core/registry';
import { deriveModes } from '../src/core/plans/events-to-plan';
import {
  BENCHMARK_HORIZON_SEC,
  BENCHMARK_METRICS,
  BENCHMARK_STEP_SEC,
  benchmarkFileName,
  percentiles,
  teamMetrics,
  type BenchmarkMetric
} from '../src/core/benchmarks';
import { BenchmarkFileSchema, SessionMetaSchema, StateDocSchema, type BenchmarkFile, type BenchmarkMode } from '../src/core/schemas';
import { readStateLines } from './lib/state-reader';
import { enabledFactions, isAiPlayerName, registryLoader } from './lib/registry-for';

interface Sample {
  key: string;
  factionId: string;
  mode: BenchmarkMode;
  gameVersion: string;
  source: BenchmarkFile['sources'][number];
  /** metrics per series time (only times the recording reaches) */
  at: Map<number, Record<BenchmarkMetric, number>>;
}

export function isProFixture(name: string): boolean {
  return name.includes('-pro-');
}

/** One sample per human, enabled-faction team of a pro fixture. */
export function samplesFromFixture(
  fixtureDir: string,
  registryFor: (gameVersion: string) => Registry,
  enabled: ReadonlySet<string>
): Sample[] {
  const meta = SessionMetaSchema.parse(JSON.parse(fs.readFileSync(path.join(fixtureDir, 'meta.json'), 'utf-8')));
  const registry = registryFor(meta.gameVersion);
  const mode = deriveModes(meta.teams)[0]!;
  const bySecond = new Map<number, ReturnType<typeof StateDocSchema.parse>>();
  for (const line of readStateLines(fixtureDir)) {
    const doc = StateDocSchema.parse(JSON.parse(line));
    const sec = Math.round(doc.gameSeconds);
    if (sec % BENCHMARK_STEP_SEC === 0 && !bySecond.has(sec)) bySecond.set(sec, doc);
  }

  const samples: Sample[] = [];
  for (const team of meta.teams) {
    if (isAiPlayerName(team.playerName) || !team.factionId || !enabled.has(team.factionId)) continue;
    const at = new Map<number, Record<BenchmarkMetric, number>>();
    for (const [t, doc] of bySecond) {
      const state = doc.teams?.find((s) => s.teamId === team.teamId);
      if (state && t <= BENCHMARK_HORIZON_SEC) at.set(t, teamMetrics(state, registry));
    }
    if (at.size === 0) continue;
    samples.push({
      key: `${team.factionId}-${mode}`,
      factionId: team.factionId,
      mode,
      gameVersion: meta.gameVersion,
      source: { sessionId: meta.sessionId, player: team.playerName, ...(meta.replay ? { replayId: meta.replay.replayId } : {}) },
      at
    });
  }
  return samples;
}

/** Benchmark files (sorted by faction-mode) from the samples. */
export function buildBenchmarks(samples: readonly Sample[]): BenchmarkFile[] {
  const groups = new Map<string, Sample[]>();
  for (const s of samples) groups.set(s.key, [...(groups.get(s.key) ?? []), s]);

  return [...groups.keys()].sort().map((key) => {
    const group = groups.get(key)!;
    const series: BenchmarkFile['series'] = [];
    for (let t = 0; t <= BENCHMARK_HORIZON_SEC; t += BENCHMARK_STEP_SEC) {
      const rows = group.map((s) => s.at.get(t)).filter((r): r is Record<BenchmarkMetric, number> => r !== undefined);
      if (rows.length === 0) break;
      const point = { t } as BenchmarkFile['series'][number];
      for (const m of BENCHMARK_METRICS) point[m] = round(percentiles(rows.map((r) => r[m])));
      series.push(point);
    }
    return BenchmarkFileSchema.parse({
      schemaVersion: 1,
      factionId: group[0]!.factionId,
      mode: group[0]!.mode,
      gameVersions: [...new Set(group.map((s) => s.gameVersion))].sort(),
      sampleCount: group.length,
      sources: group.map((s) => s.source),
      series
    });
  });
}

function round(p: { p25: number; p50: number; p75: number }): { p25: number; p50: number; p75: number } {
  const r = (x: number): number => Math.round(x * 100) / 100;
  return { p25: r(p.p25), p50: r(p.p50), p75: r(p.p75) };
}

function main(): void {
  const data = path.join(process.cwd(), 'data');
  const fixturesDir = path.join(data, 'fixtures/sessions');
  const outDir = path.join(data, 'benchmarks');
  const registryFor = registryLoader(data);
  const enabled = enabledFactions(data);
  const dirs = fs.readdirSync(fixturesDir).filter(isProFixture).sort();
  const samples = dirs.flatMap((d) => samplesFromFixture(path.join(fixturesDir, d), registryFor, enabled));
  const files = buildBenchmarks(samples);

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of files) {
    fs.writeFileSync(path.join(outDir, benchmarkFileName(f)), JSON.stringify(f, null, 2) + '\n');
    console.log(`[build-benchmarks] ${benchmarkFileName(f)}: ${f.sampleCount} samples, series to ${f.series.at(-1)?.t ?? 0} s`);
  }
  console.log(`[build-benchmarks] ${files.length} benchmark files from ${dirs.length} pro games`);
}

if (process.argv[1]?.endsWith('build-benchmarks.ts')) main();
