import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ipcMain } from 'electron';
import { SettingsStore } from '../settings/store';
import { registerAiHandlers } from './handlers';
import { KeyStore, type SafeStorageLike } from './keys';
import type { AnthropicClientLike } from './providers/anthropic';
import { validDraft } from './__test__/fakes';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  app: { isPackaged: false, getPath: () => os.tmpdir() },
  safeStorage: {},
  BrowserWindow: { getAllWindows: () => [] }
}));

type Handler = (event: unknown, req?: unknown) => Promise<{ ok: boolean; data?: unknown; message?: string }>;
const registered: Record<string, Handler> = {};
vi.mocked(ipcMain.handle).mockImplementation(((channel: string, fn: Handler) => {
  registered[channel] = fn;
}) as never);

const storage: SafeStorageLike = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from(`x${s}`),
  decryptString: (b) => b.toString().slice(1)
};

async function* none(): AsyncGenerator<never> {}

describe('AI IPC handlers', () => {
  let dir: string;
  let release: () => void = () => undefined;
  let inFlight = false;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-ai-ipc-'));
    const keys = new KeyStore(() => dir, storage);
    const settings = new SettingsStore(dir);
    settings.updateSettings({ ai: { provider: 'anthropic', model: 'claude-opus-5-5', baseUrl: null, anthropicFallbacks: false } });
    // the first draft call waits until the test releases it; later calls answer at once
    let calls = 0;
    inFlight = false;
    const anthropic = (): AnthropicClientLike => ({
      beta: {
        messages: {
          create: async () => {
            calls += 1;
            if (calls === 1) {
              inFlight = true;
              await new Promise<void>((resolve) => (release = resolve));
            }
            return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(validDraft()) }] };
          }
        }
      },
      models: { list: () => none() }
    });
    registerAiHandlers({ keys, settings, clients: { anthropic }, library: () => [], progress: () => undefined });
  });
  afterEach(() => {
    release();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('registers every AI channel', () => {
    for (const channel of ['ai:listProviders', 'ai:setKey', 'ai:clearKey', 'ai:hasKey', 'ai:listModels', 'ai:test', 'ai:draft', 'ai:cancel']) {
      expect(registered[channel], channel).toBeTypeOf('function');
    }
  });

  it('stores keys without ever returning them', async () => {
    expect((await registered['ai:setKey']!({}, { provider: 'anthropic', key: 'sk-ant-test-123456' })).ok).toBe(true);
    expect((await registered['ai:hasKey']!({}, { provider: 'anthropic' })).data).toBe(true);
    const providers = (await registered['ai:listProviders']!({})).data as Array<Record<string, unknown>>;
    expect(providers.find((p) => p.id === 'anthropic')).toMatchObject({ hasKey: true });
    expect(JSON.stringify(providers)).not.toContain('sk-ant');
    expect((await registered['ai:test']!({}, { provider: 'anthropic' })).data).toEqual({ ok: true, models: 0 });
    expect((await registered['ai:listModels']!({}, { provider: 'anthropic' })).data).toEqual([]);
    await registered['ai:clearKey']!({}, { provider: 'anthropic' });
    expect((await registered['ai:hasKey']!({}, { provider: 'anthropic' })).data).toBe(false);
  });

  it('cancels a running draft, then drafts again', async () => {
    await registered['ai:setKey']!({}, { provider: 'anthropic', key: 'sk-ant-test-123456' });
    const intent = { factionId: 'armada', mode: '1v1', role: 'front', opening: 'bot', skill: 'beginner' };
    const first = registered['ai:draft']!({}, intent);
    await vi.waitFor(() => expect(inFlight).toBe(true));
    expect((await registered['ai:cancel']!({})).data).toEqual({ cancelled: true });
    expect(await first).toMatchObject({ ok: false, message: 'Cancelled' });
    expect((await registered['ai:cancel']!({})).data).toEqual({ cancelled: false });

    const second = await registered['ai:draft']!({}, intent);
    expect(second.ok).toBe(true);
    expect(second.data).toMatchObject({ rounds: 1, provider: 'anthropic', model: 'claude-opus-5-5' });
    expect((await registered['ai:draft']!({}, { ...intent, factionId: 'Armada!' })).ok).toBe(false);
  });
});
