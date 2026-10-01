import { describe, expect, it } from 'vitest';
import { SessionFileDocSchema, WidgetEventSchema, type WidgetEvent } from '../../src/core/schemas/protocol';
import { createWidgetHarness } from './harness';
import { createScenario, createScenarioUnit } from './scenario';

function parseEventsNdjson(content: string): WidgetEvent[] {
  return content
    .trim()
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => WidgetEventSchema.parse(JSON.parse(line)));
}

describe('Widget Recorder session & events (05 §7, 03 §7.3, §7.7, T02.5)', () => {
  it('records a scripted game with commander, lab, units, destroyed unit and gameover in chronological order', async () => {
    const scenario = createScenario();
    const com = createScenarioUnit('armcom', scenario, { id: 100, teamId: 0 });
    scenario.addUnit(com);

    const armmexDefId = scenario.unitDefsByName.get('armmex')!.defId;
    const armlabDefId = scenario.unitDefsByName.get('armlab')!.defId;
    const armpwDefId = scenario.unitDefsByName.get('armpw')!.defId;
    const armpeepDefId = scenario.unitDefsByName.get('armpeep')!.defId;

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      // 1. Commander builds 2 mex
      harness.setFrame(10);
      harness.callin('UnitCreated', 201, armmexDefId, 0, 100);

      harness.setFrame(30);
      harness.callin('UnitFinished', 201, armmexDefId, 0);
      harness.callin('GameFrame', 30);

      harness.setFrame(40);
      harness.callin('UnitCreated', 202, armmexDefId, 0, 100);

      harness.setFrame(60);
      harness.callin('UnitFinished', 202, armmexDefId, 0);
      harness.callin('GameFrame', 60);

      // 2. Commander builds a bot lab
      harness.setFrame(70);
      harness.callin('UnitCreated', 300, armlabDefId, 0, 100);

      harness.setFrame(120);
      harness.callin('UnitFinished', 300, armlabDefId, 0);
      // Register lab in scenario so builder def lookup works
      const lab = createScenarioUnit('armlab', scenario, { id: 300, teamId: 0 });
      scenario.addUnit(lab);
      harness.callin('GameFrame', 120);

      // 3. Lab builds 3 units (2 armpw, 1 armrock)
      harness.setFrame(130);
      harness.callin('UnitCreated', 401, armpwDefId, 0, 300);

      harness.setFrame(140);
      harness.callin('UnitFinished', 401, armpwDefId, 0);

      harness.setFrame(145);
      harness.callin('UnitCreated', 402, armpwDefId, 0, 300);

      harness.setFrame(150);
      harness.callin('GameFrame', 150);

      harness.setFrame(155);
      harness.callin('UnitFinished', 402, armpwDefId, 0);

      harness.setFrame(160);
      harness.callin('UnitCreated', 403, armpeepDefId, 0, 300);

      harness.setFrame(170);
      harness.callin('UnitFinished', 403, armpeepDefId, 0);

      // 4. One unit destroyed (armpw 401)
      harness.setFrame(180);
      harness.callin('UnitDestroyed', 401, armpwDefId, 0, 99, 1, 1);
      harness.callin('GameFrame', 180);

      // 5. GameOver with winning allyTeam 0
      harness.setFrame(200);
      harness.callin('GameOver', [0]);

      // Check session file
      const sessionFiles = harness.fs.list('stratcom/session-');
      expect(sessionFiles.length).toBe(1);
      const rawSession = harness.fs.readJson(sessionFiles[0]!);
      expect(rawSession).not.toBeNull();

      const sessionDoc = SessionFileDocSchema.parse(rawSession);
      expect(sessionDoc.protocol).toBe(1);
      expect(sessionDoc.kind).toBe('session');
      expect(sessionDoc.mode).toBe('player');
      expect(sessionDoc.teams.length).toBe(1);
      expect(sessionDoc.teams[0]!.isMe).toBe(true);
      expect(sessionDoc.teams[0]!.factionId).toBe('armada');
      expect(sessionDoc.start).toEqual({
        metal: 1000,
        energy: 1000,
        metalStorage: 1000,
        energyStorage: 1000
      });

      // Check events file
      const eventsFiles = harness.fs.list('stratcom/events-');
      expect(eventsFiles.length).toBe(1);
      const rawEvents = harness.fs.read(eventsFiles[0]!);
      expect(rawEvents).toBeDefined();

      const events = parseEventsNdjson(rawEvents!);
      expect(events.length).toBe(15);

      // Verify exact sequence of events
      expect(events[0]).toEqual({ f: 0, e: 'gamestart' });
      expect(events[1]).toEqual({
        f: 10,
        e: 'created',
        u: 201,
        d: 'armmex',
        tm: 0,
        b: 100,
        bd: 'armcom'
      });
      expect(events[2]).toEqual({ f: 30, e: 'finished', u: 201, d: 'armmex', tm: 0 });
      expect(events[3]).toEqual({
        f: 40,
        e: 'created',
        u: 202,
        d: 'armmex',
        tm: 0,
        b: 100,
        bd: 'armcom'
      });
      expect(events[4]).toEqual({ f: 60, e: 'finished', u: 202, d: 'armmex', tm: 0 });
      expect(events[5]).toEqual({
        f: 70,
        e: 'created',
        u: 300,
        d: 'armlab',
        tm: 0,
        b: 100,
        bd: 'armcom'
      });
      expect(events[6]).toEqual({ f: 120, e: 'finished', u: 300, d: 'armlab', tm: 0 });
      expect(events[7]).toEqual({
        f: 130,
        e: 'created',
        u: 401,
        d: 'armpw',
        tm: 0,
        b: 300,
        bd: 'armlab'
      });
      expect(events[8]).toEqual({ f: 140, e: 'finished', u: 401, d: 'armpw', tm: 0 });
      expect(events[9]).toEqual({
        f: 145,
        e: 'created',
        u: 402,
        d: 'armpw',
        tm: 0,
        b: 300,
        bd: 'armlab'
      });
      expect(events[10]).toEqual({ f: 155, e: 'finished', u: 402, d: 'armpw', tm: 0 });
      expect(events[11]).toEqual({
        f: 160,
        e: 'created',
        u: 403,
        d: 'armpeep',
        tm: 0,
        b: 300,
        bd: 'armlab'
      });
      expect(events[12]).toEqual({ f: 170, e: 'finished', u: 403, d: 'armpeep', tm: 0 });
      expect(events[13]).toEqual({ f: 180, e: 'destroyed', u: 401, d: 'armpw', tm: 0 });
      expect(events[14]).toEqual({ f: 200, e: 'gameover', w: [0] });
    } finally {
      harness.close();
    }
  });

  it('records multiple non-Gaia teams and ignores Gaia in spectator mode', async () => {
    const scenario = createScenario({
      isSpectating: true,
      teams: [
        {
          teamId: 0,
          allyTeamId: 0,
          playerName: 'PlayerAlpha',
          factionId: 'armada',
          isAI: false,
          isMe: false,
          metal: 1000,
          energy: 1000,
          metalStorage: 1000,
          energyStorage: 1000,
          metalIncome: 0,
          energyIncome: 0,
          startUnit: 'armcom'
        },
        {
          teamId: 1,
          allyTeamId: 1,
          playerName: 'PlayerBeta',
          factionId: 'cortex',
          isAI: false,
          isMe: false,
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

    const armpwDefId = scenario.unitDefsByName.get('armpw')!.defId;
    const cormexDefId = scenario.unitDefsByName.get('cormex')!.defId;
    const armmexDefId = scenario.unitDefsByName.get('armmex')!.defId;

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      // Team 0 creates a unit
      harness.setFrame(10);
      harness.callin('UnitCreated', 501, armpwDefId, 0);

      // Team 1 creates a unit
      harness.setFrame(15);
      harness.callin('UnitCreated', 502, cormexDefId, 1);

      // Gaia team (999) creates a unit (should be ignored)
      harness.setFrame(20);
      harness.callin('UnitCreated', 901, armmexDefId, 999);

      // Flush on frame 30
      harness.setFrame(30);
      harness.callin('GameFrame', 30);

      // Check session file
      const sessionFiles = harness.fs.list('stratcom/session-');
      const sessionDoc = SessionFileDocSchema.parse(harness.fs.readJson(sessionFiles[0]!));
      expect(sessionDoc.mode).toBe('spectator');
      expect(sessionDoc.teams.length).toBe(2);
      expect(sessionDoc.teams[0]!.isMe).toBe(false);
      expect(sessionDoc.teams[1]!.isMe).toBe(false);
      expect(sessionDoc.start).toBeNull();

      // Check events file
      const eventsFiles = harness.fs.list('stratcom/events-');
      const events = parseEventsNdjson(harness.fs.read(eventsFiles[0]!)!);

      expect(events.length).toBe(3);
      expect(events[0]).toEqual({ f: 0, e: 'gamestart' });
      expect(events[1]).toEqual({ f: 10, e: 'created', u: 501, d: 'armpw', tm: 0 });
      expect(events[2]).toEqual({ f: 15, e: 'created', u: 502, d: 'cormex', tm: 1 });
    } finally {
      harness.close();
    }
  });

  it('records created and destroyed without finished when a unit dies under construction', async () => {
    const scenario = createScenario();
    const armmexDefId = scenario.unitDefsByName.get('armmex')!.defId;

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      harness.setFrame(15);
      harness.callin('UnitCreated', 601, armmexDefId, 0, 100);

      harness.setFrame(25);
      harness.callin('UnitDestroyed', 601, armmexDefId, 0, 99, 1, 1);

      harness.setFrame(30);
      harness.callin('GameFrame', 30);

      const eventsFiles = harness.fs.list('stratcom/events-');
      const events = parseEventsNdjson(harness.fs.read(eventsFiles[0]!)!);

      expect(events.length).toBe(3);
      expect(events[0]).toEqual({ f: 0, e: 'gamestart' });
      expect(events[1]).toEqual({
        f: 15,
        e: 'created',
        u: 601,
        d: 'armmex',
        tm: 0,
        b: 100,
        bd: null
      });
      expect(events[2]).toEqual({ f: 25, e: 'destroyed', u: 601, d: 'armmex', tm: 0 });

      // Explicitly prove no finished event exists
      const finished = events.find((e) => e.e === 'finished');
      expect(finished).toBeUndefined();
    } finally {
      harness.close();
    }
  });

  it('flushes buffered events on widget Shutdown', async () => {
    const scenario = createScenario();
    const armmexDefId = scenario.unitDefsByName.get('armmex')!.defId;

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      harness.setFrame(30);
      harness.callin('GameFrame', 30);

      // Event at frame 35, before frame 60
      harness.setFrame(35);
      harness.callin('UnitCreated', 701, armmexDefId, 0);

      // Shutdown at frame 40 without calling GameFrame 60
      harness.setFrame(40);
      harness.callin('Shutdown');

      const eventsFiles = harness.fs.list('stratcom/events-');
      const events = parseEventsNdjson(harness.fs.read(eventsFiles[0]!)!);

      expect(events.some((e) => e.e === 'created' && e.u === 701)).toBe(true);
    } finally {
      harness.close();
    }
  });

  it('records given and taken events according to tracked team filter', async () => {
    const scenario = createScenario({ myTeamId: 0 });
    const armpwDefId = scenario.unitDefsByName.get('armpw')!.defId;

    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');
      harness.callin('GameStart');

      // Unit taken from myTeam (0) to team 1 -> tracked
      harness.setFrame(50);
      harness.callin('UnitTaken', 801, armpwDefId, 0, 1);

      // Unit given to team 1 from team 2 -> ignored (neither is myTeam)
      harness.setFrame(55);
      harness.callin('UnitGiven', 802, armpwDefId, 1, 2);

      // Unit given to myTeam (0) from team 1 -> tracked
      harness.setFrame(60);
      harness.callin('UnitGiven', 803, armpwDefId, 0, 1);
      harness.callin('GameFrame', 60);

      const eventsFiles = harness.fs.list('stratcom/events-');
      const events = parseEventsNdjson(harness.fs.read(eventsFiles[0]!)!);

      const takenEvent = events.find((e) => e.e === 'taken' && e.u === 801);
      expect(takenEvent).toEqual({ f: 50, e: 'taken', u: 801, d: 'armpw', tm: 0 });

      const givenEvent = events.find((e) => e.e === 'given' && e.u === 803);
      expect(givenEvent).toEqual({ f: 60, e: 'given', u: 803, d: 'armpw', tm: 0 });

      const ignoredEvent = events.find((e) => 'u' in e && e.u === 802);
      expect(ignoredEvent).toBeUndefined();
    } finally {
      harness.close();
    }
  });
});
