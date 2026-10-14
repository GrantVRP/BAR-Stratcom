import { describe, expect, it } from 'vitest';
import { CoachDocSchema, StateDocSchema } from '../../src/core/schemas/protocol';
import { createWidgetHarness, type DrawCall } from './harness';
import { createScenario, createScenarioUnit, type Scenario, type ScenarioTeam } from './scenario';

const team = (teamId: number, allyTeamId: number, isMe: boolean, startPos?: ScenarioTeam['startPos']): ScenarioTeam => ({
  teamId,
  allyTeamId,
  playerName: isMe ? 'Me' : 'Enemy',
  factionId: isMe ? 'armada' : 'cortex',
  isAI: !isMe,
  isMe,
  metal: 1000,
  energy: 1000,
  metalStorage: 1000,
  energyStorage: 1000,
  metalIncome: 0,
  energyIncome: 0,
  ...(startPos ? { startPos } : {})
});

/**
 * Commander at (1000, 1000); range 2400 → the scope's sides are x ±2400, top/bottom z ±1200.
 * Own: commander, a constructor 600 east, a turbine far outside. Enemies: a Pawn in LOS (NE), an
 * unidentified radar blip (S), a Pawn far east (pinned to the edge), a hidden unit, a Gaia critter.
 */
function battlefield(withCommander = true): Scenario {
  const scenario = createScenario({ teams: [team(0, 0, true, { x: 300, y: 0, z: 300 }), team(1, 1, false)] });
  const add = (name: string, x: number, z: number, extra: Parameters<typeof createScenarioUnit>[2] = {}) =>
    scenario.addUnit(createScenarioUnit(name, scenario, { position: { x, y: 0, z }, ...extra }));
  if (withCommander) add('armcom', 1000, 1000);
  add('armck', 1600, 1000);
  add('armwin', 5000, 1000);
  add('armpw', 2200, 400, { teamId: 1 });
  add('armpw', 1000, 1600, { teamId: 1, sensor: 'radar' });
  add('armpw', 7000, 1000, { teamId: 1 });
  add('armpw', 1200, 1000, { teamId: 1, sensor: 'hidden' });
  add('armpw', 1100, 1100, { teamId: 999 });
  return scenario;
}

const coachDoc = (generatedAtSec = 1000) =>
  CoachDocSchema.parse({
    protocol: 1,
    seq: 1,
    sessionId: 's',
    mode: 'live',
    generatedAtSec,
    hud: {
      visible: true,
      title: 'T',
      lines: [],
      progress: null,
      build: { title: 'BUILDINGS', lines: [{ text: '1× Wind Turbine', tone: 'info', big: true, right: 'in 0:05', tag: 'CDR' }] },
      radar: { range: 2400, lines: [{ text: '2× Pawn', tone: 'warn', right: 'NEW' }] }
    },
    echo: [],
    assist: { armNext: null, factoryQueue: null, enabled: { armNext: false, factoryQueue: false } }
  });

/** The draw calls recorded into the radar's display list (between CreateList and CallList). */
function listCalls(calls: DrawCall[]): DrawCall[] {
  const start = calls.findIndex((c) => c.name === 'CreateList');
  const end = calls.findIndex((c, i) => i > start && c.name === 'CallList');
  return start < 0 ? [] : calls.slice(start + 1, end);
}

/** Each Rect with the colour set before it: [x1, y1, x2, y2, r, g, b, a]. */
function rects(calls: DrawCall[]): number[][] {
  let color: number[] = [];
  const out: number[][] = [];
  for (const c of calls) {
    if (c.name === 'Color') color = c.args.map(Number);
    if (c.name === 'Rect') out.push([...c.args.map(Number), ...color]);
  }
  return out;
}

async function radarDraw(scenario: Scenario) {
  const harness = await createWidgetHarness(scenario);
  harness.setTime(1001);
  harness.fs.writeJson('stratcom/coach.json', coachDoc());
  harness.callin('Initialize');
  harness.callin('GameFrame', 15); // starts the game and refreshes the blips
  harness.clearDrawCalls();
  harness.callin('DrawScreen');
  return harness;
}

