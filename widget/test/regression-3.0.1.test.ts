import { describe, expect, it } from 'vitest';
import { SessionFileDocSchema, StateDocSchema, WidgetHeartbeatSchema } from '../../src/core/schemas/protocol';
import { createWidgetHarness } from './harness';
import { createScenario, createScenarioUnit } from './scenario';

describe('Widget 3.0.1 Regression Tests (T02.8, S-7, S-8)', () => {
  it('resolves numeric startUnit ID to faction "cortex" and startUnitId "corcom", validating against StateDoc', async () => {
    // Harness returns numeric unitDefID for startUnit, matching real Recoil engine
    const scenario = createScenario({
      teams: [
        {
          teamId: 0,
          allyTeamId: 0,
          playerName: 'Grant_P',
          factionId: 'cortex',
          isAI: false,
          isMe: true,
          metal: 1000,
          energy: 1000,
          metalStorage: 1000,
          energyStorage: 1000,
          metalIncome: 0,
          energyIncome: 0,
          startUnit: 'corcom'
        }
      ]
    });

    const corcom = createScenarioUnit('corcom', scenario, { teamId: 0 });
    scenario.addUnit(corcom);

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      const raw = harness.fs.readJson('stratcom/state.json');
      expect(raw).not.toBeNull();

      // Must validate against StateDocSchema (S-7 acceptance criteria)
      const doc = StateDocSchema.parse(raw);
      expect(doc.me).not.toBeNull();
      expect(doc.me!.factionId).toBe('cortex');
      expect(doc.me!.startUnitId).toBe('corcom');
      expect(typeof doc.me!.startUnitId).toBe('string');
      expect(doc.me!.playerName).toBe('Grant_P');
    } finally {
      harness.close();
    }
  });

  it('exports wind lookup with real BAR shape (string values) converted to numbers', async () => {
    // BAR common/wind_functions uses numeric keys and string values e.g. [0] = { [1] = "0.8" }
    const scenario = createScenario({
      windMin: 0,
      windMax: 15,
      windFunctions: {
        averageWindLookup: {
          0: { 1: '0.8', 15: '7.5' },
          5: { 20: '12.5' }
        }
      }
    });

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');

      const raw = harness.fs.readJson<{
        protocol: number;
        kind: string;
        table: Record<string, Record<string, number>>;
      }>('stratcom/wind-lookup.json');

      expect(raw).not.toBeNull();
      expect(raw!.protocol).toBe(1);
      expect(raw!.kind).toBe('wind-lookup');

      // Regression S-8: values must be numbers, not strings or empty tables
      expect(raw!.table['0']).toBeDefined();
      expect(raw!.table['0']!['1']).toBe(0.8);
      expect(typeof raw!.table['0']!['1']).toBe('number');
      expect(raw!.table['0']!['15']).toBe(7.5);
      expect(typeof raw!.table['0']!['15']).toBe('number');
      expect(raw!.table['5']!['20']).toBe(12.5);

      // Heartbeat map.avgWind resolved as number
      const hbRaw = harness.fs.readJson('stratcom/widget.json');
      const hb = WidgetHeartbeatSchema.parse(hbRaw);
      expect(hb.map.avgWind).toBe(7.5);
      expect(typeof hb.map.avgWind).toBe('number');
    } finally {
      harness.close();
    }
  });

  it('names AI teams from Spring.GetAIInfo("<name> (AI)") and never the host player name', async () => {
    // In BAR skirmishes, leader is host player (0), but GetAIInfo provides the AI bot name
    const scenario = createScenario({
      myTeamId: 0,
      teams: [
        {
          teamId: 0,
          allyTeamId: 0,
          playerName: 'Grant_P',
          factionId: 'cortex',
          isAI: false,
          isMe: true,
          metal: 1000,
          energy: 1000,
          metalStorage: 1000,
          energyStorage: 1000,
          metalIncome: 0,
          energyIncome: 0,
          startUnit: 'corcom'
        },
        {
          teamId: 1,
          allyTeamId: 1,
          playerName: 'BARbarian',
          aiName: 'BARbarian',
          factionId: 'armada',
          isAI: true,
          isMe: false,
          metal: 1000,
          energy: 1000,
          metalStorage: 1000,
          energyStorage: 1000,
          metalIncome: 0,
          energyIncome: 0,
          startUnit: 'armcom'
        }
      ]
    });

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      const hb = WidgetHeartbeatSchema.parse(harness.fs.readJson('stratcom/widget.json'));
      expect(hb.sessionId).not.toBeNull();

      const sessionRaw = harness.fs.readJson(`stratcom/session-${hb.sessionId}.json`);
      expect(sessionRaw).not.toBeNull();

      const session = SessionFileDocSchema.parse(sessionRaw);
      expect(session.teams.length).toBe(2);

      const hostTeam = session.teams.find((t) => t.teamId === 0);
      const aiTeam = session.teams.find((t) => t.teamId === 1);

      expect(hostTeam?.playerName).toBe('Grant_P');
      expect(aiTeam?.isAI).toBe(true);
      // AI team must NOT be named after host player
      expect(aiTeam?.playerName).not.toBe('Grant_P');
      expect(aiTeam?.playerName).toBe('BARbarian (AI)');
      expect(aiTeam?.factionId).toBe('armada');
    } finally {
      harness.close();
    }
  });

  it('handles d743685 factory command count whether returned as a number or table', async () => {
    const scenario = createScenario();

    // Factory with numeric command count (as returned by Spring.GetFactoryCommands in engine 2026.07+)
    const factory1 = createScenarioUnit('armlab', scenario, {
      id: 2001,
      isBuilding: true,
      isBeingBuilt: false,
      commandCount: 0,
      factoryCommands: 3 as unknown as unknown[] // engine returns numeric count 3
    });

    // Factory with 0 commands (idle)
    const factory2 = createScenarioUnit('armlab', scenario, {
      id: 2002,
      isBuilding: true,
      isBeingBuilt: false,
      commandCount: 0,
      factoryCommands: 0 as unknown as unknown[]
    });

    scenario.addUnit(factory1);
    scenario.addUnit(factory2);

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      const raw = harness.fs.readJson('stratcom/state.json');
      const doc = StateDocSchema.parse(raw);

      expect(doc.factories.total).toBe(2);
      // 1 factory is busy with 3 queued commands, 1 is idle
      expect(doc.factories.idle).toBe(1);
    } finally {
      harness.close();
    }
  });

  it('auto-starts session in replays when startFrame > 0 at Initialize (37c54ca)', async () => {
    const scenario = createScenario({
      startFrame: 300,
      isReplay: true
    });

    const harness = await createWidgetHarness(scenario);
    try {
      // Only call Initialize, NOT GameStart
      harness.callin('Initialize');

      const hbRaw = harness.fs.readJson('stratcom/widget.json');
      const hb = WidgetHeartbeatSchema.parse(hbRaw);

      expect(hb.gameStarted).toBe(true);
      expect(hb.sessionId).not.toBeNull();
      expect(hb.mode).toBe('replay');

      // Session file was written
      const sessionRaw = harness.fs.readJson(`stratcom/session-${hb.sessionId}.json`);
      expect(sessionRaw).not.toBeNull();
      const session = SessionFileDocSchema.parse(sessionRaw);
      expect(session.mode).toBe('replay');
    } finally {
      harness.close();
    }
  });
});
