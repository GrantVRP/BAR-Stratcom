import { describe, expect, it, vi } from 'vitest';
import { ipcMain } from 'electron';
import { registerIntelHandlers } from './handlers';
import type { IntelService } from './service';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  app: {
    getPath: () => {
      throw new Error('not in electron');
    }
  }
}));

type Handler = (event: unknown, req: unknown) => Promise<{ ok: boolean; code?: string; data?: unknown }>;

describe('intel IPC handlers', () => {
  it('registers the intel channels and validates their input', async () => {
    const handlers: Record<string, Handler> = {};
    vi.mocked(ipcMain.handle).mockImplementation(((channel: string, fn: Handler) => {
      handlers[channel] = fn;
    }) as never);
    const cached = { data: [], fetchedAt: '2026-10-04T00:00:00.000Z', stale: false };
    const service = {
      battles: vi.fn().mockResolvedValue(cached),
      leaderboard: vi.fn(),
      replays: vi.fn().mockResolvedValue(cached),
      replay: vi.fn(),
      balanceChanges: vi.fn().mockResolvedValue(cached)
    };

    registerIntelHandlers(service as unknown as IntelService);

    expect(Object.keys(handlers).sort()).toEqual([
      'intel:balance',
      'intel:battles',
      'intel:leaderboard',
      'intel:replay',
      'intel:replays'
    ]);
    expect(await handlers['intel:battles']!(null, undefined)).toEqual({ ok: true, data: cached });
    await handlers['intel:replays']!(null, undefined);
    expect(service.replays).toHaveBeenCalledWith({});
    await handlers['intel:balance']!(null, undefined);
    expect(service.balanceChanges).toHaveBeenCalledWith(1);

    const bad = await handlers['intel:replay']!(null, { id: '../../etc' });
    expect(bad).toMatchObject({ ok: false, code: 'E_BAD_REQUEST' });
    expect(service.replay).not.toHaveBeenCalled();
  });

  it('builds a memory-only service outside Electron', () => {
    expect(() => registerIntelHandlers()).not.toThrow();
  });
});
