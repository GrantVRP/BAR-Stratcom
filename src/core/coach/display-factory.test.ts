import { describe, expect, it } from 'vitest';
import type { BuildPlan, BuildStep } from '../schemas/plans';
import type { CoachStep, CoachStepStatus } from '../schemas/coach';
import type { Registry } from '../registry';
import { CoachHudSchema } from '../schemas/protocol';
import { buildCoachHud, buildFactoryBox } from './display';
import { nextBuilderStep, nextFactoryRun } from './queues';

const COM = { kind: 'commander' } as const;
const LAB = { kind: 'factory', unitId: 'armlab', index: 1 } as const;
const LAB2 = { kind: 'factory', unitId: 'armlab', index: 2 } as const;
const CK = { kind: 'builder', unitId: 'armck', index: 1 } as const;

const NAMES: Record<string, string> = {
  armmex: 'Metal Extractor',
  armlab: 'Bot Lab',
  armwin: 'Wind Turbine',
  armck: 'Construction Bot',
  armpw: 'Pawn',
  armrock: 'Rocketeer',
  armflea: 'Tick',
  armham: 'Mace'
};
const registry = { get: (id: string) => (NAMES[id] ? { id, name: NAMES[id] } : undefined) } as unknown as Registry;

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
  source: { kind: 'manual', createdAt: '2026-10-06' },
  steps
});

/** Tracker output: steps before `current` are done, the rest upcoming; step i runs i*10 … i*10+5. */
function tracked(p: BuildPlan, current: number, overrides: Record<string, CoachStepStatus> = {}): CoachStep[] {
  return p.steps.map((s, i) => ({
    stepId: s.id,
    status: overrides[s.id] ?? (i < current ? 'done' : i === current ? 'current' : 'upcoming'),
    plannedStart: i * 10,
    plannedFinish: i * 10 + 5,
    actualFinish: null
  }));
}

const opening = plan([
  step('s1', COM, 'armmex', 2),
  step('s2', COM, 'armlab'),
  step('s3', LAB, 'armck'),
  step('s4', COM, 'armwin', 2),
  step('s5', LAB, 'armpw', 3),
  step('s6', LAB, 'armpw', 2),
  step('s7', CK, 'armmex'),
  step('s8', LAB, 'armrock'),
  step('s9', LAB, 'armflea'),
  step('s10', LAB, 'armham')
]);

const hudAt = (current: number, clock: number) =>
  buildCoachHud({ plan: opening, steps: tracked(opening, current), currentStepIndex: current, aheadBehindSec: null, activeAlerts: [], registry, clock });

describe('HUD factory box and builder NEXT (owner request, T09.3)', () => {
  it('nextBuilderStep skips factory steps; nextFactoryRun follows one factory, merging repeats', () => {
    expect(nextBuilderStep(opening, tracked(opening, 2))?.id).toBe('s4');
    expect(nextBuilderStep(opening, tracked(opening, 7))).toBeNull();
    expect(nextFactoryRun(opening, tracked(opening, 3))).toEqual({
      actor: LAB,
      items: [
        { unitId: 'armpw', count: 5, stepId: 's5' },
        { unitId: 'armrock', count: 1, stepId: 's8' },
        { unitId: 'armflea', count: 1, stepId: 's9' },
        { unitId: 'armham', count: 1, stepId: 's10' }
      ]
    });
    expect(nextFactoryRun(opening, tracked(opening, 0, { s3: 'done', s5: 'skipped', s6: 'done', s8: 'done', s9: 'done', s10: 'done' }))).toBeNull();
  });

  it('NEXT shows the commander while the factory has its own box', () => {
    const hud = hudAt(2, 22); // s3 (factory) is the tracker's current step
    expect(hud.lines[0]!.text.startsWith('NEXT 2× Wind Turbine')).toBe(true);
    expect(hud.lines[0]!.text.endsWith('in 0:08')).toBe(true); // s4 starts at 30
    expect(hud.factory).toEqual({
      title: 'FACTORY // BOT LAB',
      lines: [
        { text: expect.stringMatching(/^1× Construction Bot +in 0:03$/), tone: 'info', big: true },
        { text: '5× Pawn', tone: 'info' },
        { text: '1× Rocketeer', tone: 'info' },
        { text: '1× Tick', tone: 'info' }
      ]
    });
    expect(CoachHudSchema.safeParse(hud).success).toBe(true);
    for (const line of [...hud.lines, ...hud.factory!.lines]) expect(line.text.length).toBeLessThanOrEqual(36);
  });

  it('a late factory build turns the first line warn, then danger after 15 s', () => {
    const box = (clock: number) => buildFactoryBox(opening, tracked(opening, 2), registry, clock)!;
    expect(box(30).lines[0]!.tone).toBe('warn'); // s3 was due at 25
    expect(box(30).lines[0]!.text.endsWith('+0:05')).toBe(true);
    expect(box(41).lines[0]!.tone).toBe('danger');
  });

  it('no pending factory build: no box; only factory steps left: no NEXT line', () => {
    expect(hudAt(0, 0).factory).toEqual(expect.objectContaining({ title: 'FACTORY // BOT LAB' }));
    const commanderOnly = plan([step('c1', COM, 'armmex'), step('c2', COM, 'armwin')]);
    expect(buildFactoryBox(commanderOnly, tracked(commanderOnly, 0), registry, 0)).toBeNull();
    const late = hudAt(7, 80);
    expect(late.lines.some((l) => l.text.startsWith('NEXT'))).toBe(false);
    expect(late.factory?.lines[0]!.text.startsWith('1× Rocketeer')).toBe(true);
  });

  it('a second factory of the same kind is numbered in the title', () => {
    const two = plan([step('a', LAB2, 'armpw', 2), step('b', LAB, 'armpw')]);
    expect(buildFactoryBox(two, tracked(two, 0), registry, 0)!.title).toBe('FACTORY // BOT LAB 2');
  });
});
