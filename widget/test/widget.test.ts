import { describe, expect, it } from 'vitest';
import { WidgetHeartbeatSchema } from '../../src/core/schemas/protocol';
import { createWidgetHarness } from './harness';
import { createScenario } from './scenario';

describe('Widget v2 Skeleton & Protocol (05 §2-§4, T02.2)', () => {
  it('Initialize writes probe.json and widget.json atomically with no .tmp left behind', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.callin('Initialize');

      expect(harness.fs.exists('stratcom/probe.json')).toBe(true);
      expect(harness.fs.exists('stratcom/probe.json.tmp')).toBe(false);
      expect(harness.fs.exists('stratcom/widget.json')).toBe(true);
      expect(harness.fs.exists('stratcom/widget.json.tmp')).toBe(false);
    } finally {
      harness.close();
    }
  });

  it('heartbeat file validates against WidgetHeartbeat schema', async () => {
    const scenario = createScenario({
      gameVersion: '105.1.1-2550',
      engineVersion: '2026.07.04',
      mapName: 'supreme_isthmus_v2.1',
      windMin: 0,
      windMax: 15,
      tidal: 12,
      // BAR: windRiskLookup[0][15] == "11.8" (a string, like the average wind lookup)
      windFunctions: { windRisk: '11.8' }
    });
    const harness = await createWidgetHarness(scenario);
    try {
      harness.callin('Initialize');

      const raw = harness.fs.readJson('stratcom/widget.json');
      expect(raw).not.toBeNull();

      const heartbeat = WidgetHeartbeatSchema.parse(raw);
      expect(heartbeat.protocol).toBe(1);
      expect(heartbeat.widgetVersion).toBe('3.0.6');
      expect(heartbeat.gameVersion).toBe('105.1.1-2550');
      expect(heartbeat.engineVersion).toBe('2026.07.04');
      expect(heartbeat.sessionId).toBeNull();
      expect(heartbeat.mode).toBe('pregame');
      expect(heartbeat.canControlUnits).toBe(true);
      expect(heartbeat.frame).toBe(0);
      expect(heartbeat.gameStarted).toBe(false);
      expect(heartbeat.gameOver).toBe(false);
      expect(heartbeat.map.scriptName).toBe('supreme_isthmus_v2.1');
      expect(heartbeat.map.windMin).toBe(0);
      expect(heartbeat.map.windMax).toBe(15);
      expect(heartbeat.map.tidal).toBe(12);
      expect(heartbeat.map.avgWind).toBe(7.5);
      expect(heartbeat.map.windRisk).toBe(11.8);
      expect(heartbeat.perf).toBeNull();
      expect(heartbeat.degraded).toBe(false);
      expect(typeof heartbeat.heartbeat).toBe('number');
    } finally {
      harness.close();
    }
  });

  it('detects all four modes correctly: pregame, player, spectator, replay', async () => {
    // 1. Pregame -> Player
    const playerHarness = await createWidgetHarness(createScenario({ isReplay: false, isSpectating: false }));
    try {
      playerHarness.callin('Initialize');
      let hb = WidgetHeartbeatSchema.parse(playerHarness.fs.readJson('stratcom/widget.json'));
      expect(hb.mode).toBe('pregame');
      expect(hb.gameStarted).toBe(false);

      playerHarness.callin('GameStart');
      hb = WidgetHeartbeatSchema.parse(playerHarness.fs.readJson('stratcom/widget.json'));
      expect(hb.mode).toBe('player');
      expect(hb.gameStarted).toBe(true);
    } finally {
      playerHarness.close();
    }

    // 2. Spectator
    const specHarness = await createWidgetHarness(createScenario({ isReplay: false, isSpectating: true }));
    try {
      specHarness.callin('Initialize');
      const hb = WidgetHeartbeatSchema.parse(specHarness.fs.readJson('stratcom/widget.json'));
      expect(hb.mode).toBe('spectator');
    } finally {
      specHarness.close();
    }

    // 3. Replay
    const replayHarness = await createWidgetHarness(createScenario({ isReplay: true, isSpectating: false }));
    try {
      replayHarness.callin('Initialize');
      const hb = WidgetHeartbeatSchema.parse(replayHarness.fs.readJson('stratcom/widget.json'));
      expect(hb.mode).toBe('replay');
    } finally {
      replayHarness.close();
    }
  });

  it('reflects canControlUnits true and false accurately in heartbeat', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.callin('Initialize');
      let hb = WidgetHeartbeatSchema.parse(harness.fs.readJson('stratcom/widget.json'));
      expect(hb.canControlUnits).toBe(true);

      // Simulate restricted lobby (allowunitcontrolwidgets = false)
      harness.engine.doStringSync('widget.canControlUnits = false');
      harness.callin('Update', 1.0);
      hb = WidgetHeartbeatSchema.parse(harness.fs.readJson('stratcom/widget.json'));
      expect(hb.canControlUnits).toBe(false);
    } finally {
      harness.close();
    }
  });

  it('writes probe.json with the expected structure and verified API list (05 §2)', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.callin('Initialize');
      const probe = harness.fs.readJson<{
        protocol: number;
        widgetVersion: string;
        apis: Record<string, string>;
        types: Record<string, string>;
        engineVersion: string;
        gameVersion: string;
        canControlUnits: boolean;
        windFunctions: boolean;
      }>('stratcom/probe.json');

      expect(probe).not.toBeNull();
      expect(probe!.protocol).toBe(1);
      expect(probe!.widgetVersion).toBe('3.0.6');
      expect(probe!.types.Game).toBe('table');
      expect(probe!.types.Engine).toBe('table');
      expect(probe!.canControlUnits).toBe(true);
      expect(probe!.windFunctions).toBe(true);

      // Verify all required API names from 05 §2 are probed
      const requiredApis = [
        'Spring.GetTeamRulesParam',
        'Spring.GetTeamUnitsCounts',
        'Spring.GetUnitIsBeingBuilt',
        'Spring.GetUnitIsBuilding',
        'Spring.GetUnitCurrentBuildPower',
        'Spring.GetUnitCommandCount',
        'Spring.GetFactoryCommands',
        'Spring.GetVisibleUnits',
        'Spring.SetActiveCommand',
        'Spring.GetActiveCmdDescs',
        'widgetHandler.actionHandler:AddAction',
        "WG['fonts']"
      ];

      for (const api of requiredApis) {
        expect(probe!.apis).toHaveProperty(api);
        expect(typeof probe!.apis[api]).toBe('string');
      }
    } finally {
      harness.close();
    }
  });

  it('updates heartbeat on Update (pregame), GameFrame (in-game), and GameOver', async () => {
    const harness = await createWidgetHarness();
    try {
      harness.callin('Initialize');
      let hb = WidgetHeartbeatSchema.parse(harness.fs.readJson('stratcom/widget.json'));
      expect(hb.frame).toBe(0);
      expect(hb.gameStarted).toBe(false);
      expect(hb.gameOver).toBe(false);

      // Pre-game update ticker (1s)
      harness.callin('Update', 1.0);
      expect(harness.fs.exists('stratcom/widget.json')).toBe(true);

      // GameStart & GameFrame
      harness.callin('GameStart');
      harness.setFrame(30);
      harness.callin('GameFrame', 30);
      hb = WidgetHeartbeatSchema.parse(harness.fs.readJson('stratcom/widget.json'));
      expect(hb.frame).toBe(30);
      expect(hb.gameStarted).toBe(true);
      expect(hb.gameOver).toBe(false);

      // GameOver
      harness.callin('GameOver', [0]);
      hb = WidgetHeartbeatSchema.parse(harness.fs.readJson('stratcom/widget.json'));
      expect(hb.gameOver).toBe(true);
    } finally {
      harness.close();
    }
  });

  it('persists and restores HUD configuration via GetConfigData and SetConfigData', async () => {
    const harness = await createWidgetHarness();
    try {
      const initialConfig = harness.callin('GetConfigData') as {
        hudX?: number;
        hudY?: number;
        hudVisible: boolean;
        hudScale: number;
      };
      expect(initialConfig.hudVisible).toBe(true);
      expect(initialConfig.hudScale).toBe(1.0);

      harness.callin('SetConfigData', {
        hudX: 450,
        hudY: 200,
        hudVisible: false,
        hudScale: 1.5
      });

      const updatedConfig = harness.callin('GetConfigData') as {
        hudX?: number;
        hudY?: number;
        hudVisible: boolean;
        hudScale: number;
      };
      expect(updatedConfig.hudX).toBe(450);
      expect(updatedConfig.hudY).toBe(200);
      expect(updatedConfig.hudVisible).toBe(false);
      expect(updatedConfig.hudScale).toBe(1.5);
    } finally {
      harness.close();
    }
  });
});
