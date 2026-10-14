import { describe, expect, it } from 'vitest';
import type { CoachDoc, CoachHud } from '../../src/core/schemas/protocol';
import { CoachDocSchema } from '../../src/core/schemas/protocol';
import { createWidgetHarness, type DrawCall } from './harness';

const LEGACY: Pick<CoachHud, 'visible' | 'title' | 'lines' | 'progress'> = {
  visible: true,
  title: 'Armada // Rocketeer 1v1',
  lines: [{ text: 'NEXT 2× Wind Turbine      in 0:08', tone: 'info', big: true }],
  progress: { done: 7, total: 24 }
};

/** What the 3.0.5 app sends: BUILDINGS, FACTORY and alerts (plus the single-panel fields). */
const BOXES: Partial<CoachHud> = {
  build: {
    title: 'BUILDINGS',
    meta: [
      { text: '7/24', tone: 'info' },
      { text: '3s AHEAD', tone: 'good' }
    ],
    lines: [
      { text: '2× Wind Turbine', tone: 'info', big: true, right: 'in 0:08', tag: 'CDR', unitId: 'armwin' },
      { text: '1× Metal Extractor', tone: 'warn', right: '+0:04', tag: 'CON' },
      { text: '1× Solar Collector', tone: 'info', right: 'in 0:40', tag: 'CDR' }
    ]
  },
  factory: {
    title: 'FACTORY',
    lines: [
      { text: '5× Pawn', tone: 'info', big: true, right: 'in 0:12', tag: 'FAC', unitId: 'armpw' },
      { text: '1× Rocketeer', tone: 'info', right: 'in 0:30', tag: 'FAC' }
    ]
  },
  alerts: [{ text: 'ENERGY EMPTY IN 6s', tone: 'danger' }]
};

function makeCoachDoc(hud: Partial<CoachHud>, overrides: Partial<CoachDoc> = {}): CoachDoc {
  return CoachDocSchema.parse({
    protocol: 1,
    seq: 1,
    sessionId: 'session-123',
    mode: 'live',
    generatedAtSec: 1000,
    hud: { ...LEGACY, ...hud },
    echo: [],
    assist: { armNext: null, factoryQueue: null, enabled: { armNext: true, factoryQueue: false } },
    ...overrides
  });
}

async function draw(doc: CoachDoc, now = 1001): Promise<DrawCall[]> {
  const harness = await createWidgetHarness();
  try {
    harness.setTime(now);
    harness.fs.writeJson('stratcom/coach.json', doc);
    harness.callin('Initialize');
    harness.clearDrawCalls();
    harness.callin('DrawScreen');
    return harness.drawCalls();
  } finally {
    harness.close();
  }
}

/** Each Text call with the colour set just before it. */
function texts(calls: DrawCall[]): Array<{ text: string; x: number; y: number; size: number; opts: string; color: number[] }> {
  let color: number[] = [];
  const out = [];
  for (const c of calls) {
    if (c.name === 'Color') color = c.args.map(Number);
    if (c.name === 'Text') out.push({ text: String(c.args[0]), x: Number(c.args[1]), y: Number(c.args[2]), size: Number(c.args[3]), opts: String(c.args[4]), color });
  }
  return out;
}

const WARN = [251 / 255, 191 / 255, 36 / 255, 1];
const GOOD = [74 / 255, 222 / 255, 128 / 255, 1];

