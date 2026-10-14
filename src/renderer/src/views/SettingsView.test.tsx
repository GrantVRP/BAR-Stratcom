// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsView } from './SettingsView';
import { useSettings, useLive } from '../stores';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../lib/ipc-client', () => ({
  ipcClient: {
    invoke: vi.fn().mockImplementation((channel: string) => {
      if (channel === 'game:widgetStatus') {
        return Promise.resolve({
          ok: true,
          data: {
            installed: true,
            installedVersion: '3.0.1',
            bundledVersion: '3.0.1',
            legacyPresent: false
          }
        });
      }
      if (channel === 'ai:listProviders') {
        return Promise.resolve({ ok: true, data: [] });
      }
      if (channel === 'coach:getShortcutStatus') {
        return Promise.resolve({
          ok: true,
          data: { shortcut: 'Ctrl+Alt+S', status: 'registered' }
        });
      }
      return Promise.resolve({ ok: true, data: {} });
    }),
    on: vi.fn().mockReturnValue(() => {})
  }
}));

describe('SettingsView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useSettings.setState({
      settings: {
        schemaVersion: 1,
        profile: 'intermediate',
        bar: { dataDir: 'C:/Games/BAR', source: 'default' },
        alerts: {},
        sound: { enabled: true, volume: 0.8 },
        chatEcho: false,
        hud: { enabled: true },
        coachWindow: { alwaysOnTop: true, overlayMode: false },
        assist: { armNext: false, factoryQueue: false },
        ai: { provider: 'none', model: null, baseUrl: null, anthropicFallbacks: true },
        updates: { checkOnLaunch: true },
        launcher: { showOnStart: true },
        globalShortcut: 'Ctrl+Alt+S',
        activePlanId: null
      },
      loading: false
    });

    useLive.setState({
      health: {
        status: 'bar-idle',
        message: 'Connected',
        lastHeartbeat: Date.now()
      }
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders settings view and defaults to game section', async () => {
    await act(async () => {
      root.render(<SettingsView />);
    });

    expect(container.querySelector('[data-testid="view-settings"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="settings-section-game"]')).not.toBeNull();
    expect(container.textContent).toContain('BAR GAME DIRECTORY');
  });

  it('switches between tabs when clicked', async () => {
    await act(async () => {
      root.render(<SettingsView />);
    });

    // Find tab buttons
    const tabs = Array.from(container.querySelectorAll('button[role="tab"]'));
    expect(tabs.length).toBe(6); // GAME COACH ASSIST AI APP DATA (About is its own page)

    // Switch to Coach
    const coachTab = tabs.find((t) => t.textContent?.includes('COACH'));
    expect(coachTab).toBeDefined();
    await act(async () => {
      coachTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="settings-section-coach"]')).not.toBeNull();
    expect(container.textContent).toContain('SKILL PROFILE');

    // Switch to Assist
    const assistTab = tabs.find((t) => t.textContent?.includes('ASSIST'));
    await act(async () => {
      assistTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="settings-section-assist"]')).not.toBeNull();
    expect(container.textContent).toContain('IN-GAME ASSIST');

    // Switch to AI
    const aiTab = tabs.find((t) => t.textContent?.includes('AI'));
    await act(async () => {
      aiTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="settings-section-ai"]')).not.toBeNull();
    expect(container.textContent).toContain('AI DRAFTING');

    // Switch to App
    const appTab = tabs.find((t) => t.textContent?.includes('APP'));
    await act(async () => {
      appTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="settings-section-app"]')).not.toBeNull();
    expect(container.textContent).toContain('GLOBAL SHORTCUT');

    // Switch to Data
    const dataTab = tabs.find((t) => t.textContent?.includes('DATA'));
    await act(async () => {
      dataTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="settings-section-data"]')).not.toBeNull();
    expect(container.textContent).toContain('BACKUP BUILD ORDERS');

    // About lives on the About page only (no duplicate tab)
    expect(tabs.some((t) => t.textContent?.includes('ABOUT'))).toBe(false);
  });
});
