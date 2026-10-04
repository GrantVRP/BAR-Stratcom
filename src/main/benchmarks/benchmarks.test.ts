import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bandAt } from '../../core/benchmarks';
import type { BuildPlan } from '../../core/schemas/plans';
import type { CoachState } from '../../core/schemas/coach';
import type { SessionFileDoc, StateDoc } from '../../core/schemas/protocol';
import { CoachRunner } from '../coach/runner';
import type { BridgeEventMap, BridgeEventName, BridgeSource } from '../game/source';
import { loadRegistry } from '../registry/loader';
import { loadBenchmark, loadBenchmarkForTeams } from './loader';

class FakeSource extends EventEmitter implements BridgeSource {
  constructor(private readonly sessions: SessionFileDoc[] = []) {
    super();
  }
  start(): void {}
  stop(): void {}
  override on<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }
  override off<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
  getSession(sessionId: string): SessionFileDoc | null {
    return this.sessions.find((s) => s.sessionId === sessionId) ?? null;
  }
}

// A Cortex player in a duel, shaped like a widget session file.
const session: SessionFileDoc = {
  protocol: 1,
  kind: 'session',
  sessionId: '20261004-120000-abcd',
  mode: 'player',
  gameVersion: 'test-31479-433a460',
  engineVersion: '2026.07.04',
  map: { scriptName: 'Isidis crack 1.1', windMin: 2, windMax: 20, tidal: 15 },
  teams: [
    { teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'cortex', isAI: false, isMe: true },
    { teamId: 1, allyTeamId: 1, playerName: 'Opponent', factionId: 'armada', isAI: false, isMe: false }
  ],
  start: null
};

const plan: BuildPlan = {
  schemaVersion: 1,
  id: 'bench-test',
  title: 'Bench test',
  factionId: 'cortex',
  gameVersion: 'test-31479-433a460',
  modes: ['1v1'],
  role: 'any',
  skill: 'intermediate',
  opening: 'bot',
  energyStyle: 'wind',
  source: { kind: 'manual', createdAt: '2026-10-04T00:00:00.000Z' },
  steps: [{ id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'cormex', count: 1, targetTime: 5 }]
};

function stateAt(gameSeconds: number, metalIncome: number): StateDoc {
  const pool = (income: number) => ({ current: 500, storage: 1000, pull: 0, income, expense: 0, share: 1, sent: 0, received: 0 });
  return {
    protocol: 1,
    sessionId: session.sessionId,
    seq: gameSeconds,
    frame: gameSeconds * 30,
    gameSeconds,
    me: { teamId: 0, allyTeamId: 0, factionId: 'cortex', startUnitId: 'corcom', playerName: 'Player' },
    wind: { current: 12 },
    res: { metal: pool(metalIncome), energy: pool(400) },
    counts: {},
    builders: { total: 1, idle: 0 },
    factories: { total: 1, idle: 0 },
    commander: { alive: true, idle: false },
    bp: { total: 1000, active: 1000 },
    enemies: {}
  };
}

describe('benchmark loading (T08.4)', () => {
  it('loads the committed benchmark for a faction + mode', () => {
    const bench = loadBenchmark({ factionId: 'cortex', mode: '1v1' });
    expect(bench).not.toBeNull();
    expect(bench).toMatchObject({ factionId: 'cortex', mode: '1v1' });
    expect(bench!.sampleCount).toBeGreaterThanOrEqual(5);
    expect(loadBenchmarkForTeams(session.teams)).toBe(bench);
  });

  it('has none for an unknown faction, a spectator, or a broken file', () => {
    expect(loadBenchmark({ factionId: 'legion', mode: '1v1' })).toBeNull();
    expect(loadBenchmarkForTeams(session.teams.map((t) => ({ ...t, isMe: false })))).toBeNull();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-'));
    try {
      fs.mkdirSync(path.join(dir, 'benchmarks'));
      fs.writeFileSync(path.join(dir, 'benchmarks', 'armada-1v1.json'), '{"schemaVersion":1}');
      fs.writeFileSync(path.join(dir, 'benchmarks', 'cortex-1v1.json'), fs.readFileSync(path.join(process.cwd(), 'data/benchmarks/armada-1v1.json')));
      expect(loadBenchmark({ factionId: 'armada', mode: '1v1' }, dir)).toBeNull();
      // content for another faction under this name is rejected
      expect(loadBenchmark({ factionId: 'cortex', mode: '1v1' }, dir)).toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('BENCHMARK_LOW with the real pro benchmark (T08.4)', () => {
  const p25At300 = bandAt(loadBenchmark({ factionId: 'cortex', mode: '1v1' })!, 'metalIncome', 300)!.p25;

  afterEach(() => {
    vi.useRealTimers();
  });

  async function alertsAfter(state: StateDoc, opts: { viaHeartbeat: boolean; loader: boolean }): Promise<string[]> {
    vi.useFakeTimers();
    const source = new FakeSource([session]);
    const runner = new CoachRunner();
    let last: CoachState | null = null;
    await runner.start({
      plan,
      mode: 'live',
      source,
      registry: loadRegistry(),
      stratcomDir: null,
      ...(opts.loader ? { benchmarkLoader: loadBenchmarkForTeams } : {}),
      onUpdate: (s) => {
        last = s;
      }
    });
    if (opts.viaHeartbeat) source.emit('heartbeat', { sessionId: session.sessionId });
    else source.emit('session', session);
    source.emit('state', state);
    await vi.advanceTimersByTimeAsync(500);
    await runner.stop();
    return (last as CoachState | null)?.alerts.map((a) => a.id) ?? [];
  }

  it('fires at 5:00 when metal income is below the Cortex 1v1 pro p25 (session file seen)', async () => {
    expect(await alertsAfter(stateAt(300, p25At300 - 1), { viaHeartbeat: false, loader: true })).toContain('BENCHMARK_LOW');
  });

  it('finds the benchmark when coaching starts mid-game (heartbeat only)', async () => {
    expect(await alertsAfter(stateAt(300, p25At300 - 1), { viaHeartbeat: true, loader: true })).toContain('BENCHMARK_LOW');
  });

  it('stays quiet at pro pace, past the recorded series, or without a benchmark', async () => {
    expect(await alertsAfter(stateAt(300, p25At300 + 1), { viaHeartbeat: false, loader: true })).not.toContain('BENCHMARK_LOW');
    expect(await alertsAfter(stateAt(900, 0.5), { viaHeartbeat: false, loader: true })).not.toContain('BENCHMARK_LOW');
    expect(await alertsAfter(stateAt(300, p25At300 - 1), { viaHeartbeat: false, loader: false })).not.toContain('BENCHMARK_LOW');
  });
});
