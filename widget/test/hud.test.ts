import { describe, expect, it } from 'vitest';
import type { CoachDoc } from '../../src/core/schemas/protocol';
import { CoachDocSchema, WidgetHeartbeatSchema } from '../../src/core/schemas/protocol';
import { createWidgetHarness } from './harness';
import { createScenario } from './scenario';

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

function makeTeam(teamId: number, playerName: string, factionId: string, isAI = false) {
  return {
    teamId,
    allyTeamId: teamId,
    playerName,
    factionId,
    isAI,
    isMe: false,
    metal: 1000,
    energy: 1000,
    metalStorage: 1000,
    energyStorage: 1000,
    metalIncome: 10,
    energyIncome: 20
  };
}

describe('Mini-HUD, Coach reader & Echo (05 §8.1-§8.3, T02.6)', () => {
  it('valid coach doc renders HUD panel, faction accent border, title with progress, assist tag, and up to 4 lines with tones', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.setTime(1001);
      const doc = makeCoachDoc();
      harness.fs.writeJson('stratcom/coach.json', doc);

      harness.callin('Initialize');
      harness.clearDrawCalls();
      harness.callin('DrawScreen');

      const calls = harness.drawCalls();
      expect(calls.length).toBeGreaterThan(0);

      // Verify text calls
      const textCalls = calls.filter((c) => c.name === 'Text');
      const texts = textCalls.map((c) => String(c.args[0]));

      expect(texts).toContain('ARMADA // ROCKETEER 1V1  7/24');
      expect(texts).toContain('ASSIST ON');
      expect(texts).toContain('NEXT  2x Metal Extractor in 0:08');
      expect(texts).toContain('PLAN  +3s AHEAD');
      expect(texts).toContain('ENERGY EMPTY IN 6s');
      expect(texts).toContain('FACTORY IDLE');

      // Verify big line font size is larger than normal line
      const bigCall = textCalls.find((c) => String(c.args[0]).includes('NEXT'));
      const normalCall = textCalls.find((c) => String(c.args[0]).includes('PLAN'));
      expect(bigCall).toBeDefined();
      expect(normalCall).toBeDefined();
      expect(Number(bigCall?.args[3])).toBeGreaterThan(Number(normalCall?.args[3]));

      // Verify colors: rects and colors were called
      const rectCalls = calls.filter((c) => c.name === 'Rect');
      expect(rectCalls.length).toBeGreaterThanOrEqual(5); // background, 4 borders, divider

      // Verify heartbeat records drawMs
      harness.callin('Update', 1.0);
      const hbRaw = harness.fs.readJson('stratcom/widget.json');
      const hb = WidgetHeartbeatSchema.parse(hbRaw);
      expect(hb.perf).not.toBeNull();
      expect(hb.perf?.drawMs).toBeGreaterThan(0);
    } finally {
      harness.close();
    }
  });

  it('stale coach doc (now - generatedAtSec > 5) displays dim single line "STRATCOM OFFLINE"', async () => {
    const harness = await createWidgetHarness();
    try {
      const doc = makeCoachDoc({ generatedAtSec: 1000 });
      harness.fs.writeJson('stratcom/coach.json', doc);

      // Current time is 1007 (difference 7s > 5s stale threshold)
      harness.setTime(1007);
      harness.callin('Initialize');
      harness.clearDrawCalls();
      harness.callin('DrawScreen');

      const textCalls = harness.drawCalls().filter((c) => c.name === 'Text');
      const texts = textCalls.map((c) => String(c.args[0]));

      expect(texts).toContain('STRATCOM OFFLINE');
      expect(texts).not.toContain('NEXT  2x Metal Extractor in 0:08');
      expect(texts).not.toContain('PLAN  +3s AHEAD');
    } finally {
      harness.close();
    }
  });

  it('wrong protocol or non-increasing seq is ignored', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.setTime(1001);
      const validDoc = makeCoachDoc({
        seq: 5,
        hud: {
          visible: true,
          title: 'Initial Title',
          lines: [{ text: 'Step 5 Active', tone: 'info' }],
          progress: null
        }
      });
      harness.fs.writeJson('stratcom/coach.json', validDoc);
      harness.callin('Initialize');

      // 1. Wrong protocol (2) with higher seq (10)
      const wrongProto = { ...validDoc, protocol: 2, seq: 10 };
      harness.fs.writeJson('stratcom/coach.json', wrongProto);
      harness.callin('Update', 0.5);

      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      let texts = harness
        .drawCalls()
        .filter((c) => c.name === 'Text')
        .map((c) => String(c.args[0]));
      expect(texts).toContain('INITIAL TITLE');
      expect(texts).toContain('Step 5 Active');

      // 2. Protocol 1 with lower seq (4)
      const lowerSeq = makeCoachDoc({
        seq: 4,
        hud: {
          visible: true,
          title: 'Lower Seq Title',
          lines: [{ text: 'Should Not Replace', tone: 'warn' }],
          progress: null
        }
      });
      harness.fs.writeJson('stratcom/coach.json', lowerSeq);
      harness.callin('Update', 0.5);

      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      texts = harness
        .drawCalls()
        .filter((c) => c.name === 'Text')
        .map((c) => String(c.args[0]));
      expect(texts).toContain('INITIAL TITLE');
      expect(texts).toContain('Step 5 Active');
      expect(texts).not.toContain('Should Not Replace');
    } finally {
      harness.close();
    }
  });

  it('chat echo prints each id once via Spring.Echo with [StratCom] prefix and bounded FIFO queue', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.setTime(1001);

      // Doc 1 with 2 echos
      const doc1 = makeCoachDoc({
        seq: 1,
        echo: [
          { id: 'alert-1', text: 'Low Energy warning' },
          { id: 'alert-2', text: 'Mex Finished' }
        ]
      });
      harness.fs.writeJson('stratcom/coach.json', doc1);
      harness.callin('Initialize');

      expect(harness.echoMessages()).toEqual(['[StratCom] Low Energy warning', '[StratCom] Mex Finished']);

      // Doc 2 repeating alert-1 and adding alert-3
      const doc2 = makeCoachDoc({
        seq: 2,
        echo: [
          { id: 'alert-1', text: 'Low Energy warning' },
          { id: 'alert-3', text: 'Commander under attack' }
        ]
      });
      harness.fs.writeJson('stratcom/coach.json', doc2);
      harness.callin('Update', 0.5);

      expect(harness.echoMessages()).toEqual([
        '[StratCom] Low Energy warning',
        '[StratCom] Mex Finished',
        '[StratCom] Commander under attack'
      ]);

      // Test bounded queue by feeding 70 distinct IDs
      const bigEchoList: Array<{ id: string; text: string }> = [];
      for (let i = 10; i < 80; i++) {
        bigEchoList.push({ id: `e-${i}`, text: `Msg ${i}` });
      }
      const doc3 = makeCoachDoc({ seq: 3, echo: bigEchoList });
      harness.fs.writeJson('stratcom/coach.json', doc3);
      harness.callin('Update', 0.5);

      // Total echoed messages: 2 + 1 + 70 = 73
      expect(harness.echoMessages().length).toBe(73);
    } finally {
      harness.close();
    }
  });

  it('visibility rules: hidden when hud.visible=false, mode="off", or after GameOver', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.setTime(1001);

      // 1. Hidden when hud.visible = false
      const hiddenDoc = makeCoachDoc({
        seq: 1,
        hud: { visible: false, title: 'Hidden Title', lines: [], progress: null }
      });
      harness.fs.writeJson('stratcom/coach.json', hiddenDoc);
      harness.callin('Initialize');

      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      expect(harness.drawCalls().length).toBe(0);

      // 2. Hidden when mode = 'off'
      const offDoc = makeCoachDoc({
        seq: 2,
        mode: 'off',
        hud: {
          visible: true,
          title: 'Off Title',
          lines: [{ text: 'Line', tone: 'info' }],
          progress: null
        }
      });
      harness.fs.writeJson('stratcom/coach.json', offDoc);
      harness.callin('Update', 0.5);

      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      expect(harness.drawCalls().length).toBe(0);

      // 3. Active doc, then GameOver
      const activeDoc = makeCoachDoc({
        seq: 3,
        mode: 'live',
        hud: {
          visible: true,
          title: 'Active Title',
          lines: [{ text: 'Active Line', tone: 'info' }],
          progress: null
        }
      });
      harness.fs.writeJson('stratcom/coach.json', activeDoc);
      harness.callin('Update', 0.5);

      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      expect(harness.drawCalls().length).toBeGreaterThan(0);

      harness.callin('GameOver');
      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      expect(harness.drawCalls().length).toBe(0);
    } finally {
      harness.close();
    }
  });

  it('action stratcom_hud_toggle flips visibility and persists via GetConfigData', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.setTime(1001);
      const doc = makeCoachDoc();
      harness.fs.writeJson('stratcom/coach.json', doc);
      harness.callin('Initialize');

      const toggleAction = harness.actions().get('stratcom_hud_toggle') as (() => boolean) | undefined;
      expect(typeof toggleAction).toBe('function');

      // Initial state is visible
      const initialCfg = harness.callin('GetConfigData') as { hudVisible: boolean };
      expect(initialCfg.hudVisible).toBe(true);

      // Toggle to false
      toggleAction!();
      const toggledCfg = harness.callin('GetConfigData') as { hudVisible: boolean };
      expect(toggledCfg.hudVisible).toBe(false);

      // Does not draw when toggled off
      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      expect(harness.drawCalls().length).toBe(0);

      // Toggle back to true
      toggleAction!();
      const restoredCfg = harness.callin('GetConfigData') as { hudVisible: boolean };
      expect(restoredCfg.hudVisible).toBe(true);

      harness.clearDrawCalls();
      harness.callin('DrawScreen');
      expect(harness.drawCalls().length).toBeGreaterThan(0);
    } finally {
      harness.close();
    }
  });

  it('spectator mode displays single line "REC ● capturing N teams"', async () => {
    const scenario = createScenario({
      isSpectating: true,
      teams: [makeTeam(0, 'ArmadaPlayer', 'armada'), makeTeam(1, 'CortexPlayer', 'cortex', true)]
    });
    const harness = await createWidgetHarness(scenario);
    try {
      harness.setTime(1001);
      const doc = makeCoachDoc();
      harness.fs.writeJson('stratcom/coach.json', doc);
      harness.callin('Initialize');

      harness.clearDrawCalls();
      harness.callin('DrawScreen');

      const textCalls = harness.drawCalls().filter((c) => c.name === 'Text');
      const texts = textCalls.map((c) => String(c.args[0]));

      expect(texts.some((t) => t.includes('REC') && t.includes('capturing 2 teams'))).toBe(true);
      expect(texts).not.toContain('NEXT  2x Metal Extractor in 0:08');
    } finally {
      harness.close();
    }
  });

  it('dragging HUD title bar updates coordinates and persists in GetConfigData', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.setTime(1001);
      const doc = makeCoachDoc();
      harness.fs.writeJson('stratcom/coach.json', doc);
      harness.callin('Initialize');

      // Default coords at 1080p:
      // defaultX = 1920 * 0.65 = 1248
      // defaultY = 1080 - 60 = 1020
      // Title bar is [1248, 1248 + 320] x [1020 - 24, 1020] = [1248, 1568] x [996, 1020]

      // Click outside title bar
      const outsideClick = harness.callin('MousePress', 100, 100, 1);
      expect(outsideClick).toBe(false);

      // Click inside title bar (button 1)
      const pressInside = harness.callin('MousePress', 1300, 1010, 1);
      expect(pressInside).toBe(true);

      // Drag mouse to (1350, 1030)
      const move = harness.callin('MouseMove', 1350, 1030, 50, 20, 1);
      expect(move).toBe(true);

      // Release mouse
      const release = harness.callin('MouseRelease', 1350, 1030, 1);
      expect(release).toBe(true);

      const cfg = harness.callin('GetConfigData') as { hudX: number; hudY: number };
      expect(cfg.hudX).toBe(1298); // 1350 - (1300 - 1248) = 1298
      expect(cfg.hudY).toBe(1040); // 1030 - (1010 - 1020) = 1040
    } finally {
      harness.close();
    }
  });
});
