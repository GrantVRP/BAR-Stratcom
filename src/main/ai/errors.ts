import Anthropic from '@anthropic-ai/sdk';
import { ApiError as GeminiApiError } from '@google/genai';
import OpenAI from 'openai';
import { AiError } from './types';

/**
 * Maps SDK errors to typed AiErrors: the Anthropic and OpenAI SDKs share a class layout,
 * Gemini reports HTTP status codes.
 */
export function toAiError(err: unknown, signal?: AbortSignal): AiError {
  if (err instanceof AiError) return err;
  if (signal?.aborted) return new AiError('CANCELLED');
  if (err instanceof Anthropic.APIUserAbortError || err instanceof OpenAI.APIUserAbortError) return new AiError('CANCELLED');
  if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof OpenAI.APIConnectionTimeoutError) return new AiError('TIMEOUT');
  if (err instanceof Anthropic.APIConnectionError || err instanceof OpenAI.APIConnectionError) return new AiError('UNREACHABLE');
  if (err instanceof Anthropic.AuthenticationError || err instanceof OpenAI.AuthenticationError) return new AiError('AUTH');
  if (err instanceof Anthropic.PermissionDeniedError || err instanceof OpenAI.PermissionDeniedError) return new AiError('AUTH');
  if (err instanceof Anthropic.RateLimitError || err instanceof OpenAI.RateLimitError) return new AiError('RATE_LIMIT');
  if (err instanceof GeminiApiError) {
    if (err.status === 401 || err.status === 403) return new AiError('AUTH');
    if (err.status === 429) return new AiError('RATE_LIMIT');
    return new AiError('PROVIDER', `HTTP ${err.status}`);
  }
  if (err instanceof Error && err.name === 'AbortError') return new AiError('CANCELLED');
  if (err instanceof Error && /fetch failed|ECONNREFUSED|ENOTFOUND/i.test(err.message)) return new AiError('UNREACHABLE');
  return new AiError('PROVIDER', err instanceof Error ? redact(err.message).slice(0, 200) : undefined);
}

/** Error text from a provider may echo part of a key (e.g. "Incorrect API key provided: sk-…"). */
export function redact(text: string): string {
  return text
    .replace(/\b(sk-[\w-]+|sk_[\w-]+|AIza[\w-]+|xai-[\w-]+)/g, '[redacted]')
    .replace(/(api[_-]?key["'=:\s]+)\S+/gi, '$1[redacted]');
}
