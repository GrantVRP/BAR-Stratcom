import { describe, expect, it } from 'vitest';
import type { BuildPlan, BuildStep } from '../schemas/plans';
import type { CoachStep, CoachStepStatus } from '../schemas/coach';
import { ASSIST_OFF, buildCoachAssist } from './assist';

const COM = { kind: 'commander' } as const;
const LAB = { kind: 'factory', unitId: 'armlab', index: 1 } as const;
const VP = { kind: 'factory', unitId: 'armvp', index: 1 } as const;
const CK = { kind: 'builder', unitId: 'armck', index: 1 } as const;

const step = (id: string, actor: BuildStep['actor'], unitId: string | undefined, count = 1, action: BuildStep['action'] = 'build'): BuildStep => ({
  id,
  actor,
  action,
  ...(unitId ? { unitId } : {}),
  count
});

const plan = (steps: BuildStep[]): BuildPlan => ({
  schemaVersion: 1,
  id: 'p',
  title: 'Test',
  factionId: 'armada',
  gameVersion: 'test',
  modes: ['1v1'],
  role: 'any',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'wind',
  source: { kind: 'manual', createdAt: '2026-10-05' },
  steps
});

/** Tracker output: steps before `current` are done, the rest upcoming (unless overridden). */
function tracked(p: BuildPlan, current: number, overrides: Record<string, CoachStepStatus> = {}): CoachStep[] {
  return p.steps.map((s, i) => ({
    stepId: s.id,
    status: overrides[s.id] ?? (i < current ? 'done' : i === current ? 'current' : 'upcoming'),
    plannedStart: i * 10,
    plannedFinish: i * 10 + 5,
    actualFinish: null
  }));
}

const ON = { armNext: true, factoryQueue: true };

describe('coach assist payloads', () => {
  const opening = plan([
    step('s1', COM, 'armmex', 2),
    step('s2', COM, 'armlab'),
    step('s3', LAB, 'armck'),
    step('s4', COM, 'armwin', 2),
    step('s5', LAB, 'armpw', 3),
    step('s6', LAB, 'armpw', 2),
    step('s7', CK, 'armmex'),
    step('s8', LAB, 'armrock', 1),
    step('s9', LAB, undefined, 1, 'note'),
    step('s10', LAB, 'armpw', 4)
  ]);

  it('disabled (the default): no payloads, both switches off', () => {
    const assist = buildCoachAssist({ plan: opening, steps: tracked(opening, 0), enabled: { armNext: false, factoryQueue: false } });
    expect(assist).toEqual(ASSIST_OFF);
  });

  it("arm next: the HUD's NEXT step (commander or builder, factory steps skipped) when it is a build", () => {
    const at = (i: number) => buildCoachAssist({ plan: opening, steps: tracked(opening, i), enabled: { armNext: true, factoryQueue: false } });
    expect(at(0)).toEqual({ armNext: { unitId: 'armmex', stepId: 's1' }, factoryQueue: null, enabled: { armNext: true, factoryQueue: false } });
    expect(at(6).armNext).toEqual({ unitId: 'armmex', stepId: 's7' }); // builder step
    expect(at(2).armNext).toEqual({ unitId: 'armwin', stepId: 's4' }); // s3 is the factory's; the commander builds s4 meanwhile
    expect(at(7).armNext).toBeNull(); // only factory steps left
    expect(at(10).armNext).toBeNull(); // plan finished
    const withNote = plan([step('n1', COM, undefined, 1, 'note'), step('n2', COM, 'armmex')]);
    expect(buildCoachAssist({ plan: withNote, steps: tracked(withNote, 0), enabled: ON }).armNext).toBeNull(); // a note
  });

  it('factory queue: the first pending factory and its consecutive builds, merged per unit, until a non-build step', () => {
    const assist = buildCoachAssist({ plan: opening, steps: tracked(opening, 3), enabled: ON });
    // s3 is done; s5 + s6 merge, s8 follows, the note s9 ends the run (s10 is not included)
    expect(assist.factoryQueue).toEqual({
      factoryUnitId: 'armlab',
      items: [
        { unitId: 'armpw', count: 5 },
        { unitId: 'armrock', count: 1 }
      ]
    });
    expect(assist.enabled).toEqual(ON);
  });

  it('factory queue: skipped and done steps are left out; no pending factory step → null', () => {
    const skipped = buildCoachAssist({ plan: opening, steps: tracked(opening, 3, { s5: 'skipped' }), enabled: ON });
    expect(skipped.factoryQueue!.items[0]).toEqual({ unitId: 'armpw', count: 2 });
    const later = buildCoachAssist({ plan: opening, steps: tracked(opening, 9, { s10: 'done' }), enabled: ON });
    expect(later.factoryQueue).toBeNull();
  });

  it('factory queue: at most 20 units, cut inside the step that crosses the limit', () => {
    const big = plan([step('a', LAB, 'armpw', 12), step('b', LAB, 'armrock', 12), step('c', LAB, 'armck', 5)]);
    const assist = buildCoachAssist({ plan: big, steps: tracked(big, 0), enabled: ON });
    expect(assist.factoryQueue).toEqual({
      factoryUnitId: 'armlab',
      items: [
        { unitId: 'armpw', count: 12 },
        { unitId: 'armrock', count: 8 }
      ]
    });
  });

  it('factory queue: only the first factory; another factory’s steps in between are skipped, not merged', () => {
    const two = plan([step('a', VP, 'armflash', 2), step('b', LAB, 'armpw', 2), step('c', VP, 'armflash', 1)]);
    const assist = buildCoachAssist({ plan: two, steps: tracked(two, 0), enabled: ON });
    expect(assist.factoryQueue).toEqual({ factoryUnitId: 'armvp', items: [{ unitId: 'armflash', count: 3 }] });
  });
});
