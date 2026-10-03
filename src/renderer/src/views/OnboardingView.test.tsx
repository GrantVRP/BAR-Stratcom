// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OnboardingView } from './OnboardingView';
import { usePlans, useSettings } from '../stores';
import type { BuildPlan } from '../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../lib/ipc-client', () => ({
  ipcClient: {
    invoke: vi.fn().mockImplementation((channel: string, payload?: unknown) => {
      if (channel === 'game:locate') {
        return Promise.resolve({
          ok: true,
          data: { dataDir: 'C:/Games/BAR', source: 'default' }
        });
      }
      if (channel === 'game:widgetStatus') {
        return Promise.resolve({
          ok: true,
          data: {
            installed: false,
            installedVersion: null,
            bundledVersion: '3.0.1',
            legacyPresent: false
          }
        });
      }
      if (channel === 'game:installWidget') {
        return Promise.resolve({
          ok: true,
          data: { success: true, message: 'Widget installed successfully.' }
        });
      }
      if (channel === 'settings:set') {
        const current = useSettings.getState().settings;
        return Promise.resolve({
          ok: true,
          data: { ...current, ...((payload as object) ?? {}) }
        });
      }
      if (channel === 'coach:start') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, data: {} });
    }),
    on: vi.fn().mockReturnValue(() => {})
  }
}));

const mockPlan: BuildPlan = {
  schemaVersion: 1,
  id: 'cortex-opening',
  title: 'Cortex Opening',
  factionId: 'cortex',
  gameVersion: 'release',
  modes: ['1v1'],
  role: 'any',
  skill: 'intermediate',
  energyStyle: 'solar',
  opening: 'bot',
  tags: [],
  source: { kind: 'own-game', sessionId: 'sess-1', map: 'barr.smf', capturedAt: '2026-10-01' },
  steps: [{ id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'cormex', count: 1 }]
};

describe('OnboardingView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.location.hash = '#/onboarding';
    localStorage.clear();

    useSettings.setState({
      settings: {
        schemaVersion: 1,
        profile: 'intermediate',
        bar: { dataDir: null, source: null },
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

    usePlans.setState({ plans: [mockPlan], activePlanId: null });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders Step 1 Welcome on initial mount', async () => {
    await act(async () => {
      root.render(<OnboardingView />);
    });

    expect(container.querySelector('[data-testid="view-onboarding"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="onboarding-step-1"]')).not.toBeNull();
    expect(container.textContent).toContain('WELCOME TO BAR STRATCOM');
  });

  it('skipping sets localStorage flag and navigates to #/home', async () => {
    await act(async () => {
      root.render(<OnboardingView />);
    });

    const skipBtn = container.querySelector('[data-testid="onboarding-skip-btn"]') as HTMLButtonElement;
    expect(skipBtn).not.toBeNull();

    await act(async () => {
      skipBtn.click();
    });

    expect(localStorage.getItem('stratcom:onboarding-completed')).toBe('true');
    expect(window.location.hash).toBe('#/home');
  });

  it('steps through all 6 wizard steps and finishes to #/home', async () => {
    await act(async () => {
      root.render(<OnboardingView />);
    });

    // Step 1 -> Step 2
    let nextBtn = container.querySelector('[data-testid="onboarding-next-btn"]') as HTMLButtonElement;
    await act(async () => {
      nextBtn.click();
    });
    expect(container.querySelector('[data-testid="onboarding-step-2"]')).not.toBeNull();

    // Step 2 -> Step 3
    nextBtn = container.querySelector('[data-testid="onboarding-next-btn"]') as HTMLButtonElement;
    await act(async () => {
      nextBtn.click();
    });
    expect(container.querySelector('[data-testid="onboarding-step-3"]')).not.toBeNull();

    // Step 3 -> Step 4
    nextBtn = container.querySelector('[data-testid="onboarding-next-btn"]') as HTMLButtonElement;
    await act(async () => {
      nextBtn.click();
    });
    expect(container.querySelector('[data-testid="onboarding-step-4"]')).not.toBeNull();

    // In Step 4: change profile
    const advBtn = container.querySelector('[data-testid="profile-card-advanced"]') as HTMLButtonElement;
    expect(advBtn).not.toBeNull();
    await act(async () => {
      advBtn.click();
    });
    expect(useSettings.getState().settings?.profile).toBe('advanced');

    // Step 4 -> Step 5
    nextBtn = container.querySelector('[data-testid="onboarding-next-btn"]') as HTMLButtonElement;
    await act(async () => {
      nextBtn.click();
    });
    expect(container.querySelector('[data-testid="onboarding-step-5"]')).not.toBeNull();

    // Step 5 -> Step 6
    nextBtn = container.querySelector('[data-testid="onboarding-next-btn"]') as HTMLButtonElement;
    await act(async () => {
      nextBtn.click();
    });
    expect(container.querySelector('[data-testid="onboarding-step-6"]')).not.toBeNull();

    // Finish Step 6
    const finishBtn = container.querySelector('[data-testid="onboarding-finish-btn"]') as HTMLButtonElement;
    expect(finishBtn).not.toBeNull();
    await act(async () => {
      finishBtn.click();
    });

    expect(localStorage.getItem('stratcom:onboarding-completed')).toBe('true');
    expect(window.location.hash).toBe('#/home');
  });
});
