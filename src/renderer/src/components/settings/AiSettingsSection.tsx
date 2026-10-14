import React, { useCallback, useEffect, useState } from 'react';
import type { Settings } from '../../../../core/schemas/settings';
import type { IpcResponseData } from '../../../../shared';
import { useSettings } from '../../stores';
import { ipcClient } from '../../lib/ipc-client';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Toggle } from '../ui/Toggle';

type ProviderInfo = IpcResponseData<'ai:listProviders'>[number];
type ProviderId = ProviderInfo['id'];
type AiSettings = Settings['ai'];

const OFF: AiSettings = { provider: 'none', model: null, baseUrl: null, anthropicFallbacks: false };

/** What "default model" means per provider; OpenAI and OpenRouter need a pick. */
const DEFAULT_MODEL: Partial<Record<ProviderId, string>> = {
  anthropic: 'Claude Opus 5.5',
  gemini: 'newest Flash',
  ollama: 'first model on the server',
  lmstudio: 'first model on the server'
};

const isHttpUrl = (url: string): boolean => /^https?:\/\/\S+$/.test(url);

/** Settings → AI: bring your own key or a local server. Keys only go in. */
export function AiSettingsSection(): React.JSX.Element {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const ai = settings?.ai ?? OFF;

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [keyInput, setKeyInput] = useState('');
  const [urlInput, setUrlInput] = useState(ai.baseUrl ?? '');
  const [models, setModels] = useState<Array<{ id: string; label: string }> | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshProviders = useCallback(async (): Promise<void> => {
    const res = await ipcClient.invoke('ai:listProviders');
    if (res.ok) setProviders(res.data);
  }, []);
  useEffect(() => {
    let active = true;
    void ipcClient.invoke('ai:listProviders').then((res) => {
      if (active && res.ok) setProviders(res.data);
    });
    return () => {
      active = false;
    };
  }, []);

  const info = providers.find((p) => p.id === ai.provider) ?? null;
  const setAi = (patch: Partial<AiSettings>): Promise<boolean> => update({ ai: { ...ai, ...patch } });

  const run = async (work: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setStatus(null);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  const changeProvider = (provider: AiSettings['provider']): Promise<void> =>
    run(async () => {
      setModels(null);
      setKeyInput('');
      setUrlInput('');
      await setAi({ provider, model: null, baseUrl: null });
    });

  const saveKey = (id: ProviderId): Promise<void> =>
    run(async () => {
      const res = await ipcClient.invoke('ai:setKey', { provider: id, key: keyInput });
      setStatus(res.ok ? { ok: true, text: 'Key saved.' } : { ok: false, text: res.message });
      if (res.ok) setKeyInput('');
      await refreshProviders();
    });

  const removeKey = (id: ProviderId): Promise<void> =>
    run(async () => {
      await ipcClient.invoke('ai:clearKey', { provider: id });
      setModels(null);
      await refreshProviders();
    });

  const saveUrl = async (): Promise<void> => {
    const url = urlInput.trim();
    if (url !== '' && !isHttpUrl(url)) {
      setStatus({ ok: false, text: 'The server URL must start with http:// or https://.' });
      return;
    }
    if (url !== (ai.baseUrl ?? '')) await setAi({ baseUrl: url === '' ? null : url });
  };

  const testConnection = (id: ProviderId): Promise<void> =>
    run(async () => {
      const res = await ipcClient.invoke('ai:listModels', { provider: id, ...(ai.baseUrl ? { baseUrl: ai.baseUrl } : {}) });
      if (!res.ok) {
        setStatus({ ok: false, text: res.message });
        return;
      }
      setModels(res.data);
      setStatus({ ok: true, text: `Connected // ${res.data.length} models` });
    });

  const providerOptions = [{ value: 'none', label: 'Off' }, ...providers.map((p) => ({ value: p.id, label: p.label }))];
  const defaultLabel = DEFAULT_MODEL[ai.provider as ProviderId];
  const modelOptions = [
    { value: '', label: defaultLabel ? `Default (${defaultLabel})` : 'Choose a model' },
    ...(models ?? (ai.model ? [{ id: ai.model, label: ai.model }] : [])).map((m) => ({ value: m.id, label: m.label }))
  ];
  const canTest = info !== null && (!info.needsKey || info.hasKey);

  return (
    <div data-testid="settings-section-ai" className="space-y-6 font-mono text-xs">
      <div className="space-y-4 rounded border border-[#27272a] bg-[#12131a] p-4">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">AI DRAFTING</span>

        <div className="space-y-1">
          <label htmlFor="ai-provider" className="text-[10px] font-bold uppercase text-zinc-400">Provider</label>
          <div>
            <Select
              id="ai-provider"
              options={providerOptions}
              value={ai.provider}
              disabled={busy}
              onChange={(e) => void changeProvider(e.target.value as AiSettings['provider'])}
              data-testid="ai-provider-select"
            />
          </div>
        </div>

        {ai.provider === 'none' && (
          <p data-testid="ai-off-note" className="text-zinc-400">
            Off. Pick a cloud provider and paste your own API key, or run a free local model (Ollama, LM Studio).
          </p>
        )}

        {info?.needsKey && (
          <div className="space-y-1">
            <label htmlFor="ai-key" className="text-[10px] font-bold uppercase text-zinc-400">API key</label>
            {info.hasKey ? (
              <div className="flex flex-wrap items-center gap-3">
                <span data-testid="ai-key-saved" className="text-[#4ade80]">KEY SAVED // encrypted on this PC</span>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void removeKey(info.id)} data-testid="ai-key-remove">
                  REMOVE KEY
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="ai-key"
                  type="password"
                  autoComplete="off"
                  value={keyInput}
                  placeholder="Paste your key"
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full max-w-sm"
                  data-testid="ai-key-input"
                />
                <Button variant="default" size="sm" disabled={busy || keyInput.trim() === ''} onClick={() => void saveKey(info.id)} data-testid="ai-key-save">
                  SAVE KEY
                </Button>
              </div>
            )}
          </div>
        )}

        {info?.local && (
          <div className="space-y-1">
            <label htmlFor="ai-url" className="text-[10px] font-bold uppercase text-zinc-400">Server URL</label>
            <Input
              id="ai-url"
              value={urlInput}
              placeholder={info.defaultBaseUrl}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={() => void saveUrl()}
              className="w-full max-w-sm"
              data-testid="ai-base-url-input"
            />
          </div>
        )}

        {info && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="ai-model" className="text-[10px] font-bold uppercase text-zinc-400">Model</label>
                <div>
                  <Select
                    id="ai-model"
                    options={modelOptions}
                    value={ai.model ?? ''}
                    disabled={busy}
                    onChange={(e) => void setAi({ model: e.target.value === '' ? null : e.target.value })}
                    data-testid="ai-model-select"
                  />
                </div>
              </div>
              <Button variant="default" size="sm" disabled={busy || !canTest} onClick={() => void testConnection(info.id)} data-testid="ai-test-btn">
                {busy ? 'CHECKING…' : 'TEST CONNECTION'}
              </Button>
            </div>
            {status && (
              <p data-testid="ai-status" role="status" className={status.ok ? 'text-[#4ade80]' : 'text-[#f87171]'}>
                {status.text}
              </p>
            )}
          </div>
        )}

        {ai.provider === 'anthropic' && (
          <div className="flex items-center justify-between gap-4 border border-[#1f2430] bg-[#0a0c14] p-3">
            <div>
              <div className="font-bold text-zinc-200">Refusal fallback</div>
              <div className="text-[10px] text-zinc-400">If Claude declines a request, Anthropic retries it on a fallback model.</div>
            </div>
            <Toggle checked={ai.anthropicFallbacks} onChange={(on) => void setAi({ anthropicFallbacks: on })} data-testid="ai-fallbacks-toggle" />
          </div>
        )}

        <div data-testid="ai-disclosure" className="space-y-2 border border-zinc-700 bg-[#0a0c14] p-3">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">WHAT IS SENT</span>
          <p className="text-zinc-300">
            When you draft: your choices (faction, mode, role, opening, skill, map, note), the map&apos;s facts, the unit
            table from your game data and up to 2 example builds from your library. No personal data, no files.
          </p>
          <p className="text-zinc-400">You pay your provider directly. Keys are encrypted on this PC and only sent to that provider.</p>
        </div>
      </div>
    </div>
  );
}
