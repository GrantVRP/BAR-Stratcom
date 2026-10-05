import { AiError, type AiProvider, type ProviderId } from '../types';
import { createAnthropicProvider, type AnthropicClientLike } from './anthropic';
import { createGeminiProvider, type GeminiClientLike } from './gemini';
import { OPENAI_COMPATIBLE, createOpenAiCompatibleProvider, type OpenAiClientLike } from './openai-compatible';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  needsKey: boolean;
  defaultBaseUrl?: string;
  local: boolean;
}

export const PROVIDERS: readonly ProviderInfo[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', needsKey: true, local: false },
  { id: 'gemini', label: 'Google Gemini', needsKey: true, local: false },
  { id: 'openai', label: 'OpenAI', needsKey: true, local: false },
  { id: 'openrouter', label: 'OpenRouter', needsKey: true, defaultBaseUrl: OPENAI_COMPATIBLE.openrouter.baseUrl, local: false },
  { id: 'ollama', label: 'Ollama (local)', needsKey: false, defaultBaseUrl: OPENAI_COMPATIBLE.ollama.baseUrl, local: true },
  { id: 'lmstudio', label: 'LM Studio (local)', needsKey: false, defaultBaseUrl: OPENAI_COMPATIBLE.lmstudio.baseUrl, local: true }
];

/** SDK client factories; tests inject fakes (04 §6.2 dependency injection). */
export interface ClientFactories {
  anthropic?: (apiKey: string) => AnthropicClientLike;
  gemini?: (apiKey: string) => GeminiClientLike;
  openai?: (o: { apiKey: string; baseURL?: string; timeout: number }) => OpenAiClientLike;
}

export interface ProviderDeps {
  apiKey: string | null;
  baseUrl?: string | null;
  anthropicFallbacks: boolean;
  clients?: ClientFactories;
}

export function createProvider(id: ProviderId, deps: ProviderDeps): AiProvider {
  const info = PROVIDERS.find((p) => p.id === id)!;
  if (info.needsKey && !deps.apiKey) throw new AiError('NO_KEY');
  switch (id) {
    case 'anthropic':
      return createAnthropicProvider({ apiKey: deps.apiKey!, fallbacks: deps.anthropicFallbacks, client: deps.clients?.anthropic });
    case 'gemini':
      return createGeminiProvider({ apiKey: deps.apiKey!, client: deps.clients?.gemini });
    default:
      return createOpenAiCompatibleProvider({ id, apiKey: deps.apiKey, baseUrl: deps.baseUrl, client: deps.clients?.openai });
  }
}
