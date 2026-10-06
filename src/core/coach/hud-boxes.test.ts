import { describe, expect, it } from 'vitest';
import type { BuildPlan, BuildStep } from '../schemas/plans';
import type { Alert, CoachStep, CoachStepStatus } from '../schemas/coach';
import type { Registry } from '../registry';
import { CoachHudSchema } from '../schemas/protocol';
import { buildCoachHud } from './display';
import { HUD_RADAR_RANGE, actorTag, buildBuildBox, buildFactoryBox, buildHudAlerts, buildRadarBox, paceMeta, trackEnemySightings } from './hud-boxes';
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

const step = (id: string, actor: BuildStep['actor'], unitId: string | undefined, count = 1, action: BuildStep['action'] = 'build', text?: string): BuildStep => ({
  id,
  actor,
  action,
  ...(unitId ? { unitId } : {}),
  count,
  ...(text ? { text } : {})
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

const buildBox = (current: number, clock: number, aheadBehindSec: number | null = null) =>
  buildBuildBox({ plan: opening, steps: tracked(opening, current), currentStepIndex: current, aheadBehindSec, registry, clock });

describe('HUD boxes (owner requests T09.3/T09.4)', () => {
  it('queues: the builders skip factory steps; the factory run follows one factory, merging repeats', () => {
    expect(nextBuilderStep(opening, tracked(opening, 2))?.id).toBe('s4');
    expect(nextBuilderStep(opening, tracked(opening, 7))).toBeNull();
    expect(nextFactoryRun(opening, tracked(opening, 3))?.items.map((i) => [i.unitId, i.count])).toEqual([
      ['armpw', 5],
      ['armrock', 1],
      ['armflea', 1],
      ['armham', 1]
    ]);
  });

  it("actor tags: the app's words (CDR, CON, FAC), numbered from the second of a kind", () => {
    expect(actorTag(COM)).toBe('CDR');
    expect(actorTag(CK)).toBe('CON');
    expect(actorTag({ kind: 'builder', unitId: 'armbeaver', index: 2 })).toBe('CON#2');
    expect(actorTag(LAB)).toBe('FAC');
    expect(actorTag(LAB2)).toBe('FAC#2');
  });

  it('BUILDINGS: the commander and constructors in plan order, big first row with picture, timings right', () => {
    expect(buildBox(2, 22)).toEqual({
      title: 'BUILDINGS',
      meta: [{ text: '2/10', tone: 'info' }],
      lines: [
        { text: '2× Wind Turbine', tone: 'info', big: true, right: 'in 0:08', tag: 'CDR', unitId: 'armwin' },
        { text: '1× Metal Extractor', tone: 'info', right: 'in 0:38', tag: 'CON' }
      ]
    });
  });

  it('FACTORY: every factory build in plan order, repeats merged, at most 4 rows', () => {
    expect(buildFactoryBox(opening, tracked(opening, 2), registry, 22)).toEqual({
      title: 'FACTORY',
      lines: [
        { text: '1× Construction Bot', tone: 'info', big: true, right: 'in 0:03', tag: 'FAC', unitId: 'armck' },
        { text: '5× Pawn', tone: 'info', right: 'in 0:18', tag: 'FAC' },
        { text: '1× Rocketeer', tone: 'info', right: 'in 0:48', tag: 'FAC' },
        { text: '1× Tick', tone: 'info', right: 'in 0:58', tag: 'FAC' }
      ]
    });
    const two = plan([step('a', LAB, 'armpw', 2), step('b', LAB2, 'armpw'), step('c', LAB, 'armrock')]);
    expect(buildFactoryBox(two, tracked(two, 0), registry, 0)!.lines.map((l) => [l.tag, l.text])).toEqual([
      ['FAC', '2× Pawn'],
      ['FAC#2', '1× Pawn'],
      ['FAC', '1× Rocketeer']
    ]);
  });

  it('a late row turns warn, then danger after 15 s; pace goes to the BUILDINGS header', () => {
    const late = (clock: number) => buildFactoryBox(opening, tracked(opening, 2), registry, clock)!.lines[0]!;
    expect(late(30)).toEqual(expect.objectContaining({ tone: 'warn', right: '+0:05' }));
    expect(late(41).tone).toBe('danger');
    expect(buildBox(2, 22, 3)!.meta).toEqual([{ text: '2/10', tone: 'info' }, { text: '3s AHEAD', tone: 'good' }]);
    expect(paceMeta(0)).toEqual({ text: 'ON TIME', tone: 'info' });
    expect(paceMeta(-12)).toEqual({ text: '12s BEHIND', tone: 'warn' });
    expect(paceMeta(-25)?.tone).toBe('danger');
  });

  it('empty states: only factory steps left, plan complete, no factory build', () => {
    expect(buildBox(7, 80)!.lines).toEqual([{ text: 'No buildings due', tone: 'info' }]);
    expect(buildBox(10, 200)!.lines).toEqual([{ text: 'PLAN COMPLETE', tone: 'good', big: true }]);
    expect(buildFactoryBox(opening, tracked(opening, 10), registry, 200)).toBeNull();
  });

  it('a non-build step shows its note text; long names are cut to fit their row', () => {
    const p = plan([step('n', COM, undefined, 1, 'note', 'Scout the left side'), step('r', COM, undefined, 1, 'reclaim')]);
    const lines = buildBuildBox({ plan: p, steps: tracked(p, 0), currentStepIndex: 0, aheadBehindSec: null, registry, clock: 0 })!.lines;
    expect(lines.map((l) => [l.text, l.unitId])).toEqual([
      ['Scout the left side', undefined],
      ['Reclaim', undefined]
    ]);
    const longName = { get: () => ({ name: 'X'.repeat(40) }) } as unknown as Registry;
    const box = buildBuildBox({ plan: opening, steps: tracked(opening, 0), currentStepIndex: 0, aheadBehindSec: null, registry: longName, clock: 0 })!;
    expect(box.lines[0]!.text.length).toBe(24);
    expect(box.lines[1]!.text.length).toBe(28);
  });

  it('alerts: severity becomes the tone, a planned stall fills a free slot, at most two', () => {
    const alert = (id: Alert['id'], severity: Alert['severity'], text: string): Alert => ({ id, severity, text, since: 0, dedupeKey: id });
    expect(buildHudAlerts([alert('E_STALLING', 'danger', 'ENERGY STALL')], 'energy')).toEqual([
      { text: 'ENERGY STALL', tone: 'danger' },
      { text: 'PLANNED STALL', tone: 'info' }
    ]);
    expect(buildHudAlerts([alert('M_FLOAT', 'warn', 'A'), alert('IDLE_FACTORY', 'info', 'B'), alert('E_FLOAT', 'info', 'C')], null)).toHaveLength(2);
  });

  it('buildCoachHud carries the boxes and keeps the single-panel lines for older widgets', () => {
    const hud = buildCoachHud({ plan: opening, steps: tracked(opening, 2), currentStepIndex: 2, aheadBehindSec: null, activeAlerts: [], registry, clock: 22 });
    expect(CoachHudSchema.safeParse(hud).success).toBe(true);
    expect(hud.lines[0]!.text.startsWith('NEXT 2× Wind Turbine')).toBe(true);
    expect(hud.build?.lines[0]!.unitId).toBe('armwin');
    expect(hud.factory?.lines[0]!.unitId).toBe('armck');
    expect(hud.alerts).toEqual([]);
  });
});

describe('radar contacts (owner request T09.5)', () => {
  it('sightings: the first time is kept while in sight, dropped when gone, restarted on return', () => {
    let seen = trackEnemySightings({}, { armpw: 2 }, 100);
    expect(seen).toEqual({ armpw: 100 });
    seen = trackEnemySightings(seen, { armpw: 3, armrock: 1 }, 110);
    expect(seen).toEqual({ armpw: 100, armrock: 110 });
    seen = trackEnemySightings(seen, { armrock: 1, armpw: 0 }, 120);
    expect(seen).toEqual({ armrock: 110 });
    expect(trackEnemySightings(seen, { armpw: 1 }, 130)).toEqual({ armpw: 130 });
  });

  it('rows: biggest groups first, newest first on ties, NEW for 15 s then time in sight, at most 3', () => {
    const radar = buildRadarBox({ armpw: 4, armrock: 2, armflea: 2, armham: 1 }, { armpw: 0, armrock: 50, armflea: 90, armham: 99 }, registry, 100);
    expect(radar.range).toBe(HUD_RADAR_RANGE);
    expect(radar.lines).toEqual([
      { text: '4× Pawn', tone: 'info', right: '1:40 ago' },
      { text: '2× Tick', tone: 'warn', right: 'NEW' },
      { text: '2× Rocketeer', tone: 'info', right: '0:50 ago' }
    ]);
  });

  it('no enemies in sight: no rows (the widget still draws the scope); no enemy data: no radar', () => {
    expect(buildRadarBox({ armpw: 0 }, {}, registry, 10)).toEqual({ range: HUD_RADAR_RANGE, lines: [] });
    const hud = (enemies?: Record<string, number>) =>
      buildCoachHud({ plan: opening, steps: tracked(opening, 0), currentStepIndex: 0, aheadBehindSec: null, activeAlerts: [], registry, clock: 0, ...(enemies ? { enemies } : {}) });
    expect(hud().radar).toBeNull();
    expect(CoachHudSchema.safeParse(hud({ armpw: 1 })).success).toBe(true);
    expect(hud({ armpw: 1 }).radar?.lines[0]).toEqual({ text: '1× Pawn', tone: 'warn', right: 'NEW' });
  });
});
