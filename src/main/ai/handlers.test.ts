import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ipcContract, ipcEvents } from '../../shared/ipc';
import { loadMaps } from '../maps/loader';
import { SettingsStore } from '../settings/store';
import type { DraftProgress } from './draft';
import { listModelsFor, resolveModel, runDraft } from './handlers';
import { KeyStore, type SafeStorageLike } from './keys';
import type { AnthropicClientLike } from './providers/anthropic';
import type { OpenAiClientLike } from './providers/openai-compatible';
import { validDraft } from './__test__/fakes';
import type { AiProvider, ProviderId } from './types';

const storage: SafeStorageLike = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from(`x${s}`),
  decryptString: (b) => b.toString().slice(1)
};

async function* iterate<T>(items: T[]): AsyncGenerator<T> {
  for (const i of items) yield i;
}

describe('AI settings handlers', () => {
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

describe('AI draft handler', () => {
  let dir: string;
  let keys: KeyStore;
  let settings: SettingsStore;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-draft-'));
    keys = new KeyStore(() => dir, storage);
    settings = new SettingsStore(dir);
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const provider = (id: ProviderId, models: string[]): AiProvider => ({
    id,
    needsKey: false,
    listModels: async () => models.map((m) => ({ id: m, label: m })),
    draft: async () => null
  });

  it('resolves the model: Settings first, then the provider default', async () => {
    const signal = new AbortController().signal;
    expect(await resolveModel(provider('openai', []), 'gpt-x', signal)).toBe('gpt-x');
    expect(await resolveModel(provider('anthropic', []), null, signal)).toBe('claude-opus-5-5');
    expect(await resolveModel(provider('gemini', ['gemini-2.0-pro', 'gemini-3.5-flash', 'gemini-3.7-flash-preview']), null, signal)).toBe('gemini-3.5-flash');
    expect(await resolveModel(provider('ollama', ['qwen3.8:latest', 'llama3.3:latest']), null, signal)).toBe('llama3.3:latest');
    await expect(resolveModel(provider('openai', ['gpt-x']), null, signal)).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
    await expect(resolveModel(provider('lmstudio', []), null, signal)).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  it('drafts with the provider from Settings, the map’s facts and progress events', async () => {
    const req = { factionId: 'armada', mode: '1v1' as const, role: 'front' as const, opening: 'bot' as const, skill: 'beginner' as const };
    await expect(runDraft(req, new AbortController().signal, { keys, settings })).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });

    settings.updateSettings({ ai: { provider: 'anthropic', model: null, baseUrl: null, anthropicFallbacks: false } });
    keys.setKey('anthropic', 'sk-ant-test-123456');
    const bodies: Array<Record<string, unknown>> = [];
    const anthropic = (): AnthropicClientLike => ({
      beta: {
        messages: {
          create: async (body) => {
            bodies.push(body);
            return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(validDraft()) }] };
          }
        }
      },
      models: { list: () => iterate([]) }
    });
    const map = loadMaps().find((m) => m.wind.max > 0)!;
    const progress: DraftProgress[] = [];
    const result = await runDraft({ ...req, mapFileName: map.fileName, freeText: 'rush' }, new AbortController().signal, {
      keys,
      settings,
      clients: { anthropic },
      library: () => [],
      now: () => new Date('2026-10-05T12:00:00Z'),
      progress: (p) => progress.push(p)
    });

    expect(bodies[0]!.model).toBe('claude-opus-5-5');
    const user = (bodies[0]!.messages as Array<{ content: string }>)[0]!.content;
    expect(user).toContain(`name: ${map.name}`);
    expect(user).toContain('<player_note>\nrush\n</player_note>');
    expect(result.report.errors).toEqual([]);
    expect(result.plan!.source).toMatchObject({ kind: 'ai-draft', provider: 'anthropic', createdAt: '2026-10-05T12:00:00.000Z' });
    expect(ipcContract['ai:draft'].response.safeParse(result).success).toBe(true);
    expect(progress.map((p) => p.phase)).toEqual(['draft', 'simulate']);
  });

  it('validates draft requests at the IPC boundary', () => {
    const ok = { factionId: 'armada', mode: '1v1', role: 'any', opening: 'bot', skill: 'beginner' };
    expect(ipcContract['ai:draft'].request.safeParse(ok).success).toBe(true);
    expect(ipcContract['ai:draft'].request.safeParse({ ...ok, freeText: 'x'.repeat(301) }).success).toBe(false);
    expect(ipcContract['ai:draft'].request.safeParse({ ...ok, provider: 'openai' }).success).toBe(false);
    expect(ipcContract['ai:draft'].request.safeParse({ ...ok, factionId: '../x' }).success).toBe(false);
    expect(ipcEvents['ai:progress'].safeParse({ round: 2, phase: 'repair' }).success).toBe(true);
  });
});
