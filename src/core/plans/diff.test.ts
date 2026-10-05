import { describe, expect, it } from 'vitest';
import type { BuildStep } from '../schemas';
import { diffPlanSteps } from './diff';

const step = (id: string, unitId: string, count = 1, targetTime?: number): BuildStep => ({
  id,
  actor: { kind: 'commander' },
  action: 'build',
  unitId,
  count,
  ...(targetTime === undefined ? {} : { targetTime })
});

describe('plan step diff (T08.5)', () => {
  it('lists added, removed and changed steps with what changed', () => {
    const before = [step('s1', 'armmex', 2, 4), step('s2', 'armwin', 5, 30), step('s3', 'armlab', 1, 90)];
    const after = [step('s1', 'armmex', 2, 4), step('fix1', 'armsolar', 1, 40), step('s2', 'armsolar', 1, 28), step('s3', 'armlab', 1, 95)];
    const d = diffPlanSteps(before, after);
    expect(d.added.map((s) => s.id)).toEqual(['fix1']);
    expect(d.removed).toEqual([]);
    expect(d.changed.map((c) => [c.after.id, c.fields])).toEqual([
      ['s2', ['unit', 'count', 'time']],
      ['s3', ['time']]
    ]);
    expect(diffPlanSteps(before, before.slice(1)).removed.map((s) => s.id)).toEqual(['s1']);
  });
});
