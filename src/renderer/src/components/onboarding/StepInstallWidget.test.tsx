// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../../../../core/schemas/settings';
import { setIpcClientOverride } from '../../lib/ipc-client';
import { useLive, useSettings } from '../../stores';
import { GameSettingsSection } from '../settings/GameSettingsSection';
import { StepInstallWidget } from './StepInstallWidget';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// regression: an unknown or not-yet-loaded widget version was shown as a made-up "3.0.1"
describe('widget version text', () => {
  let container: HTMLDivElement;
  let root: Root;
  let status: unknown;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useSettings.setState({ settings: defaultSettings() });
    useLive.setState({ health: { status: 'bar-idle', message: '', lastHeartbeat: null } });
    const invoke = vi.fn((channel: string) =>
      channel === 'game:widgetStatus' ? (status as Promise<unknown>) : Promise.resolve({ ok: true, data: {} })
    );
    setIpcClientOverride({ invoke: invoke as never, on: () => () => undefined, isAvailable: () => true });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setIpcClientOverride(null);
    useSettings.getState().reset();
  });

  const widget = (installedVersion: string | null) =>
    Promise.resolve({ ok: true, data: { installed: true, installedVersion, bundledVersion: '3.0.7', legacyPresent: false } });

  it('onboarding names the installed version only when it is known', async () => {
    status = widget(null);
    await act(async () => root.render(<StepInstallWidget onBack={() => undefined} onNext={() => undefined} />));
    expect(container.textContent).toContain('The widget is installed and ready.');
    expect(container.textContent).not.toContain('3.0.1');

    status = widget('3.0.7');
    act(() => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<StepInstallWidget onBack={() => undefined} onNext={() => undefined} />));
    expect(container.textContent).toContain('Version 3.0.7 is installed and ready.');
  });

  it('Settings → Game shows no bundled version until it is read', async () => {
    status = new Promise(() => undefined); // still loading
    await act(async () => root.render(<GameSettingsSection />));
    expect(container.textContent).not.toContain('3.0.1');
    expect(container.textContent).toContain('—');
  });
});
