// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App } from './App';
import { setIpcClientOverride } from './lib/ipc-client';
import { useSettings } from './stores';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('App Shell & Routing (06 §1–§2, T06.2, T06.3)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.location.hash = '#/home';
    useSettings.getState().reset();
    setIpcClientOverride({
      invoke: vi.fn().mockImplementation(async (ch: string) => {
        if (ch === 'app:getInfo') {
          return { ok: true, data: { version: '3.0.0-dev.0', platform: 'win32' } };
        }
        if (ch === 'settings:get') {
          return { ok: true, data: { profile: 'intermediate', launcher: { showOnStart: true } } };
        }
        if (ch === 'plans:list') {
          return { ok: true, data: [] };
        }
        return { ok: false, code: 'UNHANDLED', message: '' };
      }),
      on: vi.fn().mockReturnValue(() => {}),
      isAvailable: vi.fn().mockReturnValue(true)
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    setIpcClientOverride(null);
  });

  it('renders launcher on initial start and transitions to Home on launch', async () => {
    await act(async () => {
      root.render(<App />);
    });

    // Launcher should be visible initially
    const launcher = container.querySelector('[data-testid="launch-window"]');
    expect(launcher).not.toBeNull();

    // Launch into app
    const launchButton = container.querySelector('[data-testid="launcher-button"]') as HTMLButtonElement;
    expect(launchButton).not.toBeNull();

    await act(async () => {
      launchButton.click();
    });

    // Shell should now be rendered
    expect(container.querySelector('[data-testid="launch-window"]')).toBeNull();
    expect(container.querySelector('[data-testid="health-chip"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="active-plan-chip"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="profile-chip"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="view-home"]')).not.toBeNull();
  });

  it('updates view on hashchange after launcher is dismissed', async () => {
    await act(async () => {
      root.render(<App />);
    });

    // Dismiss launcher
    const launchButton = container.querySelector('[data-testid="launcher-button"]') as HTMLButtonElement;
    await act(async () => {
      launchButton.click();
    });

    expect(container.querySelector('[data-testid="view-home"]')).not.toBeNull();

    await act(async () => {
      window.location.hash = '#/library';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(container.querySelector('[data-testid="view-library"]')).not.toBeNull();
  });

  it('handles Alt+1..8 keyboard shortcuts', async () => {
    await act(async () => {
      root.render(<App />);
    });

    // Dismiss launcher
    const launchButton = container.querySelector('[data-testid="launcher-button"]') as HTMLButtonElement;
    await act(async () => {
      launchButton.click();
    });

    await act(async () => {
      const event = new KeyboardEvent('keydown', { key: '3', altKey: true, bubbles: true });
      window.dispatchEvent(event);
    });

    expect(window.location.hash).toBe('#/coach');
  });
});
