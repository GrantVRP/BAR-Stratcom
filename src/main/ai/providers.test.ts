import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { redact, toAiError } from './errors';
import { createProvider } from './providers';
import { ANTHROPIC_FALLBACK_BETA, type AnthropicClientLike } from './providers/anthropic';
import { defaultGeminiModel, type GeminiClientLike } from './providers/gemini';
import type { OpenAiClientLike } from './providers/openai-compatible';
import { AiError, jsonOrText } from './types';

const Draft = z.object({ title: z.string(), steps: z.array(z.object({ unitId: z.string(), count: z.number().int() })) });
const req = { system: 'SYSTEM', user: 'USER', schema: Draft, model: 'test-model' };
const signal = new AbortController().signal;
const plan = { title: 'Bot opening', steps: [{ unitId: 'armpw', count: 2 }] };

async function* iterate<T>(items: T[]): AsyncGenerator<T> {
  for (const i of items) yield i;
}

function fakeAnthropic(reply: () => Promise<{ stop_reason: string | null; content: Array<{ type: string; text?: string }> }>) {
  const create = vi.fn<AnthropicClientLike['beta']['messages']['create']>(() => reply());
  const client: AnthropicClientLike = {
    beta: { messages: { create } },
    models: { list: () => iterate([{ id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' }]) }
  };
  return { client, create };
}
const ok = (text: string) => async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] });

describe('Anthropic adapter', () => {
  it('sends structured output with effort high and the server-side fallback, and nothing else', async () => {
    const { client, create } = fakeAnthropic(ok(JSON.stringify(plan)));
    const ai = createProvider('anthropic', { apiKey: 'sk-ant-x', anthropicFallbacks: true, clients: { anthropic: () => client } });
    expect(await ai.draft(req, signal)).toEqual(plan);
    const [params, options] = create.mock.calls[0]!;
    expect(params).toMatchObject({
      model: 'test-model',
      max_tokens: 16000,
      system: 'SYSTEM',
      messages: [{ role: 'user', content: 'USER' }],
      betas: [ANTHROPIC_FALLBACK_BETA],
      fallbacks: 'default'
    });
    const outputConfig = (params as { output_config: { effort: string; format: { type: string; schema: object } } }).output_config;
    expect(outputConfig.effort).toBe('high');
    expect(outputConfig.format.type).toBe('json_schema');
    expect(outputConfig.format.schema).toHaveProperty('properties.steps');
    for (const banned of ['thinking', 'temperature', 'budget_tokens']) expect(params).not.toHaveProperty(banned);
    expect(options).toEqual({ signal });
  });

  it('leaves out the fallback when it is off in Settings', async () => {
    const { client, create } = fakeAnthropic(ok('{}'));
    await createProvider('anthropic', { apiKey: 'k-12345678', anthropicFallbacks: false, clients: { anthropic: () => client } }).draft(req, signal);
    expect(create.mock.calls[0]![0]).not.toHaveProperty('fallbacks');
    expect(create.mock.calls[0]![0]).not.toHaveProperty('betas');
  });

  it('retries without fallbacks when the API rejects them with structured output', async () => {
    let calls = 0;
    const { client, create } = fakeAnthropic(async () => {
      calls += 1;
      // body shaped like the API's error response; the SDK builds the message from it
      if (calls === 1) {
        const body = { type: 'error', error: { type: 'invalid_request_error', message: 'fallbacks cannot be combined with output_config' } };
        throw new Anthropic.BadRequestError(400, body, undefined, new Headers());
      }
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: '{}' }] };
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await createProvider('anthropic', { apiKey: 'k-12345678', anthropicFallbacks: true, clients: { anthropic: () => client } }).draft(req, signal);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1]![0]).not.toHaveProperty('fallbacks');
    warn.mockRestore();
  });

  it('reports a refusal, keeps a non-JSON answer for repair, and maps a bad key', async () => {
    const refused = fakeAnthropic(async () => ({ stop_reason: 'refusal', content: [] }));
    await expect(createProvider('anthropic', { apiKey: 'k-12345678', anthropicFallbacks: false, clients: { anthropic: () => refused.client } }).draft(req, signal)).rejects.toMatchObject({ code: 'REFUSED' });

    const prose = fakeAnthropic(ok('Sorry, here is a plan: ...'));
    expect(await createProvider('anthropic', { apiKey: 'k-12345678', anthropicFallbacks: false, clients: { anthropic: () => prose.client } }).draft(req, signal)).toBe('Sorry, here is a plan: ...');

    const badKey = fakeAnthropic(async () => {
      throw new Anthropic.AuthenticationError(401, { type: 'error' }, 'invalid x-api-key', new Headers());
    });
    await expect(createProvider('anthropic', { apiKey: 'k-12345678', anthropicFallbacks: false, clients: { anthropic: () => badKey.client } }).draft(req, signal)).rejects.toMatchObject({ code: 'AUTH', message: 'Invalid key' });
  });

  it('lists models with their display names and needs a key', async () => {
    const { client } = fakeAnthropic(ok('{}'));
    expect(await createProvider('anthropic', { apiKey: 'k-12345678', anthropicFallbacks: false, clients: { anthropic: () => client } }).listModels(signal)).toEqual([{ id: 'claude-opus-5-5', label: 'Claude Opus 5.5' }]);
    expect(() => createProvider('anthropic', { apiKey: null, anthropicFallbacks: false })).toThrow('No API key');
  });
});

