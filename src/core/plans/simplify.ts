/**
 * Beginner variants of curated plans: the deterministic adapter on the plan's own map, then
 * "simplify": consecutive repeats of the same build merged into one step, cut to the first 12 steps.
 * Nothing is invented; every step comes from the curated (real) build.
 */
import type { Registry } from '../registry';
import type { BuildPlan, BuildStep, MapRecord, PlanValidationResult } from '../schemas';
import { adaptPlan } from './adapt';
import { validatePlan } from './validate';

export const BEGINNER_STEPS = 12;
const MAX_STEP_COUNT = 50;

const sameActor = (a: BuildStep['actor'], b: BuildStep['actor']): boolean =>
  a.kind === b.kind && (a.kind === 'commander' || (b.kind !== 'commander' && a.unitId === b.unitId && a.index === b.index));

/** Merges consecutive builds of the same unit by the same actor (counts added), then keeps the first `maxSteps`. */
export function simplifyPlanSteps(steps: readonly BuildStep[], maxSteps = BEGINNER_STEPS): BuildStep[] {
  const merged: BuildStep[] = [];
  for (const step of steps) {
    const last = merged[merged.length - 1];
    const mergeable =
      last &&
      step.action === 'build' &&
      last.action === 'build' &&
      step.unitId === last.unitId &&
      sameActor(step.actor, last.actor) &&
      last.count + step.count <= MAX_STEP_COUNT;
    if (mergeable) merged[merged.length - 1] = { ...last, count: last.count + step.count };
    else merged.push({ ...step });
  }
  const kept = merged.slice(0, maxSteps);
  // an assist step must still point at a kept step
  const ids = new Set(kept.map((s) => s.id));
  return kept.filter((s) => s.action !== 'assist' || (s.assistStepId !== undefined && ids.has(s.assistStepId)));
}

export interface BeginnerVariantInput {
  curated: BuildPlan;
  registry: Registry;
  /** The curated plan's own map (where the build was played). */
  map: MapRecord;
  avgWind: number | null;
  /** ISO timestamp from the caller. */
  createdAt: string;
}

export interface BeginnerVariant {
  plan: BuildPlan;
  issues: PlanValidationResult;
}

export function beginnerVariantId(curatedId: string): string {
  return `${curatedId}-beginner`;
}

export function makeBeginnerVariant(input: BeginnerVariantInput): BeginnerVariant | null {
  const { curated, registry, map } = input;
  const adapted = adaptPlan({
    registry,
    library: [curated],
    target: { factionId: curated.factionId, mapRecord: map, avgWind: input.avgWind, mode: curated.modes[0]!, skill: 'beginner' },
    createdAt: input.createdAt
  });
  if ('error' in adapted) return null;

  const player = curated.source.kind === 'curated' ? curated.source.player : 'a curated build';
  const steps = simplifyPlanSteps(adapted.plan.steps);
  const plan: BuildPlan = {
    ...adapted.plan,
    id: beginnerVariantId(curated.id),
    title: `${curated.title} // Beginner`.slice(0, 60),
    description: `The first ${steps.length} steps of ${player}'s opening, merged and re-timed for a calmer start.`.slice(0, 400),
    skill: 'beginner',
    steps,
    source: {
      kind: 'adapted',
      fromPlanId: curated.id,
      transforms: [...adapted.transforms, `simplify(${BEGINNER_STEPS})`],
      createdAt: input.createdAt
    }
  };
  const validation = validatePlan(plan, registry);
  return { plan, issues: { errors: validation.errors, warnings: [...adapted.issues.warnings.filter((w) => w.code === 'W_WIND_UNKNOWN'), ...validation.warnings] } };
}
