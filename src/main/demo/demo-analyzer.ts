import type { BuildPlan } from '../../core/schemas/plans';
import type { SessionDetail } from '../../core/schemas/session';
import type { SimResult } from '../../core/sim/types';
import type { DemoSource } from './demo-source';
import type { Registry } from '../../core/registry';
import type { Profile } from '../../core/schemas/common';
import { simulate } from '../../core/sim/simulate';
import { analyze } from '../../core/analysis/analyze';
import { defaultSessionStore } from '../sessions/store';
import { broadcast } from '../ipc/register';
import { loadBenchmarkForTeams } from '../benchmarks/loader';
import { simMapFor } from '../maps/sim-map';

export interface DemoCompletionOptions {
  demoSource: DemoSource;
  plan: BuildPlan | null;
  registry: Registry;
  profile: Profile;
}

/**
 * Executes in-memory post-match analysis when a demo finishes.
 * Retains the report in-memory without persisting to disk, assigns the 'fixture' source
 * (which renders as 'DEMO'), and broadcasts review:ready.
 */
export function handleDemoCompletion(options: DemoCompletionOptions): SessionDetail {
  const { demoSource, plan, registry, profile } = options;

  let planSim: SimResult | null = null;
  if (plan) {
    planSim = simulate({
      plan,
      registry,
      map: simMapFor(demoSource.getMeta().mapScriptName),
      options: { schedule: 'respect-targets' }
    });
  }

  const report = analyze(
    {
      meta: demoSource.getMeta(),
      states: demoSource.getStates(),
      events: demoSource.getEvents(),
      registry
    },
    plan,
    planSim,
    loadBenchmarkForTeams(demoSource.getMeta().teams),
    profile
  );

  const detail: SessionDetail = {
    meta: {
      ...demoSource.getMeta(),
      source: 'fixture',
      planId: plan?.id
    },
    report,
    hasState: true,
    hasEvents: true,
    series: {
      states: demoSource.getStates() as unknown as Array<Record<string, unknown>>,
      events: demoSource.getEvents() as unknown as Array<Record<string, unknown>>
    }
  };

  defaultSessionStore.setInMemoryDemo(detail);
  broadcast('review:ready', { sessionId: detail.meta.sessionId });

  return detail;
}
