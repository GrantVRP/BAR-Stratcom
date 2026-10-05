import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { toAiError } from '../errors';
import { AiError, CLOUD_TIMEOUT_MS, jsonOrText, type AiProvider } from '../types';

/** The parts of the Anthropic client we use (tests inject a fake). */
export interface AnthropicClientLike {
  beta: {
    messages: {
      create(
        params: Record<string, unknown>,
        options?: { signal?: AbortSignal }
      ): Promise<{ stop_reason: string | null; content: Array<{ type: string; text?: string }> }>;
    };
  };
  models: {
    list(params?: Record<string, unknown>, options?: { signal?: AbortSignal }): AsyncIterable<{ id: string; display_name: string }>;
  };
}

export const ANTHROPIC_DEFAULT_MODEL = 'claude-opus-5-5';
/** Server-side refusal fallback (A-18), sent with `fallbacks: 'default'` when enabled in Settings. */
export const ANTHROPIC_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export interface AnthropicProviderOptions {
  apiKey: string;
  fallbacks: boolean;
  client?: (apiKey: string) => AnthropicClientLike;
}

function sdkClient(apiKey: string): AnthropicClientLike {
  // the SDK's generics are wider than what we call; its runtime shape is the interface above
  return new Anthropic({ apiKey, timeout: CLOUD_TIMEOUT_MS, maxRetries: 1 }) as unknown as AnthropicClientLike;
}

let loggedFallbackDrop = false;

/**
 * Anthropic (04 §6.2): structured output through `output_config.format` (zodOutputFormat) with
 * `effort: 'high'`; no thinking, temperature or budget_tokens. The request goes through `create` so
 * a reply that misses the schema stays readable for the repair round (`parse` would throw it away).
 */
export function createAnthropicProvider(opts: AnthropicProviderOptions): AiProvider {
  const client = (opts.client ?? sdkClient)(opts.apiKey);
  let sendFallbacks = opts.fallbacks;
  return {
    id: 'anthropic',
    needsKey: true,
    async listModels(signal) {
      try {
        const models: Array<{ id: string; label: string }> = [];
        for await (const m of client.models.list({ limit: 100 }, { signal })) models.push({ id: m.id, label: m.display_name });
        return models;
      } catch (err) {
        throw toAiError(err, signal);
      }
    },
    async draft(req, signal) {
      const base = {
        model: req.model,
        max_tokens: 16000,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
        output_config: { format: zodOutputFormat(req.schema), effort: 'high' }
      };
      const send = (withFallbacks: boolean): ReturnType<AnthropicClientLike['beta']['messages']['create']> =>
        client.beta.messages.create(withFallbacks ? { ...base, betas: [ANTHROPIC_FALLBACK_BETA], fallbacks: 'default' } : base, { signal });
      let res: Awaited<ReturnType<typeof send>>;
      try {
        res = await send(sendFallbacks);
      } catch (err) {
        // if the API rejects fallbacks together with output_config, continue without them (logged once)
        if (!(sendFallbacks && err instanceof Anthropic.BadRequestError && /fallback/i.test(err.message))) throw toAiError(err, signal);
        sendFallbacks = false;
        if (!loggedFallbackDrop) console.warn('[ai] Anthropic rejected fallbacks with structured output; sending without them');
        loggedFallbackDrop = true;
        try {
          res = await send(false);
        } catch (retryErr) {
          throw toAiError(retryErr, signal);
        }
      }
      if (res.stop_reason === 'refusal') throw new AiError('REFUSED');
      return jsonOrText(
        res.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join('')
      );
    }
  };
}