describe('Gemini adapter', () => {
  function fakeGemini(reply: { text?: string; promptFeedback?: { blockReason?: string } }) {
    const generateContent = vi.fn<GeminiClientLike['models']['generateContent']>(async () => reply);
    const client: GeminiClientLike = {
      models: {
        generateContent,
        list: async () =>
          iterate([
            { name: 'models/gemini-3.0-flash', displayName: 'Gemini 3 Flash', supportedActions: ['generateContent'] },
            { name: 'models/text-embedding-9', supportedActions: ['embedContent'] }
          ])
      }
    };
    return { client, generateContent };
  }

  it('asks for JSON with the schema and the system text', async () => {
    const { client, generateContent } = fakeGemini({ text: JSON.stringify(plan) });
    const ai = createProvider('gemini', { apiKey: 'AIza-x', anthropicFallbacks: false, clients: { gemini: () => client } });
    expect(await ai.draft(req, signal)).toEqual(plan);
    const params = generateContent.mock.calls[0]![0] as { model: string; contents: string; config: Record<string, unknown> };
    expect(params).toMatchObject({ model: 'test-model', contents: 'USER', config: { systemInstruction: 'SYSTEM', responseMimeType: 'application/json', abortSignal: signal } });
    expect(params.config.responseJsonSchema).toHaveProperty('properties.title');
  });

  it('reports a blocked prompt as a refusal and lists only text models', async () => {
    const blocked = fakeGemini({ promptFeedback: { blockReason: 'SAFETY' } });
    await expect(createProvider('gemini', { apiKey: 'AIza-x', anthropicFallbacks: false, clients: { gemini: () => blocked.client } }).draft(req, signal)).rejects.toMatchObject({ code: 'REFUSED' });
    expect(await createProvider('gemini', { apiKey: 'AIza-x', anthropicFallbacks: false, clients: { gemini: () => blocked.client } }).listModels(signal)).toEqual([{ id: 'gemini-3.0-flash', label: 'Gemini 3 Flash' }]);
  });

  it('defaults to the newest flash model that is not a preview or experiment', () => {
    const ids = ['gemini-2.5-flash', 'gemini-3.0-flash-preview', 'gemini-3.0-pro', 'gemini-3.0-flash', 'gemini-3.0-flash-exp'];
    expect(defaultGeminiModel(ids.map((id) => ({ id, label: id })))).toBe('gemini-3.0-flash');
    expect(defaultGeminiModel([{ id: 'gemini-3.0-pro', label: 'x' }])).toBeNull();
  });
});

