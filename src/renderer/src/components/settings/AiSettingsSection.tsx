import React from 'react';
import { useSettings } from '../../stores';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import type { Settings } from '../../../../core/schemas/settings';

const PROVIDER_OPTIONS = [
  { value: 'none', label: 'None (Offline / Disabled)' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'openai', label: 'OpenAI GPT' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'lmstudio', label: 'LM Studio (Local)' }
];

export function AiSettingsSection(): React.JSX.Element {
  const { settings, updateSettings } = useSettings();

  const currentProvider = settings?.ai?.provider ?? 'none';
  const baseUrl = settings?.ai?.baseUrl ?? '';
  const anthropicFallbacks = settings?.ai?.anthropicFallbacks ?? true;

  const handleProviderChange = async (provider: Settings['ai']['provider']): Promise<void> => {
    await updateSettings({
      ai: {
        ...(settings?.ai ?? { model: null, baseUrl: null, anthropicFallbacks: true }),
        provider
      }
    });
  };

  const handleBaseUrlChange = async (newUrl: string): Promise<void> => {
    await updateSettings({
      ai: {
        ...(settings?.ai ?? { provider: 'none', model: null, anthropicFallbacks: true }),
        baseUrl: newUrl.trim() === '' ? null : newUrl.trim()
      }
    });
  };

  const handleFallbackToggle = async (checked: boolean): Promise<void> => {
    await updateSettings({
      ai: {
        ...(settings?.ai ?? { provider: 'none', model: null, baseUrl: null }),
        anthropicFallbacks: checked
      }
    });
  };

  return (
    <div data-testid="settings-section-ai" className="space-y-6 font-mono text-xs">
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
            AI ADVISOR CONFIGURATION
          </span>
          <span className="rounded bg-[#c084fc]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#c084fc]">
            COMING IN MILESTONE M08 (T08.8)
          </span>
        </div>

        <p className="text-xs text-[#a1a1aa]">
          Optional. Use your own API key or a local model.
        </p>

        {/* Provider Selection */}
        <div className="space-y-1">
          <label className="text-[10px] text-[#71717a] uppercase font-bold">Provider</label>
          <div>
            <Select
              options={PROVIDER_OPTIONS}
              value={currentProvider}
              onChange={(e) => void handleProviderChange(e.target.value as Settings['ai']['provider'])}
              data-testid="ai-provider-select"
            />
          </div>
        </div>

        {/* Local Base URL */}
        {(currentProvider === 'ollama' || currentProvider === 'lmstudio' || currentProvider === 'openrouter') && (
          <div className="space-y-1">
            <label className="text-[10px] text-[#71717a] uppercase font-bold">
              Base URL (Optional Custom Endpoint)
            </label>
            <Input
              value={baseUrl}
              placeholder={currentProvider === 'ollama' ? 'http://127.0.0.1:11434' : 'http://127.0.0.1:1234/v1'}
              onChange={(e) => void handleBaseUrlChange(e.target.value)}
              className="w-full max-w-md"
              data-testid="ai-base-url-input"
            />
          </div>
        )}

        {/* Anthropic fallback option */}
        {currentProvider === 'anthropic' && (
          <div className="flex items-center justify-between rounded bg-[#0a0c14] p-3 border border-[#1f2430]">
            <div>
              <div className="font-bold text-[#e4e4e7] text-xs">Anthropic Refusal Fallback</div>
              <div className="text-[10px] text-[#71717a]">
                Retry when the model refuses harmless game terms.
              </div>
            </div>
            <Toggle
              checked={anthropicFallbacks}
              onChange={(val) => void handleFallbackToggle(val)}
              data-testid="ai-fallbacks-toggle"
            />
          </div>
        )}

        {/* Security & BYOK Disclosure */}
        <div className="rounded border border-[#c084fc]/30 bg-[#1c152b] p-3 space-y-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#c084fc]">
            WHAT IS SENT & SECURE STORAGE
          </span>
          <p className="text-xs text-[#d8b4fe]">
            Keys are encrypted on this PC (Windows secure storage) and never sent to StratCom.
          </p>
          <p className="text-xs text-[#a1a1aa]">
            Only build steps and timings go to your provider. Game data stays on this PC.
          </p>
        </div>
      </div>
    </div>
  );
}
