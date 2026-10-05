import { avgWindFor } from '../../core/maps';
import type { Registry } from '../../core/registry';
import type { BuildPlan, MapRecord } from '../../core/schemas';
import type { IpcRequest } from '../../shared/ipc';
import { broadcast, handle } from '../ipc/register';
import { getMap, loadAvgWindTable } from '../maps/loader';
import { defaultPlanStore } from '../plans/store';
import { loadRegistry } from '../registry/loader';
import { defaultSettingsStore, type SettingsStore } from '../settings/store';
import type { DraftIntent } from './context';
import { draftPlan, type DraftProgress, type DraftResult } from './draft';
import { defaultKeyStore, type KeyStore } from './keys';
import { PROVIDERS, createProvider, type ClientFactories } from './providers';
import { ANTHROPIC_DEFAULT_MODEL } from './providers/anthropic';
import { defaultGeminiModel } from './providers/gemini';
import { AiError, CLOUD_TIMEOUT_MS, LOCAL_TIMEOUT_MS, type AiModel, type AiProvider, type ProviderId } from './types';

export interface AiHandlerDeps {
  keys?: KeyStore;
  settings?: SettingsStore;
  clients?: ClientFactories;
  /** Drafting inputs (T08.7); the defaults read data/ and the plan library. */
  registry?: () => Registry;
  library?: () => readonly BuildPlan[];
  map?: (fileName: string) => MapRecord | null;
  windTable?: () => Record<string, Record<string, number>> | null;
  now?: () => Date;
  progress?: (progress: DraftProgress) => void;
}

const timeoutFor = (provider: ProviderId): number => (PROVIDERS.find((p) => p.id === provider)!.local ? LOCAL_TIMEOUT_MS : CLOUD_TIMEOUT_MS);

function providerFor(provider: ProviderId, baseUrl: string | null | undefined, deps: AiHandlerDeps): AiProvider {
  const settings = (deps.settings ?? defaultSettingsStore).getSettings();
  return createProvider(provider, {
    apiKey: (deps.keys ?? defaultKeyStore).getKey(provider),
    baseUrl: baseUrl ?? (settings.ai.provider === provider ? settings.ai.baseUrl : null),
    anthropicFallbacks: settings.ai.anthropicFallbacks,
    clients: deps.clients
  });
}

/** Lists a provider's models (also the connection test: a key check for cloud, reachability for local). */
export async function listModelsFor(provider: ProviderId, baseUrl: string | undefined, deps: AiHandlerDeps = {}): Promise<AiModel[]> {
  const models = await providerFor(provider, baseUrl, deps).listModels(AbortSignal.timeout(timeoutFor(provider)));
  return models.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * The model to draft with: the one chosen in Settings, else the provider's default (04 §6.2):
 * Claude Opus 5.5, the newest Gemini flash, or a local server's first model. OpenAI and OpenRouter
 * have too many models to guess, so the player picks one.
 */
export async function resolveModel(provider: AiProvider, chosen: string | null, signal: AbortSignal): Promise<string> {
  if (chosen) return chosen;
  if (provider.id === 'anthropic') return ANTHROPIC_DEFAULT_MODEL;
  if (provider.id === 'openai' || provider.id === 'openrouter') throw new AiError('NOT_CONFIGURED');
  const models = await provider.listModels(signal);
  const model =
    provider.id === 'gemini' ? defaultGeminiModel(models) : ([...models].sort((a, b) => (a.id < b.id ? -1 : 1))[0]?.id ?? null);
  if (!model) throw new AiError('NOT_CONFIGURED');
  return model;
}

/** One AI draft for the player's intent with the provider and model from Settings (T08.7). */
export async function runDraft(req: IpcRequest<'ai:draft'>, signal: AbortSignal, deps: AiHandlerDeps = {}): Promise<DraftResult> {
  const settings = (deps.settings ?? defaultSettingsStore).getSettings();
  const id = settings.ai.provider;
  if (id === 'none') throw new AiError('NOT_CONFIGURED');
  const provider = providerFor(id, null, deps);
  const timeoutMs = timeoutFor(id);
  const model = await resolveModel(provider, settings.ai.model, AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]));
  const map = req.mapFileName ? (deps.map ?? getMap)(req.mapFileName) : null;
  const intent: DraftIntent = {
    factionId: req.factionId,
    mode: req.mode,
    role: req.role,
    opening: req.opening,
    skill: req.skill,
    ...(req.freeText ? { freeText: req.freeText } : {})
  };
  return draftPlan({
    provider,
    model,
    registry: (deps.registry ?? loadRegistry)(),
    intent,
    map,
    avgWind: map ? avgWindFor(map, (deps.windTable ?? loadAvgWindTable)()) : null,
    library: (deps.library ?? (() => defaultPlanStore.list()))(),
    createdAt: (deps.now ?? (() => new Date()))().toISOString(),
    timeoutMs,
    signal,
    onProgress: deps.progress ?? ((p) => broadcast('ai:progress', p))
  });
}

/** AI IPC (T08.6, T08.7). The renderer never receives a key, only whether one is stored. */
export function registerAiHandlers(deps: AiHandlerDeps = {}): void {
  const keys = (): KeyStore => deps.keys ?? defaultKeyStore;
  // one draft at a time; a new one replaces (cancels) the running one
  let running: AbortController | null = null;

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

  handle('ai:draft', async (req) => {
    running?.abort();
    const controller = new AbortController();
    running = controller;
    try {
      return await runDraft(req, controller.signal, deps);
    } finally {
      if (running === controller) running = null;
    }
  });

  handle('ai:cancel', () => {
    const cancelled = running !== null;
    running?.abort();
    running = null;
    return { cancelled };
  });
}
