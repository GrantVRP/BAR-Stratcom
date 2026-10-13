// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings, type Settings } from '../../../../core/schemas/settings';
import { setIpcClientOverride } from '../../lib/ipc-client';
import { useSettings } from '../../stores';
import { CoachSettingsSection } from './CoachSettingsSection';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// regression (T11.5): the alert switches showed every alert on whatever the profile ran, and chat
// echo claimed to post to team chat (it is a local console line, 05 §8.2)
describe('CoachSettingsSection', () => {
  let container: HTMLDivElement;
  let root: Root;
  let saved: Settings;
  const invoke = vi.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    saved = defaultSettings();
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

  const render = async (patch: Partial<Settings>): Promise<void> => {
    saved = { ...defaultSettings(), ...patch };
    useSettings.setState({ settings: saved });
    await act(async () => root.render(<CoachSettingsSection />));
  };
  const toggle = (id: string): HTMLButtonElement => container.querySelector<HTMLButtonElement>(`[data-testid="alert-toggle-${id}"]`)!;

  it('shows what the chosen profile runs', async () => {
    await render({ profile: 'beginner' });
    expect(toggle('BENCHMARK_LOW').getAttribute('aria-checked')).toBe('false'); // off in Beginner
    expect(toggle('IDLE_COMMANDER').getAttribute('aria-checked')).toBe('true');
    expect(toggle('E_FLOAT').disabled).toBe(true); // Beginner has no energy float threshold
  });

  it('a switched alert shows the switch; one the profile cannot run is unavailable', async () => {
    await render({ profile: 'intermediate', alerts: { IDLE_COMMANDER: { enabled: false } } });
    expect(toggle('IDLE_COMMANDER').getAttribute('aria-checked')).toBe('false');
    expect(toggle('M_STALL_SOON').disabled).toBe(true);
    expect(toggle('M_STALL_SOON').getAttribute('aria-checked')).toBe('false');
    expect(container.textContent).toContain('Not in this profile');

    await act(async () => toggle('IDLE_COMMANDER').click());
    expect(invoke).toHaveBeenLastCalledWith('settings:set', { alerts: { IDLE_COMMANDER: { enabled: true } } });
  });

  it('chat echo says only the player sees it', async () => {
    await render({});
    expect(container.textContent).toContain('Only you see them');
    expect(container.textContent).not.toMatch(/team chat/i);
  });
});
