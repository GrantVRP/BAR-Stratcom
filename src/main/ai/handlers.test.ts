import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ipcContract } from '../../shared/ipc';
import { SettingsStore } from '../settings/store';
import { listModelsFor } from './handlers';
import { KeyStore, type SafeStorageLike } from './keys';
import type { AnthropicClientLike } from './providers/anthropic';
import type { OpenAiClientLike } from './providers/openai-compatible';

const storage: SafeStorageLike = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from(`x${s}`),
  decryptString: (b) => b.toString().slice(1)
};

async function* iterate<T>(items: T[]): AsyncGenerator<T> {
  for (const i of items) yield i;
}

describe('AI settings handlers (T08.6)', () => {
  let dir: string;
  let keys: KeyStore;
  let settings: SettingsStore;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-ai-'));
    keys = new KeyStore(() => dir, storage);
    settings = new SettingsStore(dir);
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('lists a cloud provider’s models with the stored key (also the connection test)', async () => {
    keys.setKey('anthropic', 'sk-ant-test-123456');
    let usedKey = '';
    const anthropic = (apiKey: string): AnthropicClientLike => {
      usedKey = apiKey;
      return {
        beta: { messages: { create: async () => ({ stop_reason: null, content: [] }) } },
        models: {
          list: () =>
            iterate([
              { id: 'claude-sonnet-5-5', display_name: 'Claude Sonnet 5.5' },
              { id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' }
            ])
        }
      };
    };
    const models = await listModelsFor('anthropic', undefined, { keys, settings, clients: { anthropic } });
    expect(usedKey).toBe('sk-ant-test-123456');
    expect(models.map((m) => m.id)).toEqual(['claude-opus-5-5', 'claude-sonnet-5-5']);
  });

  it('fails clearly without a key, and reaches a local server without one', async () => {
    await expect(listModelsFor('openai', undefined, { keys, settings })).rejects.toThrow('No API key saved');
    let baseURL: string | undefined;
    const openai = (o: { apiKey: string; baseURL?: string; timeout: number }): OpenAiClientLike => {
      baseURL = o.baseURL;
      return { chat: { completions: { create: async () => ({ choices: [] }) } }, models: { list: () => iterate([{ id: 'llama3.2' }]) } };
    };
    expect(await listModelsFor('ollama', 'http://127.0.0.1:11434/v1', { keys, settings, clients: { openai } })).toEqual([{ id: 'llama3.2', label: 'llama3.2' }]);
    expect(baseURL).toBe('http://127.0.0.1:11434/v1');
  });

  it('validates requests at the IPC boundary', () => {
    expect(ipcContract['ai:setKey'].request.safeParse({ provider: 'gemini', key: 'AIza-x' }).success).toBe(true);
    expect(ipcContract['ai:setKey'].request.safeParse({ provider: 'none', key: 'x' }).success).toBe(false);
    expect(ipcContract['ai:listModels'].request.safeParse({ provider: 'ollama', baseUrl: 'file:///etc/passwd' }).success).toBe(false);
    expect(ipcContract['ai:listModels'].request.safeParse({ provider: 'ollama', baseUrl: 'http://localhost:11434/v1' }).success).toBe(true);
    // the renderer only ever learns whether a key exists
    expect(ipcContract['ai:listProviders'].response.safeParse([{ id: 'openai', label: 'OpenAI', needsKey: true, local: false, hasKey: true, key: 'sk' }]).success).toBe(false);
  });
});
