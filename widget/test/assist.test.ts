import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CoachDoc } from '../../src/core/schemas/protocol';
import { CoachDocSchema, SessionFileDocSchema, StateDocSchema, WidgetHeartbeatSchema } from '../../src/core/schemas/protocol';
import { lintLua } from '../../tools/lint-lua';
import { createWidgetHarness, type WidgetHarness } from './harness';
import { createScenario, createScenarioUnit, type Scenario, type ScenarioOptions } from './scenario';

type Assist = CoachDoc['assist'];

function coachDoc(assist: Assist): CoachDoc {
  return CoachDocSchema.parse({
    protocol: 1,
    seq: 1,
    sessionId: 's-1',
    mode: 'live',
    generatedAtSec: 1000,
    hud: { visible: true, title: 'Armada // Test', lines: [], progress: null },
    echo: [],
    assist
  });
}

const ARM_NEXT: Assist = { armNext: { unitId: 'armmex', stepId: 's1' }, factoryQueue: null, enabled: { armNext: true, factoryQueue: false } };
const queue = (items: Array<{ unitId: string; count: number }>): Assist => ({
  armNext: null,
  factoryQueue: { factoryUnitId: 'armlab', items },
  enabled: { armNext: false, factoryQueue: true }
});

interface Setup {
  harness: WidgetHarness;
  scenario: Scenario;
  com: number;
  lab: number;
}

async function setup(assist: Assist, select: Array<'com' | 'lab'>, options: ScenarioOptions = {}): Promise<Setup> {
  const scenario = createScenario(options);
  const com = createScenarioUnit('armcom', scenario);
  const lab = createScenarioUnit('armlab', scenario);
  scenario.addUnit(com);
  scenario.addUnit(lab);
  scenario.selectedUnits = select.map((s) => (s === 'com' ? com.id : lab.id));
  const harness = await createWidgetHarness(scenario);
  harness.setTime(1001);
  harness.fs.writeJson('stratcom/coach.json', coachDoc(assist));
  harness.callin('Initialize');
  return { harness, scenario, com: com.id, lab: lab.id };
}

/** Runs a bound action the way BAR's action handler calls it. */
function runAction(harness: WidgetHarness, name: string): unknown {
  const fn = harness.actions().get(name) as (() => unknown) | undefined;
  if (!fn) throw new Error(`action ${name} not registered`);
  return fn();
}

function hudTexts(harness: WidgetHarness): string[] {
  harness.clearDrawCalls();
  harness.callin('DrawScreen');
  return harness.drawCalls().filter((c) => c.name === 'Text').map((c) => String(c.args[0]));
}

const defIdOf = (scenario: Scenario, name: string): number => scenario.unitDefsByName.get(name)!.defId;

