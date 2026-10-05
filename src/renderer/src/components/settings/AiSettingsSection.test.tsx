// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings, type Settings } from '../../../../core/schemas/settings';
import { setIpcClientOverride } from '../../lib/ipc-client';
import { useSettings } from '../../stores';
import { AiSettingsSection } from './AiSettingsSection';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', needsKey: true, local: false },
  { id: 'ollama', label: 'Ollama (local)', needsKey: false, defaultBaseUrl: 'http://localhost:11434/v1', local: true }
];

function fakeIpc(initial: Settings['ai']): { invoke: ReturnType<typeof vi.fn>; settings: () => Settings } {
  let settings: Settings = { ...defaultSettings(), ai: initial };
  let hasKey = false;
  useSettings.setState({ settings });
  const invoke = vi.fn((channel: string, req: Record<string, unknown> | undefined) => {
    switch (channel) {
      case 'ai:listProviders':
        return Promise.resolve({ ok: true, data: PROVIDERS.map((p) => ({ ...p, hasKey: p.needsKey && hasKey })) });
      case 'ai:setKey':
        hasKey = true;
        return Promise.resolve({ ok: true, data: { ok: true } });
      case 'ai:clearKey':
        hasKey = false;
        return Promise.resolve({ ok: true, data: { ok: true } });
      case 'ai:listModels':
        return Promise.resolve({ ok: true, data: [{ id: 'model-a', label: 'Model A' }, { id: 'model-b', label: 'Model B' }] });
      case 'settings:set':
        settings = { ...settings, ...(req as Partial<Settings>) };
        return Promise.resolve({ ok: true, data: settings });
      default:
        return Promise.resolve({ ok: false, code: 'X', message: 'unexpected' });
    }
  });
  setIpcClientOverride({ invoke: invoke as never, on: () => () => undefined, isAvailable: () => true });
  return { invoke, settings: () => settings };
}

const byTestId = <T extends HTMLElement>(container: HTMLElement, id: string): T | null => container.querySelector<T>(`[data-testid="${id}"]`);

async function type(el: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function choose(el: HTMLSelectElement, value: string): Promise<void> {
  await act(async () => {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('AiSettingsSection (T08.8)', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setIpcClientOverride(null);
  });

  it('explains the options when AI is off, and always says what is sent', async () => {
    fakeIpc(defaultSettings().ai);
    await act(async () => root.render(<AiSettingsSection />));
    expect(byTestId(container, 'ai-off-note')).not.toBeNull();
    expect(byTestId(container, 'ai-key-input')).toBeNull();
    expect(byTestId(container, 'ai-test-btn')).toBeNull();
    expect(byTestId(container, 'ai-disclosure')!.textContent).toContain('No personal data, no files');
    expect(byTestId(container, 'ai-disclosure')!.textContent).toContain('You pay your provider directly');
    const options = [...byTestId<HTMLSelectElement>(container, 'ai-provider-select')!.options].map((o) => o.value);
    expect(options).toEqual(['none', 'anthropic', 'ollama']);
  });

  it('takes a key masked, never shows it back, tests and picks a model', async () => {
    const fake = fakeIpc({ provider: 'anthropic', model: null, baseUrl: null, anthropicFallbacks: false });
    await act(async () => root.render(<AiSettingsSection />));
    const keyInput = byTestId<HTMLInputElement>(container, 'ai-key-input')!;
    expect(keyInput.type).toBe('password');
    expect(byTestId<HTMLButtonElement>(container, 'ai-test-btn')!.disabled).toBe(true);
    expect(byTestId(container, 'ai-fallbacks-toggle')).toBeDefined();

    await type(keyInput, 'sk-ant-test-123456');
    await act(async () => byTestId(container, 'ai-key-save')!.click());
    expect(fake.invoke).toHaveBeenCalledWith('ai:setKey', { provider: 'anthropic', key: 'sk-ant-test-123456' });
    expect(byTestId(container, 'ai-key-saved')).not.toBeNull();
    expect(container.innerHTML).not.toContain('sk-ant-test-123456');

    const model = byTestId<HTMLSelectElement>(container, 'ai-model-select')!;
    expect(model.options[0]!.text).toBe('Default (Claude Opus 5.5)');
    await act(async () => byTestId(container, 'ai-test-btn')!.click());
    expect(byTestId(container, 'ai-status')!.textContent).toBe('Connected // 2 models');
    expect([...model.options].map((o) => o.value)).toEqual(['', 'model-a', 'model-b']);
    await choose(model, 'model-b');
    expect(fake.settings().ai.model).toBe('model-b');

    await act(async () => byTestId(container, 'ai-key-remove')!.click());
    expect(byTestId(container, 'ai-key-input')).not.toBeNull();
  });

  it('local servers: URL must be http(s); switching provider resets model and URL', async () => {
    const fake = fakeIpc({ provider: 'ollama', model: 'old', baseUrl: null, anthropicFallbacks: false });
    await act(async () => root.render(<AiSettingsSection />));
    const url = byTestId<HTMLInputElement>(container, 'ai-base-url-input')!;
    expect(url.placeholder).toBe('http://localhost:11434/v1');
    expect(byTestId<HTMLButtonElement>(container, 'ai-test-btn')!.disabled).toBe(false);

    await type(url, 'file:///etc/passwd');
    await act(async () => url.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(byTestId(container, 'ai-status')!.textContent).toContain('http:// or https://');
    expect(fake.settings().ai.baseUrl).toBeNull();

    await type(url, 'http://192.168.1.5:11434/v1');
    await act(async () => url.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(fake.settings().ai.baseUrl).toBe('http://192.168.1.5:11434/v1');
    await act(async () => byTestId(container, 'ai-test-btn')!.click());
    expect(fake.invoke).toHaveBeenCalledWith('ai:listModels', { provider: 'ollama', baseUrl: 'http://192.168.1.5:11434/v1' });

    await choose(byTestId<HTMLSelectElement>(container, 'ai-provider-select')!, 'anthropic');
    expect(fake.settings().ai).toMatchObject({ provider: 'anthropic', model: null, baseUrl: null });
  });
});
