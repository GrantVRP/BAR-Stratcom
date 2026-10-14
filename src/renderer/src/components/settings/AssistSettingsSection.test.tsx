// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings, type Settings } from '../../../../core/schemas/settings';
import { setIpcClientOverride } from '../../lib/ipc-client';
import { useSettings } from '../../stores';
import { AssistSettingsSection } from './AssistSettingsSection';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AssistSettingsSection', () => {
  let container: HTMLDivElement;
  let root: Root;
  let saved: Settings;
  const invoke = vi.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    saved = defaultSettings();
    useSettings.setState({ settings: saved });
    invoke.mockImplementation((channel: string, req: Partial<Settings>) => {
      if (channel !== 'settings:set') return Promise.resolve({ ok: false, code: 'X', message: '' });
      saved = { ...saved, ...req };
      return Promise.resolve({ ok: true, data: saved });
    });
    setIpcClientOverride({ invoke: invoke as never, on: () => () => undefined, isAvailable: () => true });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setIpcClientOverride(null);
    useSettings.getState().reset();
  });

  const toggle = (id: string): HTMLButtonElement => container.querySelector<HTMLButtonElement>(`[data-testid="assist-toggle-${id}"]`)!;

  it('starts off, explains each helper and shows its bind command', async () => {
    await act(async () => root.render(<AssistSettingsSection />));
    expect(toggle('armNext').getAttribute('aria-checked')).toBe('false');
    expect(toggle('factoryQueue').getAttribute('aria-checked')).toBe('false');
    expect(toggle('armNext').disabled).toBe(false);
    expect(container.querySelector('[data-testid="assist-bind-armNext"]')!.textContent).toBe('/bind Ctrl+Shift+N stratcom_arm_next');
    expect(container.querySelector('[data-testid="assist-bind-factoryQueue"]')!.textContent).toBe('/bind Ctrl+Shift+J stratcom_load_queue');
    expect(container.querySelector('[data-testid="assist-factoryQueue"]')!.textContent).toContain('unit-control widgets');
    expect(container.textContent).not.toMatch(/coming/i);
  });

  it('switches each helper on and off independently', async () => {
    await act(async () => root.render(<AssistSettingsSection />));
    await act(async () => toggle('factoryQueue').click());
    expect(invoke).toHaveBeenLastCalledWith('settings:set', { assist: { armNext: false, factoryQueue: true } });
    expect(toggle('factoryQueue').getAttribute('aria-checked')).toBe('true');

    await act(async () => toggle('armNext').click());
    expect(invoke).toHaveBeenLastCalledWith('settings:set', { assist: { armNext: true, factoryQueue: true } });
    await act(async () => toggle('factoryQueue').click());
    expect(saved.assist).toEqual({ armNext: true, factoryQueue: false });
  });
});