describe('Widget assist actions (T09.1, 05 §8.3)', () => {
  it('registers both actions next to the HUD toggle', async () => {
    const { harness } = await setup(ARM_NEXT, ['com']);
    try {
      expect([...harness.actions().keys()]).toEqual(expect.arrayContaining(['stratcom_hud_toggle', 'stratcom_arm_next', 'stratcom_load_queue']));
    } finally {
      harness.close();
    }
  });

  it('arm next: picks the build command of the selected builder, issues no order, shows ARMED for 2 s', async () => {
    const { harness, scenario } = await setup(ARM_NEXT, ['com']);
    try {
      expect(runAction(harness, 'stratcom_arm_next')).toBe(true);
      // the engine's command list for the commander: Stop, then its known build options in order
      const known = scenario.unitDefsByName.get('armcom')!.def.buildOptions.filter((n) => scenario.unitDefsByName.has(n));
      expect(harness.activeCommands()).toEqual([2 + known.indexOf('armmex')]);
      expect(harness.orders()).toEqual([]);
      expect(hudTexts(harness)).toContain('ARMED: Metal Extractor');

      harness.callin('Update', 1.5);
      expect(hudTexts(harness)).toContain('ARMED: Metal Extractor');
      harness.callin('Update', 0.6);
      expect(hudTexts(harness)).not.toContain('ARMED: Metal Extractor');
    } finally {
      harness.close();
    }
  });

  it('arm next: a selection that cannot build it is a no-op with a HUD message', async () => {
    for (const select of [['lab'], []] as Array<Array<'com' | 'lab'>>) {
      const { harness } = await setup(ARM_NEXT, select);
      try {
        runAction(harness, 'stratcom_arm_next');
        expect(harness.activeCommands()).toEqual([]);
        expect(hudTexts(harness)).toContain('SELECT A BUILDER FIRST');
      } finally {
        harness.close();
      }
    }
  });

  it('disabled switches or no payload: both actions do nothing', async () => {
    const off: Assist = { armNext: { unitId: 'armmex', stepId: 's1' }, factoryQueue: { factoryUnitId: 'armlab', items: [{ unitId: 'armpw', count: 2 }] }, enabled: { armNext: false, factoryQueue: false } };
    const empty: Assist = { armNext: null, factoryQueue: null, enabled: { armNext: true, factoryQueue: true } };
    for (const assist of [off, empty]) {
      const { harness } = await setup(assist, ['com', 'lab']);
      try {
        runAction(harness, 'stratcom_arm_next');
        runAction(harness, 'stratcom_load_queue');
        expect(harness.activeCommands()).toEqual([]);
        expect(harness.orders()).toEqual([]);
        expect(hudTexts(harness).filter((t) => /ARMED|QUEUED|SELECT|BLOCKED/.test(t))).toEqual([]);
      } finally {
        harness.close();
      }
    }
  });

  it('load queue: exact orders to the selected factory, skipping units it cannot build', async () => {
    const { harness, scenario, lab } = await setup(
      queue([
        { unitId: 'armck', count: 1 },
        { unitId: 'armmex', count: 2 },
        { unitId: 'armpw', count: 3 }
      ]),
      ['com', 'lab']
    );
    try {
      runAction(harness, 'stratcom_load_queue');
      const ck = -defIdOf(scenario, 'armck');
      const pw = -defIdOf(scenario, 'armpw');
      expect(harness.orders()).toEqual([
        { unitId: lab, cmdId: ck },
        { unitId: lab, cmdId: pw },
        { unitId: lab, cmdId: pw },
        { unitId: lab, cmdId: pw }
      ]);
      expect(hudTexts(harness)).toContain('QUEUED 4 UNITS');
    } finally {
      harness.close();
    }
  });

  it('load queue: at most 20 orders in total', async () => {
    const { harness } = await setup(
      queue([
        { unitId: 'armpw', count: 15 },
        { unitId: 'armck', count: 15 }
      ]),
      ['lab']
    );
    try {
      runAction(harness, 'stratcom_load_queue');
      expect(harness.orders()).toHaveLength(20);
    } finally {
      harness.close();
    }
  });

  it('load queue: without the factory selected, a HUD message and no orders', async () => {
    const { harness } = await setup(queue([{ unitId: 'armpw', count: 2 }]), ['com']);
    try {
      runAction(harness, 'stratcom_load_queue');
      expect(harness.orders()).toEqual([]);
      expect(hudTexts(harness)).toContain('SELECT THE FACTORY FIRST');
    } finally {
      harness.close();
    }
  });

  it('load queue in a sandboxed lobby: never calls GiveOrder, shows ASSIST BLOCKED BY LOBBY', async () => {
    const { harness } = await setup(queue([{ unitId: 'armpw', count: 2 }]), ['lab'], { canControlUnits: false });
    try {
      runAction(harness, 'stratcom_load_queue');
      expect(harness.orders()).toEqual([]);
      expect(hudTexts(harness)).toContain('ASSIST BLOCKED BY LOBBY');

      // even if the flag were wrong, the sandbox error is caught (it would unload the widget)
      harness.engine.doStringSync('widget.canControlUnits = true');
      expect(() => runAction(harness, 'stratcom_load_queue')).not.toThrow();
      expect(harness.orders()).toEqual([]);
      expect(hudTexts(harness)).toContain('ASSIST BLOCKED BY LOBBY');
    } finally {
      harness.close();
    }
  });

  it('GiveOrder appears only inside assist* functions (lint:lua rule kept)', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'widget/gui_stratcom.lua'), 'utf-8');
    expect(lintLua(source)).toEqual([]);
    expect(source).toMatch(/local function assistLoadQueue\(\)[\s\S]*Spring\.GiveOrderToUnit/);
    expect(lintLua('local function helper() Spring.GiveOrderToUnit(1, -2, {}, {}) end').length).toBeGreaterThan(0);
  });
});

describe('Carried-over H1b fixes (T09.1)', () => {
  it('wind risk: BAR returns a string, the heartbeat carries a number', async () => {
    const harness = await createWidgetHarness(createScenario({ windMin: 0, windMax: 1, windFunctions: { windRisk: '100' } }));
    try {
      harness.callin('Initialize');
      expect(WidgetHeartbeatSchema.parse(harness.fs.readJson('stratcom/widget.json')).map.windRisk).toBe(100);
    } finally {
      harness.close();
    }
  });

  it('the session file records the widget version', async () => {
    const harness = await createWidgetHarness(createScenario());
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');
      const file = harness.fs.list('stratcom/session-')[0]!;
      expect(SessionFileDocSchema.parse(harness.fs.readJson(file)).widgetVersion).toBe('3.0.5');
    } finally {
      harness.close();
    }
  });

  it('Gaia (neutral) units are never enemies', async () => {
    const team = (teamId: number, allyTeamId: number, isMe: boolean) => ({
      teamId,
      allyTeamId,
      playerName: `P${teamId}`,
      factionId: 'armada',
      isAI: !isMe,
      isMe,
      metal: 1000,
      energy: 1000,
      metalStorage: 1000,
      energyStorage: 1000,
      metalIncome: 0,
      energyIncome: 0
    });
    // the harness's Gaia team is 999; like BAR, it is its own ally team
    const scenario = createScenario({ teams: [team(0, 0, true), team(1, 1, false), team(999, 2, false)] });
    scenario.addUnit(createScenarioUnit('armpw', scenario, { teamId: 1 }));
    scenario.addUnit(createScenarioUnit('armck', scenario, { teamId: 999 }));
    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');
      expect(StateDocSchema.parse(harness.fs.readJson('stratcom/state.json')).enemies).toEqual({ armpw: 1 });
    } finally {
      harness.close();
    }
  });
});