describe('OpenAI-compatible adapters', () => {
  function fakeOpenAi(reply: (params: Record<string, unknown>) => Promise<{ choices: Array<{ message: { content: string | null; refusal?: string | null } }> }>) {
    const create = vi.fn<OpenAiClientLike['chat']['completions']['create']>((params) => reply(params));
    const made: Array<{ apiKey: string; baseURL?: string; timeout: number }> = [];
    const factory = (o: { apiKey: string; baseURL?: string; timeout: number }): OpenAiClientLike => {
      made.push(o);
      return { chat: { completions: { create } }, models: { list: () => iterate([{ id: 'qwen3:8b' }]) } };
    };
    return { factory, create, made };
  }

  it('uses the JSON-schema format first', async () => {
    const { factory, create } = fakeOpenAi(async () => ({ choices: [{ message: { content: JSON.stringify(plan) } }] }));
    expect(await createProvider('openai', { apiKey: 'sk-x', anthropicFallbacks: false, clients: { openai: factory } }).draft(req, signal)).toEqual(plan);
    const params = create.mock.calls[0]![0] as { response_format: { type: string }; messages: unknown[] };
    expect(params.response_format.type).toBe('json_schema');
    expect(params.messages).toEqual([
      { role: 'system', content: 'SYSTEM' },
      { role: 'user', content: 'USER' }
    ]);
  });

  it('falls back to JSON mode, then plain text, for local servers that reject the schema', async () => {
    const { factory, create } = fakeOpenAi(async (params) => {
      if (params.response_format) throw new OpenAI.BadRequestError(400, {}, 'response_format not supported', new Headers());
      return { choices: [{ message: { content: '{"title":"t","steps":[]}' } }] };
    });
    const ai = createProvider('ollama', { apiKey: null, anthropicFallbacks: false, clients: { openai: factory } });
    expect(await ai.draft(req, signal)).toEqual({ title: 't', steps: [] });
    expect(create.mock.calls.map((c) => (c[0] as { response_format?: { type: string } }).response_format?.type ?? 'none')).toEqual(['json_schema', 'json_object', 'none']);
  });

  it('points each provider at its endpoint with the right timeout, and needs keys only for cloud', () => {
    const { factory, made } = fakeOpenAi(async () => ({ choices: [] }));
    createProvider('openrouter', { apiKey: 'sk-or', anthropicFallbacks: false, clients: { openai: factory } });
    createProvider('lmstudio', { apiKey: null, anthropicFallbacks: false, clients: { openai: factory } });
    createProvider('ollama', { apiKey: null, baseUrl: 'http://192.168.1.5:11434/v1', anthropicFallbacks: false, clients: { openai: factory } });
    expect(made.map((m) => [m.baseURL, m.timeout])).toEqual([
      ['https://openrouter.ai/api/v1', 120_000],
      ['http://localhost:1234/v1', 300_000],
      ['http://192.168.1.5:11434/v1', 300_000]
    ]);
    expect(() => createProvider('openai', { apiKey: null, anthropicFallbacks: false, clients: { openai: factory } })).toThrow('No API key');
  });

  it('reports a refusal', async () => {
    const { factory } = fakeOpenAi(async () => ({ choices: [{ message: { content: null, refusal: 'I cannot help with that' } }] }));
    await expect(createProvider('openai', { apiKey: 'sk-x', anthropicFallbacks: false, clients: { openai: factory } }).draft(req, signal)).rejects.toMatchObject({ code: 'REFUSED' });
  });
});

describe('AI errors and answers', () => {
  it('maps SDK errors to short typed messages', () => {
    expect(toAiError(new OpenAI.RateLimitError(429, {}, 'slow down', new Headers())).code).toBe('RATE_LIMIT');
    expect(toAiError(new Anthropic.APIConnectionTimeoutError()).code).toBe('TIMEOUT');
    expect(toAiError(new Anthropic.APIConnectionError({ message: 'down' })).code).toBe('UNREACHABLE');
    expect(toAiError(new TypeError('fetch failed')).code).toBe('UNREACHABLE');
    const aborted = new AbortController();
    aborted.abort();
    expect(toAiError(new Error('x'), aborted.signal).code).toBe('CANCELLED');
    expect(toAiError(new Error('boom')).message).toBe('The provider returned an error: boom');
    expect(toAiError(new AiError('NO_KEY'))).toBeInstanceOf(AiError);
  });

  it('never repeats a key in an error message', () => {
    expect(redact('Incorrect API key provided: sk-proj-abc123XYZ. Check it.')).toBe('Incorrect API key provided: [redacted]. Check it.');
    expect(redact('key AIzaSyD-test failed')).toBe('key [redacted] failed');
    expect(toAiError(new Error('Bad request with api_key=sk-live-zzz')).message).not.toContain('sk-live');
  });

  it('reads JSON answers, also inside a code fence, and keeps prose as text', () => {
    expect(jsonOrText('{"a":1}')).toEqual({ a: 1 });
    expect(jsonOrText('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(jsonOrText('no json here')).toBe('no json here');
  });
});