describe('radar scope (widget 3.0.6)', () => {
  it('a RADAR box under BUILDINGS: range, contacts in LOS or radar (hidden and Gaia left out), the app rows', async () => {
    const harness = await radarDraw(battlefield());
    try {
      const texts = harness.drawCalls().filter((c) => c.name === 'Text').map((c) => String(c.args[0]));
      expect(texts).toEqual(expect.arrayContaining(['BUILDINGS', 'RADAR', '2400 RANGE', '3 CONTACTS', '2× Pawn', 'NEW']));
      const y = (t: string) => Number(harness.drawCalls().find((c) => c.name === 'Text' && c.args[0] === t)!.args[2]);
      expect(y('BUILDINGS')).toBeGreaterThan(y('RADAR'));
      expect(y('RADAR')).toBeGreaterThan(y('2× Pawn'));
    } finally {
      harness.close();
    }
  });

  it('blips are real positions around the commander: own green, enemies red, edge and unidentified dimmer', async () => {
    const harness = await radarDraw(battlefield());
    try {
      const dots = rects(listCalls(harness.drawCalls()));
      // box at x 1248 (65% of 1920), 360 wide → scope centre x 1428, half-width 168
      const sx = 1428;
      const green = dots.filter((d) => d[5]! > 0.8 && d[4]! < 0.5);
      const red = dots.filter((d) => d[4]! > 0.9 && d[5]! < 0.5);
      expect(green).toHaveLength(2); // commander + constructor; the far turbine is outside
      expect(green.map((d) => (d[0]! + d[2]!) / 2).sort((a, b) => a - b)).toEqual([sx, sx + 168 * 0.25]);
      expect(red).toHaveLength(3);
      const [pawn, blip, far] = red;
      expect((pawn![0]! + pawn![2]!) / 2).toBeCloseTo(sx + 168 * 0.5); // 1200 east of 2400
      expect(pawn![7]).toBe(1);
      expect((blip![0]! + blip![2]!) / 2).toBeCloseTo(sx);
      expect(blip![7]).toBe(0.5); // not identified
      expect((far![0]! + far![2]!) / 2).toBeCloseTo(sx + 168); // pinned to the east edge
      expect(far![7]).toBe(0.5);
      const commander = dots.at(-1)!;
      expect((commander[0]! + commander[2]!) / 2).toBeCloseTo(sx);
      expect(commander[4]! + commander[5]! + commander[6]!).toBeGreaterThan(2.8); // the light centre square
    } finally {
      harness.close();
    }
  });

  it('the display list is reused between refreshes and rebuilt after the next one', async () => {
    const harness = await radarDraw(battlefield());
    try {
      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      expect(harness.drawCalls().filter((c) => c.name === 'CreateList')).toHaveLength(0);
      expect(harness.drawCalls().filter((c) => c.name === 'CallList')).toHaveLength(1);
      harness.callin('GameFrame', 30);
      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      expect(harness.drawCalls().filter((c) => c.name === 'DeleteList')).toHaveLength(1);
      expect(harness.drawCalls().filter((c) => c.name === 'CreateList')).toHaveLength(1);
    } finally {
      harness.close();
    }
  });

  it('without a commander the scope centres on the start position, with no commander square', async () => {
    const harness = await radarDraw(battlefield(false));
    try {
      const dots = rects(listCalls(harness.drawCalls()));
      const green = dots.filter((d) => d[5]! > 0.8 && d[4]! < 0.5);
      // constructor at (1600, 1000) from start (300, 300): 1300 east (0.54), 700 south (0.58 of 1200)
      expect((green[0]![0]! + green[0]![2]!) / 2).toBeCloseTo(1428 + 168 * (1300 / 2400));
      expect(dots.some((d) => d[4]! + d[5]! + d[6]! > 2.8 && d[7] === 1)).toBe(false); // only the faint cross
    } finally {
      harness.close();
    }
  });

  it('spectating: no radar (and no blip refresh)', async () => {
    const scenario = battlefield();
    scenario.isSpectating = true;
    const harness = await radarDraw(scenario);
    try {
      expect(harness.drawCalls().some((c) => c.name === 'CreateList')).toBe(false);
      expect(harness.drawCalls().some((c) => c.name === 'Text' && c.args[0] === 'RADAR')).toBe(false);
    } finally {
      harness.close();
    }
  });

  it('state.json enemies: every identified enemy in LOS, even with nothing on screen', async () => {
    const harness = await createWidgetHarness(battlefield());
    try {
      harness.engine.global.set('__sp_get_visible_units', () => []); // the camera sees nothing
      harness.callin('Initialize');
      harness.callin('GameStart');
      const doc = StateDocSchema.parse(harness.fs.readJson('stratcom/state.json'));
      expect(doc.enemies).toEqual({ armpw: 2 }); // the near and the far Pawn; not the blip, hidden or Gaia
    } finally {
      harness.close();
    }
  });

  it('radar alone (radar mode, or the other boxes off): a square scope, so the south blip fits', async () => {
    const harness = await createWidgetHarness(battlefield());
    try {
      const doc = coachDoc();
      harness.setTime(1001);
      harness.fs.writeJson('stratcom/coach.json', { ...doc, hud: { ...doc.hud, build: null, factory: null, alerts: [] } });
      harness.callin('Initialize');
      harness.callin('GameFrame', 15);
      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      const all = rects(harness.drawCalls());
      // the scope background: 12 px in from each side of the 360 px box, 336 px tall (square)
      const scope = all.find((r) => r[0] === 1248 + 12 && r[2] === 1248 + 348 && r[7] === 0.25)!;
      expect(scope[3]! - scope[1]!).toBe(336);
      // the radar-only blip 600 south: inside the square at full scale (0.25 of the 168 px half-height)
      const red = rects(listCalls(harness.drawCalls())).filter((d) => d[4]! > 0.9 && d[5]! < 0.5);
      const sy = scope[3]! - 168;
      expect(red.some((d) => Math.abs((d[1]! + d[3]!) / 2 - (sy - 168 * 0.25)) < 0.01)).toBe(true);
    } finally {
      harness.close();
    }
  });

  it('every box switched off: only the alerts are drawn, no radar refresh', async () => {
    const harness = await createWidgetHarness(battlefield());
    try {
      const doc = coachDoc();
      harness.setTime(1001);
      harness.fs.writeJson('stratcom/coach.json', {
        ...doc,
        hud: { ...doc.hud, build: null, factory: null, radar: null, alerts: [{ text: 'ENERGY STALL', tone: 'danger' }] }
      });
      harness.callin('Initialize');
      harness.callin('GameFrame', 15);
      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      const texts = harness.drawCalls().filter((c) => c.name === 'Text').map((c) => String(c.args[0]));
      expect(texts).toEqual(['ENERGY STALL']);
      expect(harness.drawCalls().some((c) => c.name === 'CreateList')).toBe(false);
    } finally {
      harness.close();
    }
  });
});
