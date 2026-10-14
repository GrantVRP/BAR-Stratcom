// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateBanner } from './UpdateBanner';
import { useSettings } from '../../stores';
import { ipcClient } from '../../lib/ipc-client';
import { defaultSettings } from '../../../../core/schemas/settings';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../lib/ipc-client', () => ({
  ipcClient: {
    invoke: vi.fn().mockImplementation((channel: string) =>
      Promise.resolve(
        channel === 'updates:check'
          ? { ok: true, data: { latest: '3.0.1', url: 'https://github.com/GrantVRP/BAR-Stratcom/releases/tag/v3.0.1' } }
          : { ok: true, data: { ok: true } }
      )
    ),
    on: vi.fn().mockReturnValue(() => {})
  }
}));

const invoke = vi.mocked(ipcClient.invoke);

describe('UpdateBanner', () => {
  let container: HTMLDivElement;
  let root: Root;
  const $ = (id: string): HTMLElement | null => container.querySelector(`[data-testid="${id}"]`);

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    invoke.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('asks once while the check is on, shows the newer version, opens its page through main, dismisses', async () => {
    useSettings.setState({ settings: defaultSettings() });
    await act(async () => root.render(<UpdateBanner />));
    await act(async () => root.render(<UpdateBanner />));
    expect(invoke.mock.calls.filter(([c]) => c === 'updates:check')).toHaveLength(1);
    expect($('update-banner')!.textContent).toContain('BAR StratCom 3.0.1 is out.');
    await act(async () => $('update-banner-open')!.click());
    expect(invoke).toHaveBeenCalledWith('shell:openExternal', { url: 'https://github.com/GrantVRP/BAR-Stratcom/releases/tag/v3.0.1' });
    await act(async () => $('update-banner-dismiss')!.click());
    expect($('update-banner')).toBeNull();
  });

  it('never asks while the check is off in Settings', async () => {
    useSettings.setState({ settings: { ...defaultSettings(), updates: { checkOnLaunch: false } } });
    await act(async () => root.render(<UpdateBanner />));
    expect(invoke).not.toHaveBeenCalled();
    expect($('update-banner')).toBeNull();
  });
});