describe('HUD boxes (widget 3.0.5)', () => {
  it('draws BUILDINGS, FACTORY and alerts top to bottom instead of the single panel', async () => {
    const t = texts(await draw(makeCoachDoc(BOXES)));
    const at = (text: string) => t.find((c) => c.text === text)!;
    for (const text of ['BUILDINGS', 'FACTORY', '2× Wind Turbine', '1× Metal Extractor', '5× Pawn', '1× Rocketeer', 'ENERGY EMPTY IN 6s']) {
      expect(at(text), text).toBeDefined();
    }
    expect(t.some((c) => c.text.startsWith('ARMADA //'))).toBe(false); // the single panel is not drawn
    expect(at('BUILDINGS').y).toBeGreaterThan(at('2× Wind Turbine').y);
    expect(at('1× Solar Collector').y).toBeGreaterThan(at('FACTORY').y);
    expect(at('1× Rocketeer').y).toBeGreaterThan(at('ENERGY EMPTY IN 6s').y);
  });

  it('levels: the big row is largest and brightest, queue rows smaller, tags and headers smallest', async () => {
    const t = texts(await draw(makeCoachDoc(BOXES)));
    const at = (text: string) => t.find((c) => c.text === text)!;
    expect(at('2× Wind Turbine').size).toBeGreaterThan(at('1× Metal Extractor').size);
    expect(at('1× Metal Extractor').size).toBeGreaterThan(at('CDR').size);
    expect(at('BUILDINGS').size).toBeLessThan(at('1× Metal Extractor').size);
    const brightness = (c: number[]) => c[0]! + c[1]! + c[2]!;
    expect(brightness(at('2× Wind Turbine').color)).toBeGreaterThan(brightness(at('1× Solar Collector').color));
  });

  it('alignment: names share one column, timings are right-aligned on one edge in both boxes', async () => {
    const t = texts(await draw(makeCoachDoc(BOXES)));
    const names = ['2× Wind Turbine', '1× Metal Extractor', '1× Solar Collector', '5× Pawn', '1× Rocketeer'].map((n) => t.find((c) => c.text === n)!);
    expect(new Set(names.map((n) => n.x)).size).toBe(1);
    const timings = ['in 0:08', '+0:04', 'in 0:40', 'in 0:12', 'in 0:30'].map((n) => t.find((c) => c.text === n)!);
    expect(new Set(timings.map((n) => n.x)).size).toBe(1);
    for (const timing of timings) expect(timing.opts).toContain('r');
  });

  it('colour carries meaning: a late timing in warn, pace in its tone, ASSIST when a helper is on', async () => {
    const t = texts(await draw(makeCoachDoc(BOXES)));
    const at = (text: string) => t.find((c) => c.text === text)!;
    expect(at('+0:04').color).toEqual(WARN);
    expect(at('3s AHEAD').color).toEqual(GOOD);
    expect(at('ASSIST').color).toEqual(GOOD);
    expect(at('ASSIST').x).toBeLessThan(at('7/24').x);
    expect(at('7/24').x).toBeLessThan(at('3s AHEAD').x);
  });

  it('a tag is drawn only when the builder changes; the big row shows its build picture', async () => {
    const calls = await draw(makeCoachDoc(BOXES));
    const t = texts(calls);
    expect(t.filter((c) => c.text === 'FAC')).toHaveLength(1);
    expect(t.filter((c) => c.text === 'CDR')).toHaveLength(2); // CDR, CON, CDR
    const textures = calls.filter((c) => c.name === 'Texture').map((c) => c.args[0]);
    expect(textures.filter((a) => typeof a === 'string' && /^#\d+$/.test(a))).toHaveLength(2);
    expect(textures.filter((a) => a === false)).toHaveLength(2);
    expect(calls.filter((c) => c.name === 'TexRect')).toHaveLength(2);
  });

  it('no picture for a unit the game does not know; a row without timing takes its tone (PLAN COMPLETE)', async () => {
    const calls = await draw(
      makeCoachDoc({
        build: { title: 'BUILDINGS', lines: [{ text: 'PLAN COMPLETE', tone: 'good', big: true }] },
        factory: { title: 'FACTORY', lines: [{ text: '1× Thing', tone: 'info', big: true, unitId: 'notaunit' }] }
      })
    );
    expect(calls.filter((c) => c.name === 'TexRect')).toHaveLength(0);
    expect(texts(calls).find((c) => c.text === 'PLAN COMPLETE')!.color).toEqual(GOOD);
  });

  it('stale coach doc: the single offline panel, no boxes', async () => {
    const t = texts(await draw(makeCoachDoc(BOXES), 1010));
    expect(t.map((c) => c.text)).toContain('STRATCOM OFFLINE');
    expect(t.map((c) => c.text)).not.toContain('BUILDINGS');
  });
});
