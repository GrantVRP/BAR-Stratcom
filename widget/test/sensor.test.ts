import { describe, expect, it } from 'vitest';
import { StateDocSchema, WidgetHeartbeatSchema } from '../../src/core/schemas/protocol';
import { createWidgetHarness } from './harness';
import { createScenario, createScenarioUnit } from './scenario';

describe('Widget Sensor state.json (05 §6, 03 §7.2, T02.4)', () => {
  it('measures exact counts, idle numbers, and BP for commander + lab building + 2 mex + idle con', async () => {
    const scenario = createScenario();

    // 1. Commander (finished, idle)
    const armcom = createScenarioUnit('armcom', scenario, {
      commandCount: 0,
      isUnitBuilding: false,
      currentBuildPower: 0
    });
    // 2. Lab (building, progress 0.5)
    const armlab = createScenarioUnit('armlab', scenario, {
      isBeingBuilt: true,
      buildProgress: 0.5
    });
    // 3 & 4. Two mex (finished)
    const armmex1 = createScenarioUnit('armmex', scenario);
    const armmex2 = createScenarioUnit('armmex', scenario);
    // 5. Idle mobile constructor (finished, idle)
    const armck = createScenarioUnit('armck', scenario, {
      commandCount: 0,
      isUnitBuilding: false,
      currentBuildPower: 0
    });

    scenario.addUnit(armcom);
    scenario.addUnit(armlab);
    scenario.addUnit(armmex1);
    scenario.addUnit(armmex2);
    scenario.addUnit(armck);

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      const raw = harness.fs.readJson('stratcom/state.json');
      expect(raw).not.toBeNull();

      const doc = StateDocSchema.parse(raw);
      expect(doc.protocol).toBe(1);
      expect(doc.seq).toBe(1);
      expect(doc.frame).toBe(0);

      // Counts
      expect(doc.counts['armcom']).toEqual({ alive: 1, building: 0 });
      expect(doc.counts['armlab']).toEqual({ alive: 0, building: 1 });
      expect(doc.counts['armmex']).toEqual({ alive: 2, building: 0 });
      expect(doc.counts['armck']).toEqual({ alive: 1, building: 0 });

      // Builders (mobile constructor only, commander excluded)
      expect(doc.builders.total).toBe(1);
      expect(doc.builders.idle).toBe(1);

      // Factories (armlab is still under construction, so total is 0)
      expect(doc.factories.total).toBe(0);
      expect(doc.factories.idle).toBe(0);

      // Commander
      expect(doc.commander.alive).toBe(true);
      expect(doc.commander.idle).toBe(true);

      // BP: armcom buildSpeed (300) + armck buildSpeed (50) = 350
      expect(doc.bp.total).toBe(350);
      expect(doc.bp.active).toBe(0);
    } finally {
      harness.close();
    }
  });

  it('derives faction from startUnit even when team side string says the other faction (A-20 / P-10)', async () => {
    // Team side says "armada", but startUnit is "corcom" (Cortex)
    const scenario = createScenario({
      teams: [
        {
          teamId: 0,
          allyTeamId: 0,
          playerName: 'TestPlayer',
          factionId: 'armada', // team side says armada
          isAI: false,
          isMe: true,
          metal: 1000,
          energy: 1000,
          metalStorage: 1000,
          energyStorage: 1000,
          metalIncome: 0,
          energyIncome: 0,
          startUnit: 'corcom' // actual start unit is Cortex commander
        }
      ]
    });

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      const raw = harness.fs.readJson('stratcom/state.json');
      const doc = StateDocSchema.parse(raw);

      expect(doc.me).not.toBeNull();
      expect(doc.me!.startUnitId).toBe('corcom');
      expect(doc.me!.factionId).toBe('cortex'); // Derived from cor prefix, not team side!
    } finally {
      harness.close();
    }
  });

  it('ignores unidentified radar blip enemies and counts identified enemies', async () => {
    const scenario = createScenario({
      teams: [
        {
          teamId: 0,
          allyTeamId: 0,
          playerName: 'Player',
          factionId: 'armada',
          isAI: false,
          isMe: true,
          metal: 1000,
          energy: 1000,
          metalStorage: 1000,
          energyStorage: 1000,
          metalIncome: 0,
          energyIncome: 0
        },
        {
          teamId: 1,
          allyTeamId: 1,
          playerName: 'Enemy',
          factionId: 'cortex',
          isAI: true,
          isMe: false,
          metal: 1000,
          energy: 1000,
          metalStorage: 1000,
          energyStorage: 1000,
          metalIncome: 0,
          energyIncome: 0
        }
      ]
    });

    // Identified enemy: armpw
    const enemyUnit = createScenarioUnit('armpw', scenario, { teamId: 1 });
    scenario.addUnit(enemyUnit);

    // Radar blip enemy: defId = 0 (unidentified)
    scenario.addUnit({
      id: 9999,
      defId: 0,
      unitDefName: 'unknown_blip',
      teamId: 1,
      health: 100,
      maxHealth: 100,
      isBuilding: false,
      isBeingBuilt: false,
      buildProgress: 1,
      currentBuildPower: 0,
      position: { x: 500, y: 0, z: 500 }
    });

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      const raw = harness.fs.readJson('stratcom/state.json');
      const doc = StateDocSchema.parse(raw);

      // Only armpw is identified and counted
      expect(doc.enemies).toEqual({ armpw: 1 });
    } finally {
      harness.close();
    }
  });

  it('emits me: null, res: null, and populated teams in spectator/replay mode', async () => {
    const scenario = createScenario({
      isSpectating: true,
      teams: [
        {
          teamId: 0,
          allyTeamId: 0,
          playerName: 'ArmadaPlayer',
          factionId: 'armada',
          isAI: false,
          isMe: false,
          metal: 800,
          energy: 1200,
          metalStorage: 1000,
          energyStorage: 1000,
          metalIncome: 10,
          energyIncome: 20,
          startUnit: 'armcom'
        },
        {
          teamId: 1,
          allyTeamId: 1,
          playerName: 'CortexPlayer',
          factionId: 'cortex',
          isAI: false,
          isMe: false,
          metal: 950,
          energy: 1500,
          metalStorage: 1000,
          energyStorage: 1000,
          metalIncome: 15,
          energyIncome: 30,
          startUnit: 'corcom'
        }
      ]
    });

    const u0 = createScenarioUnit('armcom', scenario, { teamId: 0 });
    const u1 = createScenarioUnit('corcom', scenario, { teamId: 1 });
    scenario.addUnit(u0);
    scenario.addUnit(u1);

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');
      harness.setFrame(30);
      harness.callin('GameFrame', 30);

      const raw = harness.fs.readJson('stratcom/state.json');
      const doc = StateDocSchema.parse(raw);

      expect(doc.me).toBeNull();
      expect(doc.res).toBeNull();
      expect(doc.teams).toBeDefined();
      expect(doc.teams!.length).toBe(2);

      const t0 = doc.teams![0]!;
      expect(t0.teamId).toBe(0);
      expect(t0.playerName).toBe('ArmadaPlayer');
      expect(t0.factionId).toBe('armada');
      expect(t0.res.metal.current).toBe(800);
      expect(t0.counts['armcom']?.alive).toBe(1);

      const t1 = doc.teams![1]!;
      expect(t1.teamId).toBe(1);
      expect(t1.playerName).toBe('CortexPlayer');
      expect(t1.factionId).toBe('cortex');
      expect(t1.res.metal.current).toBe(950);
      expect(t1.counts['corcom']?.alive).toBe(1);
    } finally {
      harness.close();
    }
  });

  it('increments seq on each snapshot and publishes snapshotMs in heartbeat perf', async () => {
    const scenario = createScenario();
    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      let doc = StateDocSchema.parse(harness.fs.readJson('stratcom/state.json'));
      expect(doc.seq).toBe(1);

      harness.setFrame(30);
      harness.callin('GameFrame', 30);

      doc = StateDocSchema.parse(harness.fs.readJson('stratcom/state.json'));
      expect(doc.seq).toBe(2);
      expect(doc.frame).toBe(30);

      // Verify heartbeat perf contains snapshotMs
      const hb = WidgetHeartbeatSchema.parse(harness.fs.readJson('stratcom/widget.json'));
      expect(hb.perf).not.toBeNull();
      expect(typeof hb.perf!.snapshotMs).toBe('number');
    } finally {
      harness.close();
    }
  });

  it('debug recording switch: appends snapshots to state-<sessionId>.ndjson only when record_state.flag exists', async () => {
    const scenario = createScenario();
    const harness = await createWidgetHarness(scenario);
    try {
      // 1. Without record_state.flag: no state-*.ndjson is written
      harness.callin('Initialize');
      harness.callin('GameStart');
      harness.setFrame(30);
      harness.callin('GameFrame', 30);

      const stateFilesNoFlag = harness.fs.list('stratcom/state-');
      expect(stateFilesNoFlag.length).toBe(0);

      // 2. Create record_state.flag
      harness.fs.write('stratcom/record_state.flag', '');

      // Frame 60 snapshot
      harness.setFrame(60);
      harness.callin('GameFrame', 60);

      const stateFilesWithFlag = harness.fs.list('stratcom/state-');
      expect(stateFilesWithFlag.length).toBe(1);

      const ndjsonPath = stateFilesWithFlag[0]!;
      expect(ndjsonPath).toMatch(/^stratcom\/state-.*\.ndjson$/);

      // Frame 90 snapshot
      harness.setFrame(90);
      harness.callin('GameFrame', 90);

      const content = harness.fs.read(ndjsonPath) ?? '';
      const lines = content.trim().split('\n').filter(Boolean);
      expect(lines.length).toBe(2);

      // Each line must parse with StateDocSchema
      const doc1 = StateDocSchema.parse(JSON.parse(lines[0]!));
      const doc2 = StateDocSchema.parse(JSON.parse(lines[1]!));
      expect(doc1.frame).toBe(60);
      expect(doc1.seq).toBe(3);
      expect(doc2.frame).toBe(90);
      expect(doc2.seq).toBe(4);
    } finally {
      harness.close();
    }
  });
});
