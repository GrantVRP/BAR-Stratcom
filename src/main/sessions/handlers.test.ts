import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import { registerSessionHandlers } from './handlers';
import type { SessionStore } from './store';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

describe('session IPC handlers', () => {
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

  it('registers handlers for sessions:list, sessions:get, and sessions:delete', async () => {
    const mockStore: Partial<SessionStore> = {
      list: vi.fn().mockReturnValue([
        {
          sessionId: 'test-session',
          startedAt: '2026-10-01T00:00:00Z',
          durationSec: 100,
          mapScriptName: 'Map',
          mode: 'player',
          factionId: 'cortex',
          playerName: 'Player',
          source: 'live',
          hasReport: false,
          grade: null,
          adherence: null
        }
      ]),
      get: vi.fn().mockReturnValue({
        meta: {
          schemaVersion: 1,
          sessionId: 'test-session',
          mode: 'player',
          gameVersion: 'v1',
          engineVersion: 'e1',
          mapScriptName: 'Map',
          durationSec: 100,
          startedAt: '2026-10-01T00:00:00Z',
          teams: [],
          start: null,
          source: 'live',
          anonymized: false
        },
        report: null,
        hasState: false,
        hasEvents: false
      }),
      delete: vi.fn().mockReturnValue(true)
    };

    registerSessionHandlers(mockStore as SessionStore);

    expect(ipcMain.handle).toHaveBeenCalledWith('sessions:list', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('sessions:get', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('sessions:delete', expect.any(Function));

    // Test calling sessions:list handler
    const listRes = (await registeredHandlers['sessions:list']!(null, undefined)) as { ok: boolean; data: unknown[] };
    expect(listRes.ok).toBe(true);
    expect(listRes.data).toHaveLength(1);
    expect(mockStore.list).toHaveBeenCalled();

    // Test calling sessions:get handler
    const getRes = (await registeredHandlers['sessions:get']!(null, { sessionId: 'test-session', includeSeries: true })) as {
      ok: boolean;
      data: { meta: { sessionId: string } };
    };
    expect(getRes.ok).toBe(true);
    expect(getRes.data.meta.sessionId).toBe('test-session');
    expect(mockStore.get).toHaveBeenCalledWith('test-session', { includeSeries: true });

    // Test calling sessions:delete handler
    const delRes = (await registeredHandlers['sessions:delete']!(null, { sessionId: 'test-session' })) as {
      ok: boolean;
      data: { success: boolean };
    };
    expect(delRes.ok).toBe(true);
    expect(delRes.data.success).toBe(true);
    expect(mockStore.delete).toHaveBeenCalledWith('test-session');
  });
});
