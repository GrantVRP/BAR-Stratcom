import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { toAiError } from '../errors';
import { AiError, CLOUD_TIMEOUT_MS, LOCAL_TIMEOUT_MS, jsonOrText, type AiProvider } from '../types';

export type OpenAiCompatibleId = 'openai' | 'openrouter' | 'ollama' | 'lmstudio';

/** One SDK, four endpoints (04 §6.2). */
export const OPENAI_COMPATIBLE: Record<OpenAiCompatibleId, { baseUrl?: string; needsKey: boolean; local: boolean }> = {
  openai: { needsKey: true, local: false },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', needsKey: true, local: false },
  lmstudio: { baseUrl: 'http://localhost:1234/v1', needsKey: false, local: true },
  ollama: { baseUrl: 'http://localhost:11434/v1', needsKey: false, local: true }
};

type ChatResponse = { choices: Array<{ message: { content: string | null; refusal?: string | null } }> };

/** The parts of the OpenAI client we use (tests inject a fake). */
export interface OpenAiClientLike {
  chat: { completions: { create(params: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<ChatResponse> } };
  models: { list(params?: Record<string, unknown>, options?: { signal?: AbortSignal }): AsyncIterable<{ id: string }> };
}

export interface OpenAiProviderOptions {
  id: OpenAiCompatibleId;
  apiKey: string | null;
  /** Overrides the endpoint (Settings: base URL for local servers). */
  baseUrl?: string | null;
  client?: (o: { apiKey: string; baseURL?: string; timeout: number }) => OpenAiClientLike;
}

function sdkClient(o: { apiKey: string; baseURL?: string; timeout: number }): OpenAiClientLike {
  return new OpenAI({ apiKey: o.apiKey, baseURL: o.baseURL, timeout: o.timeout, maxRetries: 1 }) as unknown as OpenAiClientLike;
}

/** A server that does not support a response format rejects the request (400). */
function rejectsFormat(err: unknown): boolean {
  return err instanceof OpenAI.BadRequestError || err instanceof OpenAI.UnprocessableEntityError;
}

/**
 * OpenAI, OpenRouter, LM Studio, Ollama: structured output with a JSON schema; servers that reject
 * it get JSON mode, then plain text (the pipeline's zod parse and repair rounds cover the rest).
 */
export function createOpenAiCompatibleProvider(opts: OpenAiProviderOptions): AiProvider {
  const config = OPENAI_COMPATIBLE[opts.id];
  const baseURL = opts.baseUrl ?? config.baseUrl;
  // local servers ignore the key, but the SDK requires one
  const apiKey = opts.apiKey ?? (config.needsKey ? '' : 'local-server');
  if (config.needsKey && !apiKey) throw new AiError('NO_KEY');
  const client = (opts.client ?? sdkClient)({ apiKey, baseURL, timeout: config.local ? LOCAL_TIMEOUT_MS : CLOUD_TIMEOUT_MS });
  return {
    id: opts.id,
    needsKey: config.needsKey,
    defaultBaseUrl: config.baseUrl,
    async listModels(signal) {
      try {
        const models: Array<{ id: string; label: string }> = [];
        for await (const m of client.models.list({}, { signal })) models.push({ id: m.id, label: m.id });
        return models;
      } catch (err) {
        throw toAiError(err, signal);
      }
    },
    async draft(req, signal) {
      const base = {
        model: req.model,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user }
        ]
      };
      const formats: Array<object | null> = [zodResponseFormat(req.schema, 'build_plan'), { type: 'json_object' }, null];
      for (const [i, format] of formats.entries()) {
        try {
          const res = await client.chat.completions.create(format ? { ...base, response_format: format } : base, { signal });
          const message = res.choices[0]?.message;
          if (message?.refusal) throw new AiError('REFUSED');
          return jsonOrText(message?.content ?? '');
        } catch (err) {
          if (err instanceof AiError) throw err;
          if (!(rejectsFormat(err) && i < formats.length - 1)) throw toAiError(err, signal);
        }
      }
      throw new AiError('PROVIDER');
    }
  };
}
