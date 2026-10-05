import type { z } from 'zod';
import { AiProviderSchema } from '../../core/schemas/settings';

/** AI providers (04 §6.2), as in Settings without "none"; the player brings their own key or local server (D-09). */
export const AiProviderIdSchema = AiProviderSchema.exclude(['none']);
export const AI_PROVIDER_IDS = AiProviderIdSchema.options;
export type ProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface AiModel {
  id: string;
  label: string;
}

export interface DraftRequest {
  system: string;
  user: string;
  schema: z.ZodType;
  model: string;
}

export interface AiProvider {
  id: ProviderId;
  needsKey: boolean;
  defaultBaseUrl?: string;
  listModels(signal: AbortSignal): Promise<AiModel[]>;
  /** The model's answer as parsed JSON (or the raw text when it is not JSON, for the repair round). */
  draft(req: DraftRequest, signal: AbortSignal): Promise<unknown>;
}

export type AiErrorCode =
  | 'NO_KEY'
  | 'NO_ENCRYPTION'
  | 'NOT_CONFIGURED'
  | 'AUTH'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'REFUSED'
  | 'UNREACHABLE'
  | 'PROVIDER';

const MESSAGES: Record<AiErrorCode, string> = {
  NO_KEY: 'No API key saved for this provider',
  NO_ENCRYPTION: 'Secure key storage is not available on this system, so the key was not saved',
  NOT_CONFIGURED: 'Choose an AI provider and model in Settings',
  AUTH: 'Invalid key',
  RATE_LIMIT: 'Rate limited, retry later',
  TIMEOUT: 'The provider took too long to answer',
  CANCELLED: 'Cancelled',
  REFUSED: 'The provider declined this request',
  UNREACHABLE: 'Could not reach the provider',
  PROVIDER: 'The provider returned an error'
};

/** A typed failure shown to the player as a short message (never contains the key). */
export class AiError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode, detail?: string) {
    super(detail ? `${MESSAGES[code]}: ${detail}` : MESSAGES[code]);
    this.name = 'AiError';
    this.code = code;
  }
}

/** 120 s for cloud providers, 300 s for local servers (04 §6.2). */
export const CLOUD_TIMEOUT_MS = 120_000;
export const LOCAL_TIMEOUT_MS = 300_000;

/** Parses a model's text answer as JSON; non-JSON text is returned as is so the repair round can show it. */
export function jsonOrText(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, '$1');
  try {
    return JSON.parse(trimmed);
  } catch {
    return text;
  }
}
