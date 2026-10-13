import { join } from 'path';
import type { Registry } from '../../core/registry';
import type { BuildPlan } from '../../core/schemas/plans';
import type { StateDoc } from '../../core/schemas';
import type { Profile } from '../../core/schemas/common';
import { loadBenchmarkForTeams } from '../benchmarks/loader';
import { defaultCoachRunner, type CoachSettings } from '../coach/runner';
import { simMapFor } from '../maps/sim-map';
import { findDataDir } from '../registry/loader';
import { handleDemoCompletion } from './demo-analyzer';
import { DemoSource, derivePlanFromDemo } from './demo-source';

export interface StartDemoOptions {
  demoId: string;
  speed?: number;
  /** The plan to coach; without one, the plan the demo game played is derived from it. */
  plan?: BuildPlan;
  registry: Registry;
  profile: Profile;
  /** Settings → Coach, read every tick like live coaching (T11.5 fix). */
  coachSettings?: () => CoachSettings;
  /** Forwards each demo state to the renderer (live:state). */
  onState: (state: StateDoc) => void;
}

/**
 * Demo coaching (moved out of the coach:start handler, T09.6): plays a recorded game through the coach
 * runner (no coach.json is written) and turns its end into an in-memory review report.
 */
export async function startDemoCoaching(options: StartDemoOptions): Promise<DemoSource> {
  const { demoId, speed, registry, profile, onState } = options;
  const demoSource = new DemoSource({ fixtureDir: join(findDataDir(), 'fixtures', 'sessions', demoId), speed: speed ?? 1 });
  demoSource.on('state', onState);
  const plan = options.plan ?? derivePlanFromDemo(demoSource, registry);

  await defaultCoachRunner.start({
    plan,
    mode: 'demo',
    source: demoSource,
    registry,
    stratcomDir: null,
    coachSettings: options.coachSettings,
    benchmarkLoader: loadBenchmarkForTeams,
    resolveMap: (scriptName) => simMapFor(scriptName)
  });

  demoSource.on('end', () => {
    handleDemoCompletion({ demoSource, plan: plan ?? null, registry, profile });
  });
  demoSource.start();
  return demoSource;
}
