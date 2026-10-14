import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  SessionFileDoc,
  StateDoc,
  WidgetEvent,
  WidgetHeartbeat
} from '../../core/schemas/protocol';
import { FileBridge } from './file-bridge';

describe('FileBridge (T05.3)', () => {
  let tempBaseDir: string;
  let stratcomDir: string;
  let bridge: FileBridge;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-bridge-test-'));
    stratcomDir = path.join(tempBaseDir, 'stratcom');
    fs.mkdirSync(stratcomDir, { recursive: true });

    bridge = new FileBridge({
      dataDir: tempBaseDir,
      pollIntervalMs: 50,
      bundledVersion: '3.0.1',
      widgetInstalled: true,
      installedVersion: '3.0.1'
    });
  });

  afterEach(() => {
    bridge.stop();
    if (fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  it('follows a scripted sequence of writes emitting events in order', () => {
    const heartbeats: WidgetHeartbeat[] = [];
    const states: StateDoc[] = [];
    const eventBatches: WidgetEvent[][] = [];
    const sessions: SessionFileDoc[] = [];

    bridge.on('heartbeat', (hb) => heartbeats.push(hb));
    bridge.on('state', (st) => states.push(st));
    bridge.on('events', (ev) => eventBatches.push(ev));
    bridge.on('session', (ss) => sessions.push(ss));

    bridge.start();

    // 1. Pregame heartbeat
    const pregameHb: WidgetHeartbeat = {
      protocol: 1,
      widgetVersion: '3.0.1',
      engineVersion: '2026.07.04',
      gameVersion: 'Beyond All Reason test-31479-433a460',
      sessionId: null,
      mode: 'pregame',
      canControlUnits: true,
      frame: 0,
      gameStarted: false,
      gameOver: false,
      map: {
        scriptName: 'Supreme Isthmus',
        windMin: 4,
        windMax: 20,
        avgWind: 12,
        windRisk: null,
        tidal: 15
      },
      perf: null,
      degraded: false,
      heartbeat: 1700000000
    };
    fs.writeFileSync(path.join(stratcomDir, 'widget.json'), JSON.stringify(pregameHb), 'utf-8');
    bridge.poll();

    expect(heartbeats.length).toBe(1);
    expect(heartbeats[0]!.mode).toBe('pregame');
    expect(bridge.getHealthInputs().lastHeartbeat?.gameStarted).toBe(false);

    // 2. Session created
    const sessionDoc: SessionFileDoc = {
      protocol: 1,
      kind: 'session',
      sessionId: '20261002-120000-abcd',
      mode: 'player',
      gameVersion: 'Beyond All Reason test-31479-433a460',
      engineVersion: '2026.07.04',
      map: { scriptName: 'Supreme Isthmus', windMin: 4, windMax: 20, tidal: 15 },
      teams: [
        {
          teamId: 0,
          allyTeamId: 0,
          playerName: 'Player',
          factionId: 'armada',
          isAI: false,
          isMe: true
        }
      ],
      start: { metal: 1000, energy: 1000, metalStorage: 1000, energyStorage: 1000 }
    };
    fs.writeFileSync(
      path.join(stratcomDir, 'session-20261002-120000-abcd.json'),
      JSON.stringify(sessionDoc),
      'utf-8'
    );
    bridge.poll();

    expect(sessions.length).toBe(1);
    expect(sessions[0]!.sessionId).toBe('20261002-120000-abcd');

    // 3. Game start heartbeat
    const liveHb: WidgetHeartbeat = {
      ...pregameHb,
      sessionId: '20261002-120000-abcd',
      mode: 'player',
      gameStarted: true,
      frame: 30
    };
    fs.writeFileSync(path.join(stratcomDir, 'widget.json'), JSON.stringify(liveHb), 'utf-8');
    bridge.poll();

    expect(heartbeats.length).toBe(2);
    expect(heartbeats[1]!.gameStarted).toBe(true);

    // 4. State updates (seq 1, seq 2)
    const stateDoc1: StateDoc = {
      protocol: 1,
      sessionId: '20261002-120000-abcd',
      seq: 1,
      frame: 30,
      gameSeconds: 1,
      me: {
        teamId: 0,
        allyTeamId: 0,
        factionId: 'armada',
        startUnitId: 'armcom',
        playerName: 'Player'
      },
      wind: { current: 10 },
      res: {
        metal: { current: 1000, storage: 1000, pull: 0, income: 2, expense: 0, share: 0, sent: 0, received: 0 },
        energy: { current: 1000, storage: 1000, pull: 0, income: 30, expense: 0, share: 0, sent: 0, received: 0 }
      },
      counts: {},
      builders: { total: 0, idle: 0 },
      factories: { total: 0, idle: 0 },
      commander: { alive: true, idle: false },
      bp: { total: 300, active: 300 },
      enemies: {}
    };
    fs.writeFileSync(path.join(stratcomDir, 'state.json'), JSON.stringify(stateDoc1), 'utf-8');
    bridge.poll();

    expect(states.length).toBe(1);
    expect(states[0]!.seq).toBe(1);

    const stateDoc2: StateDoc = {
      ...stateDoc1,
      seq: 2,
      frame: 60,
      gameSeconds: 2
    };
    fs.writeFileSync(path.join(stratcomDir, 'state.json'), JSON.stringify(stateDoc2), 'utf-8');
    bridge.poll();

    expect(states.length).toBe(2);
    expect(states[1]!.seq).toBe(2);

    // 5. Events tailing with partial line handling
    const eventsPath = path.join(stratcomDir, 'events-20261002-120000-abcd.ndjson');

    // Write complete line 1 + incomplete line 2 (no trailing newline)
    const initialEventsContent =
      '{"f":0,"e":"gamestart"}\n{"f":30,"e":"created","u":100,"d":"armmex","tm":0,"b":1,"bd":"armcom"';
    fs.writeFileSync(eventsPath, initialEventsContent, 'utf-8');
    bridge.poll();

    expect(eventBatches.length).toBe(1);
    expect(eventBatches[0]!.length).toBe(1);
    expect(eventBatches[0]![0]!.e).toBe('gamestart');

    // Complete line 2 and append line 3 (gameover)
    fs.appendFileSync(eventsPath, '}\n{"f":500,"e":"gameover","w":[0]}\n', 'utf-8');
    bridge.poll();

    expect(eventBatches.length).toBe(2);
    expect(eventBatches[1]!.length).toBe(2);
    expect(eventBatches[1]![0]!.e).toBe('created');
    expect(eventBatches[1]![1]!.e).toBe('gameover');
  });

  it('ignores partial / corrupted JSON under atomic read rule', () => {
    const states: StateDoc[] = [];
    bridge.on('state', (st) => states.push(st));
    bridge.start();

    // Write corrupt state.json
    fs.writeFileSync(path.join(stratcomDir, 'state.json'), '{"protocol":1,"frame":', 'utf-8');
    bridge.poll();

    expect(states.length).toBe(0);
  });

  it('flags protocol mismatch when protocol is not 1', () => {
    bridge.start();

    const badProtocolHb = {
      protocol: 2,
      widgetVersion: '4.0.0'
    };
    fs.writeFileSync(path.join(stratcomDir, 'widget.json'), JSON.stringify(badProtocolHb), 'utf-8');
    bridge.poll();

    expect(bridge.getHealthInputs().protocolMismatch).toBe(true);
  });

  it('detects widgets-disabled when _script.txt changes and infolog disallows widgets', () => {
    let fakeNow = 1000000;
    const bridgeWithTimer = new FileBridge({
      dataDir: tempBaseDir,
      nowProvider: () => fakeNow
    });

    const scriptPath = path.join(tempBaseDir, '_script.txt');
    fs.writeFileSync(scriptPath, 'game start 1', 'utf-8');
    bridgeWithTimer.poll();

    // Trigger script modification. BAR rewrites the file at the next game start, so its mtime moves on;
    // two writes this close can share one mtime tick (they did on GitHub's runner), so set it explicitly.
    fakeNow += 1000;
    fs.writeFileSync(scriptPath, 'game start 2', 'utf-8');
    const nextStart = new Date(fs.statSync(scriptPath).mtimeMs + 60_000);
    fs.utimesSync(scriptPath, nextStart, nextStart);
    bridgeWithTimer.poll();

    // Advance 21 seconds (> 20 s)
    fakeNow += 21000;

    // Create infolog with disallowed widgets
    const infologPath = path.join(tempBaseDir, 'infolog.txt');
    fs.writeFileSync(
      infologPath,
      'Loading lobby...\nLuaUI: Disallowing User Widgets\nDone.\n',
      'utf-8'
    );
    bridgeWithTimer.poll();

    expect(bridgeWithTimer.getHealthInputs().widgetsDisabled).toBe(true);
  });
});
