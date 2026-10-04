import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import { registerCaptureHandlers } from './handlers';
import type { SessionStore } from '../sessions/store';
import type { SessionDetail } from '../../core/schemas/session';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

const mockSession: SessionDetail = {
  meta: {
    schemaVersion: 1,
    sessionId: 'session-replay-test',
    mode: 'replay',
    gameVersion: 'test-31479-433a460',
    engineVersion: '2026.01',
    mapScriptName: 'DWorld_V4',
    durationSec: 600,
    startedAt: '2026-10-02T12:00:00.000Z',
    teams: [
      { teamId: 0, allyTeamId: 0, playerName: 'ProPlayerA', factionId: 'armada', isMe: false },
      { teamId: 1, allyTeamId: 1, playerName: 'ProPlayerB', factionId: 'cortex', isMe: false }
    ],
    start: null,
    source: 'live',
    anonymized: false
  },
  report: null,
  hasState: true,
  hasEvents: true,
  series: {
    states: [],
    events: [
      { tm: 0, e: 'created', d: 'armcom', u: 1, f: 0 },
      { tm: 0, e: 'finished', d: 'armcom', u: 1, f: 0 },
      { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armsolar', u: 10, f: 120 },
      { tm: 0, e: 'finished', d: 'armsolar', u: 10, f: 240 },
      { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armlab', u: 11, f: 300 },
      { tm: 0, e: 'finished', d: 'armlab', u: 11, f: 600 },
      { tm: 0, bd: 'armlab', b: 11, e: 'created', d: 'armpw', u: 12, f: 650 },
      { tm: 0, e: 'finished', d: 'armpw', u: 12, f: 750 }
    ] as unknown as Array<Record<string, unknown>>
  }
};

describe('capture IPC handlers (T08.2)', () => {
  const registeredHandlers: Record<string, (event: unknown, rawReq: unknown) => Promise<unknown>> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(registeredHandlers)) {
      delete registeredHandlers[key];
    }
    vi.mocked(ipcMain.handle).mockImplementation(((channel: string, fn: (event: unknown, rawReq: unknown) => Promise<unknown>) => {
      registeredHandlers[channel] = fn;
    }) as never);
  });

  it('registers handlers for capture:listPlayers and capture:toPlan', async () => {
    const get = vi.fn().mockReturnValue(mockSession);
    registerCaptureHandlers({ get } as Partial<SessionStore> as SessionStore);

    expect(ipcMain.handle).toHaveBeenCalledWith('capture:listPlayers', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('capture:toPlan', expect.any(Function));

    const listRes = (await registeredHandlers['capture:listPlayers']!(null, {
      sessionId: 'session-replay-test'
    })) as { ok: boolean; data: unknown[] };

    expect(listRes.ok).toBe(true);
    expect(get).toHaveBeenCalledWith('session-replay-test', { includeSeries: 'events' });
    expect(listRes.data).toEqual([
      { teamId: 0, name: 'ProPlayerA', faction: 'armada', allyTeam: 0, isMe: false, capturable: true, reason: null },
      {
        teamId: 1,
        name: 'ProPlayerB',
        faction: 'cortex',
        allyTeam: 1,
        isMe: false,
        capturable: false,
        reason: 'No build events recorded for this player'
      }
    ]);

    const planRes = (await registeredHandlers['capture:toPlan']!(null, {
      sessionId: 'session-replay-test',
      teamId: 0,
      replayId: 'https://bar-rts.com/replays/feedbeeffeedbeeffeedbeeffeedbeef'
    })) as {
      ok: boolean;
      data: {
        plan: { factionId: string; steps: unknown[]; source: { kind: string; replayId?: string; player: string } };
        issues: { errors: unknown[]; warnings: unknown[] };
      };
    };

    expect(planRes.ok).toBe(true);
    expect(planRes.data.plan.factionId).toBe('armada');
    expect(planRes.data.plan.steps.length).toBeGreaterThan(0);
    expect(planRes.data.plan.source).toMatchObject({
      kind: 'replay-capture',
      replayId: 'feedbeeffeedbeeffeedbeeffeedbeef',
      player: 'ProPlayerA'
    });
    expect(planRes.data.issues.errors).toEqual([]);
  });

  it('rejects a replay field that is not a replay id or link', async () => {
    registerCaptureHandlers({ get: vi.fn().mockReturnValue(mockSession) } as Partial<SessionStore> as SessionStore);
    const res = (await registeredHandlers['capture:toPlan']!(null, {
      sessionId: 'session-replay-test',
      teamId: 0,
      replayId: 'feedbeef1234'
    })) as { ok: boolean; message: string };
    expect(res.ok).toBe(false);
    expect(res.message).toBe('Not a replay id or bar-rts.com replay link');
  });

  it('throws error when session is not found or has no events', async () => {
    const mockStore: Partial<SessionStore> = {
      get: vi.fn().mockReturnValue(null)
    };

    registerCaptureHandlers(mockStore as SessionStore);

    const listRes = (await registeredHandlers['capture:listPlayers']!(null, {
      sessionId: 'non-existent'
    })) as { ok: boolean; message: string };
    expect(listRes.ok).toBe(false);
    expect(listRes.message).toContain('not found');

    const toPlanRes = (await registeredHandlers['capture:toPlan']!(null, {
      sessionId: 'non-existent',
      teamId: 0
    })) as { ok: boolean; message: string };
    expect(toPlanRes.ok).toBe(false);
    expect(toPlanRes.message).toContain('not found');
  });
});
