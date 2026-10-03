import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ipcClient, setIpcClientOverride } from './ipc-client';

describe('ipcClient', () => {
  beforeEach(() => {
    setIpcClientOverride(null);
  });

  afterEach(() => {
    setIpcClientOverride(null);
  });

  it('returns NO_IPC envelope when window.stratcom is missing', async () => {
    // window.stratcom is undefined in node/default happy-dom unless set
    const original = (window as unknown as { stratcom?: unknown }).stratcom;
    try {
      delete (window as unknown as { stratcom?: unknown }).stratcom;
      const res = await ipcClient.invoke('app:getInfo');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe('NO_IPC');
      }
    } finally {
      (window as unknown as { stratcom?: unknown }).stratcom = original;
    }
  });

  it('delegates to window.stratcom.invoke and returns success envelope', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      ok: true,
      data: { version: '3.0.0-dev.0', platform: 'win32' }
    });
    (window as unknown as { stratcom: { invoke: typeof mockInvoke; on: unknown } }).stratcom = {
      invoke: mockInvoke,
      on: vi.fn()
    };

    const res = await ipcClient.invoke('app:getInfo');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.version).toBe('3.0.0-dev.0');
    }
    expect(mockInvoke).toHaveBeenCalledWith('app:getInfo', undefined);
  });

  it('handles bridge exceptions gracefully and returns INVOKE_FAILED envelope', async () => {
    const mockInvoke = vi.fn().mockRejectedValue(new Error('Connection lost'));
    (window as unknown as { stratcom: { invoke: typeof mockInvoke; on: unknown } }).stratcom = {
      invoke: mockInvoke,
      on: vi.fn()
    };

    const res = await ipcClient.invoke('app:getInfo');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('INVOKE_FAILED');
      expect(res.message).toBe('Connection lost');
    }
  });

  it('subscribes via window.stratcom.on and returns unsubscribe function', () => {
    const unsub = vi.fn();
    const mockOn = vi.fn().mockReturnValue(unsub);
    (window as unknown as { stratcom: { invoke: unknown; on: typeof mockOn } }).stratcom = {
      invoke: vi.fn(),
      on: mockOn
    };

    const cb = vi.fn();
    const cleanup = ipcClient.on('live:health', cb);
    expect(mockOn).toHaveBeenCalledWith('live:health', cb);
    cleanup();
    expect(unsub).toHaveBeenCalled();
  });

  it('supports setIpcClientOverride for mock testing', async () => {
    const mockOverride = {
      invoke: vi.fn().mockResolvedValue({
        ok: true,
        data: { ok: true }
      }),
      on: vi.fn().mockReturnValue(() => {}),
      isAvailable: vi.fn().mockReturnValue(true)
    };

    setIpcClientOverride(mockOverride);
    const res = await ipcClient.invoke('coach:stop');
    expect(res.ok).toBe(true);
    expect(mockOverride.invoke).toHaveBeenCalledWith('coach:stop', undefined);
  });
});
