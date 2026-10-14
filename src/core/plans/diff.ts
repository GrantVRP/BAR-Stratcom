import type { BuildStep } from '../schemas';

export interface StepChange {
  before: BuildStep;
  after: BuildStep;
  /** What differs: unit, count, actor and/or time. */
  fields: Array<'unit' | 'count' | 'actor' | 'time'>;
}

export interface PlanStepDiff {
  added: BuildStep[];
  removed: BuildStep[];
  changed: StepChange[];
}

/** Steps of two plans matched by id (adapter preview). */
export function diffPlanSteps(before: readonly BuildStep[], after: readonly BuildStep[]): PlanStepDiff {
  const old = new Map(before.map((s) => [s.id, s]));
  const next = new Map(after.map((s) => [s.id, s]));
  const changed: StepChange[] = [];
  for (const a of after) {
    const b = old.get(a.id);
    if (!b) continue;
    const fields: StepChange['fields'] = [];
    if (a.unitId !== b.unitId) fields.push('unit');
    if (a.count !== b.count) fields.push('count');
    if (JSON.stringify(a.actor) !== JSON.stringify(b.actor)) fields.push('actor');
    if (a.targetTime !== b.targetTime) fields.push('time');
    if (fields.length > 0) changed.push({ before: b, after: a, fields });
  }
  return {
    added: after.filter((s) => !old.has(s.id)),
    removed: before.filter((s) => !next.has(s.id)),
    changed
  };
}
