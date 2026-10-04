import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BenchmarkFileSchema } from '../src/core/schemas';
import { benchmarkFileName } from '../src/core/benchmarks';
import { buildBenchmarks, isProFixture, samplesFromFixture } from './build-benchmarks';
import { enabledFactions, registryLoader } from './lib/registry-for';
import golden from './__golden__/benchmarks-two-duels.json';

const fixturesDir = path.join(process.cwd(), 'data/fixtures/sessions');
const registryFor = registryLoader();
const enabled = enabledFactions();

describe('build-benchmarks (T08.4)', () => {
  it('builds the two-duel golden: one Armada and three Cortex samples, every 30 s', () => {
    const two = ['2026-08-31-multi-1v1-pro-isidis-crack-41f195', '2026-09-09-multi-1v1-pro-feast-of-hades-03e4a1'];
    const files = buildBenchmarks(two.flatMap((d) => samplesFromFixture(path.join(fixturesDir, d), registryFor, enabled)));
    expect(files).toEqual(golden);
    expect(files.map((f) => [benchmarkFileName(f), f.sampleCount])).toEqual([
      ['armada-1v1.json', 1],
      ['cortex-1v1.json', 3]
    ]);
    const cortex = files[1]!;
    expect(cortex.series.map((p) => p.t).slice(0, 3)).toEqual([0, 30, 60]);
    expect(cortex.sources.every((s) => /^[0-9a-f]{32}$/.test(s.replayId ?? ''))).toBe(true);
  });

  it('uses pro games only and skips owner, AI and Legion teams', () => {
    expect(isProFixture('2026-09-09-multi-1v1-pro-feast-of-hades-03e4a1')).toBe(true);
    expect(isProFixture('2026-10-02-multi-large-team-owner-vs-ai-ptaq')).toBe(false);
    // 8v8 with Legion players: those teams are not samples
    const big = samplesFromFixture(path.join(fixturesDir, '2026-10-03-multi-large-team-pro-moonshine-run-787ac1'), registryFor, enabled);
    expect(big.every((s) => s.factionId === 'armada' || s.factionId === 'cortex')).toBe(true);
    expect(big.every((s) => s.mode === 'large-team')).toBe(true);
  });

  it('the committed data/benchmarks match a rebuild from the pro fixtures', () => {
    const dirs = fs.readdirSync(fixturesDir).filter(isProFixture).sort();
    const rebuilt = buildBenchmarks(dirs.flatMap((d) => samplesFromFixture(path.join(fixturesDir, d), registryFor, enabled)));
    const committed = fs
      .readdirSync(path.join(process.cwd(), 'data/benchmarks'))
      .sort()
      .map((f) => BenchmarkFileSchema.parse(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/benchmarks', f), 'utf-8'))));
    expect(committed).toEqual(rebuilt);
  }, 30_000); // parses all 24 pro games; slower when the whole suite runs in parallel
});
