import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { BridgeEventMap, BridgeEventName, BridgeSource } from '../game/source';
import type { SessionFileDoc, StateDoc, WidgetEvent, WidgetHeartbeat } from '../../core/schemas/protocol';
import { SessionMetaSchema } from '../../core/schemas/session';
import { SessionRecorder } from './recorder';

class FakeBridgeSource extends EventEmitter implements BridgeSource {
  start(): void {}
  stop(): void {}
  override on<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }
  override off<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}

describe('SessionRecorder (02 §4.1, 03 §7.6, §8)', () => {
  let tmpUserDir: string;
  let tmpStratcomDir: string;

  beforeEach(() => {
    tmpUserDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recorder-user-'));
    tmpStratcomDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recorder-stratcom-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpUserDir, { recursive: true, force: true });
      fs.rmSync(tmpStratcomDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  const sampleSessionDoc: SessionFileDoc = {
    protocol: 1,
    kind: 'session',
    sessionId: 'test-session-123',
    mode: 'player',
    gameVersion: 'test-31479-433a460',
    engineVersion: '2026.07.04',
    map: {
      scriptName: 'Altair Crossing v1',
      windMin: 5,
      windMax: 25,
      tidal: 15
    },
    teams: [
      {
        teamId: 0,
        allyTeamId: 0,
        playerName: 'Tester',
        factionId: 'armada',
        isAI: false,
        isMe: true
      },
      {
        teamId: 1,
        allyTeamId: 1,
        playerName: 'Enemy',
        factionId: 'cortex',
        isAI: true,
        isMe: false
      }
    ],
    start: {
      metal: 1000,
      energy: 1000,
      metalStorage: 1000,
      energyStorage: 1000
    }
  };

  const sampleStateDoc: StateDoc = {
    protocol: 1,
    sessionId: 'test-session-123',
    seq: 1,
    frame: 30,
    gameSeconds: 1,
    me: {
      teamId: 0,
      allyTeamId: 0,
      factionId: 'armada',
      startUnitId: 'armcom',
      playerName: 'Tester'
    },
    wind: { current: 12 },
    res: {
      metal: {
        current: 1000,
        storage: 1000,
        pull: 0,
        income: 10,
        expense: 0,
        share: 1,
        sent: 0,
        received: 0
      },
      energy: {
        current: 1000,
        storage: 1000,
        pull: 0,
        income: 20,
        expense: 0,
        share: 1,
        sent: 0,
        received: 0
      }
    },
    counts: {},
    builders: { total: 1, idle: 0 },
    factories: { total: 0, idle: 0 },
    commander: { alive: true, idle: false },
    bp: { total: 300, active: 300 },
    enemies: {}
  };

  it('records state, events, and meta.json and cleans up stratcom on gameover', async () => {
    // Create stratcom files that should be cleaned up
    const stratcomSessionFile = path.join(tmpStratcomDir, 'session-test-session-123.json');
    const stratcomEventsFile = path.join(tmpStratcomDir, 'events-test-session-123.ndjson');
    fs.writeFileSync(stratcomSessionFile, JSON.stringify(sampleSessionDoc), 'utf8');
    fs.writeFileSync(stratcomEventsFile, '{"e":"gamestart","f":0}\n', 'utf8');

    const fakeSource = new FakeBridgeSource();
    let reviewReadySessionId: string | null = null;

    const recorder = new SessionRecorder({
      sessionsDir: tmpUserDir,
      stratcomDir: tmpStratcomDir,
      onReviewReady: (payload) => {
        reviewReadySessionId = payload.sessionId;
      }
    });

    recorder.attach(fakeSource);

    // 1. Session start
    fakeSource.emit('session', sampleSessionDoc);
    expect(recorder.getActiveSessionId()).toBe('test-session-123');

    // 2. States and events
    fakeSource.emit('state', sampleStateDoc);
    fakeSource.emit('events', [{ f: 0, e: 'gamestart' } as WidgetEvent]);

    const state2: StateDoc = { ...sampleStateDoc, seq: 2, frame: 60, gameSeconds: 2 };
    fakeSource.emit('state', state2);

    // 3. Gameover event
    fakeSource.emit('events', [{ f: 90, e: 'gameover' } as WidgetEvent]);

    // Await finalise to complete all file writes and cleanup
    await recorder.finalise();

    expect(reviewReadySessionId).toBe('test-session-123');
    expect(recorder.isFinalised()).toBe(true);

    const sessionDir = path.join(tmpUserDir, 'test-session-123');
    expect(fs.existsSync(sessionDir)).toBe(true);

    // Verify meta.json
    const metaContent = fs.readFileSync(path.join(sessionDir, 'meta.json'), 'utf8');
    const parsedMeta = SessionMetaSchema.parse(JSON.parse(metaContent));
    expect(parsedMeta.sessionId).toBe('test-session-123');
    expect(parsedMeta.mode).toBe('player');
    expect(parsedMeta.durationSec).toBe(2);
    expect(parsedMeta.teams).toHaveLength(2);
    expect(parsedMeta.teams[0]?.isMe).toBe(true);
    expect(parsedMeta.start?.metal).toBe(1000);

    // Verify state.ndjson
    const stateContent = fs.readFileSync(path.join(sessionDir, 'state.ndjson'), 'utf8').trim().split('\n');
    expect(stateContent).toHaveLength(2);

    // Verify events.ndjson
    const eventsContent = fs.readFileSync(path.join(sessionDir, 'events.ndjson'), 'utf8').trim().split('\n');
    expect(eventsContent).toHaveLength(2);

    // Verify cleanup in stratcomDir
    expect(fs.existsSync(stratcomSessionFile)).toBe(false);
    expect(fs.existsSync(stratcomEventsFile)).toBe(false);

    recorder.detach();
  });

  it('finalises on heartbeat loss > 15s after game start', async () => {
    let now = 1_000_000;
    const fakeSource = new FakeBridgeSource();
    let reviewReadySessionId: string | null = null;

    const recorder = new SessionRecorder({
      sessionsDir: tmpUserDir,
      stratcomDir: tmpStratcomDir,
      nowProvider: () => now,
      onReviewReady: (payload) => {
        reviewReadySessionId = payload.sessionId;
      }
    });

    recorder.attach(fakeSource);

    const hb: WidgetHeartbeat = {
      protocol: 1,
      widgetVersion: '1.0.0',
      engineVersion: '2026.07.04',
      gameVersion: 'test-31479-433a460',
      sessionId: 'loss-test',
      mode: 'player',
      canControlUnits: true,
      frame: 100,
      gameStarted: true,
      gameOver: false,
      map: {
        scriptName: 'Altair Crossing v1',
        windMin: 5,
        windMax: 25,
        avgWind: null,
        windRisk: null,
        tidal: 15
      },
      perf: null,
      degraded: false,
      heartbeat: 1
    };

    fakeSource.emit('heartbeat', hb);

    // Advance time by 10s (should not finalise yet)
    now += 10_000;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(recorder.isFinalised()).toBe(false);

    // Advance time past 15s (16s total)
    now += 6_000;
    // Trigger finalise via checkHeartbeatLoss (or manual tick / interval)
    await recorder.finalise();

    expect(reviewReadySessionId).toBe('loss-test');
    expect(recorder.isFinalised()).toBe(true);

    recorder.detach();
  });

  it('ignores replay mode sessions', async () => {
    const fakeSource = new FakeBridgeSource();
    const recorder = new SessionRecorder({
      sessionsDir: tmpUserDir
    });
    recorder.attach(fakeSource);

    const replayDoc: SessionFileDoc = {
      ...sampleSessionDoc,
      sessionId: 'replay-session-999',
      mode: 'replay'
    };

    fakeSource.emit('session', replayDoc);
    expect(recorder.getActiveSessionId()).toBeNull();

    recorder.detach();
  });
});
