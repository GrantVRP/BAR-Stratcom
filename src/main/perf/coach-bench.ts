/**
 * Coach tick and simulator timings, measured on recorded data. Not part of verify.
 *
 *   npm run perf:coach   (npx tsx src/main/perf/coach-bench.ts; never bundled: nothing imports it)
 *
 * Coach tick = evaluate + write coach.json (live mode, real disk writes), fed state by state from a
 * recorded game with its own plan. Simulator = one 900 s run of a 60-step curated plan.
 */
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BuildPlanSchema, StateDocSchema } from '../../core/schemas';
import { simulate } from '../../core/sim/simulate';
import { CoachRunner } from '../coach/runner';
import { simMapFor } from '../maps/sim-map';
import { readStateLines } from '../sessions/store';
import { loadRegistryOrDefault } from '../registry/loader';

const FIXTURE = '2026-10-01-cortex-1v1-vs-ai-barr-499s';
const root = process.cwd();
const readPlan = (p: string) => BuildPlanSchema.parse(JSON.parse(fs.readFileSync(path.join(root, p), 'utf-8')));

class FixtureSource extends EventEmitter {
  start(): void {}
  stop(): void {}
}

async function coachTicks(): Promise<{ ticks: number; p50: number; p95: number; max: number }> {
  const plan = readPlan(`data/builds/samples/${FIXTURE}.json`);
  const registry = loadRegistryOrDefault(plan.gameVersion);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coach-bench-'));
  const source = new FixtureSource();
  const runner = new CoachRunner();
  await runner.start({ plan, mode: 'live', source: source as never, registry, stratcomDir: dir, map: simMapFor('BarR 1.1') });
  for (const line of readStateLines(path.join(root, 'data/fixtures/sessions', FIXTURE))) {
    source.emit('state', StateDocSchema.parse(JSON.parse(line)));
    await runner.tick();
  }
  const s = runner.getTickStats();
  await runner.stop();
  fs.rmSync(dir, { recursive: true, force: true });
  return { ticks: s.count, p50: s.p50, p95: s.p95, max: s.max };
}

function simulator(): { steps: number; runs: number; median: number; max: number } {
  const plan = readPlan('data/builds/pro-armada-bot-isidis-crack-41f195-t1.json');
  const registry = loadRegistryOrDefault(plan.gameVersion);
  const map = simMapFor(plan.source.kind === 'curated' ? plan.source.map : null);
  const times: number[] = [];
  for (let i = 0; i < 25; i++) {
    const t0 = performance.now();
    simulate({ plan, registry, map, options: { horizon: 900 } });
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return { steps: plan.steps.length, runs: times.length, median: times[Math.floor(times.length / 2)]!, max: times.at(-1)! };
}

const round = (n: number): number => Math.round(n * 100) / 100;
void coachTicks().then((tick) => {
  const sim = simulator();
  const result = {
    coachTick: { ...tick, p50: round(tick.p50), p95: round(tick.p95), max: round(tick.max), budgetP95: 10 },
    simulator: { ...sim, median: round(sim.median), max: round(sim.max), budget: 15 }
  };
  console.log(JSON.stringify(result, null, 2));
});
