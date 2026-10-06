import { describe, expect, it } from 'vitest';
import type { CoachDoc } from '../../src/core/schemas/protocol';
import { CoachDocSchema } from '../../src/core/schemas/protocol';
import { createWidgetHarness } from './harness';

function makeCoachDoc(overrides: Partial<CoachDoc> = {}): CoachDoc {
  const doc: CoachDoc = {
    protocol: 1,
    seq: 1,
    sessionId: 'session-123',
    mode: 'live',
    generatedAtSec: 1000,
    hud: {
      visible: true,
      title: 'Armada // Rocketeer 1v1',
      lines: [
        { text: 'NEXT  2x Metal Extractor in 0:08', tone: 'good', big: true },
        { text: 'PLAN  +3s AHEAD', tone: 'info' },
        { text: 'ENERGY EMPTY IN 6s', tone: 'warn' },
        { text: 'FACTORY IDLE', tone: 'danger' }
      ],
      progress: { done: 7, total: 24 }
    },
    echo: [],
    assist: {
      armNext: { unitId: 'armmex', stepId: 's1' },
      factoryQueue: null,
      enabled: { armNext: true, factoryQueue: false }
    },
    ...overrides
  };
  return CoachDocSchema.parse(doc);
}

describe('Mini-HUD factory box (05 §8.1, T09.3)', () => {
  it('factory box (3.0.4, T09.3): a second panel under the main one with the factory title and its lines', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.setTime(1001);
      const base = makeCoachDoc();
      const doc = makeCoachDoc({
        hud: {
          ...base.hud,
          factory: {
            title: 'FACTORY // Bot Lab',
            lines: [
              { text: '5× Pawn                      in 0:12', tone: 'warn', big: true },
              { text: '1× Rocketeer', tone: 'info' }
            ]
          }
        }
      });
      harness.fs.writeJson('stratcom/coach.json', doc);
      harness.callin('Initialize');
      harness.clearDrawCalls();
      harness.callin('DrawScreen');

      const calls = harness.drawCalls();
      const texts = calls.filter((c) => c.name === 'Text');
      const at = (text: string) => texts.find((c) => String(c.args[0]) === text);
      expect(at('ARMADA // ROCKETEER 1V1  7/24')).toBeDefined();
      expect(at('FACTORY // BOT LAB')).toBeDefined();
      expect(at('5× Pawn                      in 0:12')).toBeDefined();
      expect(at('1× Rocketeer')).toBeDefined();
      // same column, below every main-panel line (y grows upwards)
      expect(Number(at('FACTORY // BOT LAB')!.args[1])).toBe(Number(at('FACTORY IDLE')!.args[1]));
      expect(Number(at('FACTORY // BOT LAB')!.args[2])).toBeLessThan(Number(at('FACTORY IDLE')!.args[2]));
      expect(Number(at('5× Pawn                      in 0:12')!.args[3])).toBeGreaterThan(Number(at('1× Rocketeer')!.args[3]));
      // two panels: background + 4 borders + divider each
      expect(calls.filter((c) => c.name === 'Rect').length).toBe(12);
    } finally {
      harness.close();
    }
  });

  it('factory box is not drawn when null, stale or spectating', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.setTime(1001);
      harness.fs.writeJson('stratcom/coach.json', makeCoachDoc({ hud: { ...makeCoachDoc().hud, factory: null } }));
      harness.callin('Initialize');
      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      expect(harness.drawCalls().filter((c) => c.name === 'Rect').length).toBe(6);

      const withBox = makeCoachDoc({
        seq: 2,
        hud: { ...makeCoachDoc().hud, factory: { title: 'FACTORY // BOT LAB', lines: [{ text: '1× Pawn', tone: 'info' }] } }
      });
      harness.fs.writeJson('stratcom/coach.json', withBox);
      harness.setTime(1010); // generatedAtSec 1000: stale
      harness.callin('Update', 1.0);
      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      const texts = harness.drawCalls().filter((c) => c.name === 'Text').map((c) => String(c.args[0]));
      expect(texts).toContain('STRATCOM OFFLINE');
      expect(texts).not.toContain('FACTORY // BOT LAB');
    } finally {
      harness.close();
    }
  });
});
