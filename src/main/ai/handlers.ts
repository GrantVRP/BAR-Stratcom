import { handle } from '../ipc/register';
import { defaultSettingsStore, type SettingsStore } from '../settings/store';
import { defaultKeyStore, type KeyStore } from './keys';
import { PROVIDERS, createProvider, type ClientFactories } from './providers';
import { CLOUD_TIMEOUT_MS, LOCAL_TIMEOUT_MS, type AiModel, type ProviderId } from './types';

export interface AiHandlerDeps {
  keys?: KeyStore;
  settings?: SettingsStore;
  clients?: ClientFactories;
}

/** Lists a provider's models (also the connection test: a key check for cloud, reachability for local). */
export async function listModelsFor(provider: ProviderId, baseUrl: string | undefined, deps: AiHandlerDeps = {}): Promise<AiModel[]> {
  const keys = deps.keys ?? defaultKeyStore;
  const settings = (deps.settings ?? defaultSettingsStore).getSettings();
  const info = PROVIDERS.find((p) => p.id === provider)!;
  const ai = createProvider(provider, {
    apiKey: keys.getKey(provider),
    baseUrl: baseUrl ?? (settings.ai.provider === provider ? settings.ai.baseUrl : null),
    anthropicFallbacks: settings.ai.anthropicFallbacks,
    clients: deps.clients
  });
  const models = await ai.listModels(AbortSignal.timeout(info.local ? LOCAL_TIMEOUT_MS : CLOUD_TIMEOUT_MS));
  return models.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** AI settings IPC (T08.6). The renderer never receives a key, only whether one is stored. */
export function registerAiHandlers(deps: AiHandlerDeps = {}): void {
  const keys = (): KeyStore => deps.keys ?? defaultKeyStore;

  handle('ai:listProviders', () => PROVIDERS.map((p) => ({ ...p, hasKey: p.needsKey ? keys().hasKey(p.id) : false })));

  handle('ai:setKey', (req) => {
    keys().setKey(req.provider, req.key);
    return { ok: true as const };
  });

  handle('ai:clearKey', (req) => {
    keys().clearKey(req.provider);
    return { ok: true as const };
  });

  handle('ai:hasKey', (req) => keys().hasKey(req.provider));

  handle('ai:listModels', (req) => listModelsFor(req.provider, req.baseUrl, deps));

  handle('ai:test', async (req) => {
    const models = await listModelsFor(req.provider, req.baseUrl, deps);
    return { ok: true as const, models: models.length };
  });
}
