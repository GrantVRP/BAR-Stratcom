// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HomeView } from './HomeView';
import { useCoach, useLive, usePlans, useSessions, useSettings } from '../stores';
import type { BuildPlan } from '../../../core/schemas/plans';
import type { Settings } from '../../../core/schemas/settings';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../lib/ipc-client', () => ({
  ipcClient: {
    invoke: vi.fn().mockImplementation((channel: string) => {
      if (channel === 'demo:list') {
        return Promise.resolve({
          ok: true,
          data: [
            {
              id: '2026-10-01-cortex-1v1-vs-ai-barr',
              title: 'Cortex on BarR 1.1',
              description: '1v1 vs AI • 33:45',
              durationSec: 2025
            }
          ]
        });
      }
      return Promise.resolve({ ok: true });
    }),
    on: vi.fn().mockReturnValue(() => {})
  }
}));

const mockPlan: BuildPlan = {
  schemaVersion: 1,
  id: 'cortex-grunt-opening',
  title: 'Cortex Grunt Opening',
  factionId: 'cortex',
  gameVersion: 'release',
  modes: ['1v1'],
  role: 'any',
  skill: 'intermediate',
  energyStyle: 'solar',
  opening: 'bot',
  tags: [],
  source: {
    kind: 'own-game',
    sessionId: '2026-10-01-cortex-1v1-vs-ai-barr',
    map: 'BarR 1.1',
    capturedAt: '2026-10-01'
  },
  steps: [{ id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'cormex', count: 2 }]
};

describe('HomeView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    usePlans.setState({ plans: [mockPlan], activePlanId: 'cortex-grunt-opening' });
    useLive.setState({
      health: {
        status: 'no-bar',
        message: 'Detecting Beyond All Reason...',
        lastHeartbeat: null
      }
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    usePlans.getState().reset();
    useLive.getState().reset();
    useCoach.getState().reset();
  });

  it('renders status card, active plan card, and three coaching buttons', () => {
    act(() => {
      root.render(<HomeView />);
    });

    expect(container.querySelector('[data-testid="view-home"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="home-status-card"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="home-active-plan-card"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="home-last-game-card"]')).not.toBeNull();

    expect(container.textContent).toContain('COMMAND HOME');
    expect(container.textContent).toContain('Cortex Grunt Opening');
    expect(container.querySelector('[data-testid="home-start-live-btn"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="home-start-manual-btn"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="home-start-demo-btn"]')).not.toBeNull();
  });

  it('colours the active plan card by faction: Cortex red, Armada blue', async () => {
    const card = (): HTMLElement => container.querySelector('[data-testid="home-active-plan-card"]')!;
    const heading = (): HTMLElement => container.querySelector('[data-testid="home-active-plan-heading"]')!;
    await act(async () => root.render(<HomeView />));
    expect(card().getAttribute('data-faction')).toBe('cortex');
    expect(card().style.borderColor).toBe('#ff2244');
    expect(heading().style.color).toBe('#ff2244');

    const armadaPlan: BuildPlan = { ...mockPlan, id: 'armada-plan', title: 'Armada Plan', factionId: 'armada' };
    await act(async () => usePlans.setState({ plans: [mockPlan, armadaPlan], activePlanId: 'armada-plan' }));
    expect(card().getAttribute('data-faction')).toBe('armada');
    expect(card().style.borderColor).toBe('#449bed');
    expect(heading().style.color).toBe('#449bed');
  });

  it('keeps the active plan card neutral when there is no plan', async () => {
    usePlans.setState({ plans: [], activePlanId: null });
    await act(async () => root.render(<HomeView />));
    expect(container.querySelector('[data-testid="home-active-plan-card"]')!.getAttribute('data-faction')).toBe('none');
    expect((container.querySelector('[data-testid="home-active-plan-card"]') as HTMLElement).style.borderColor).toBe('');
  });

  it('triggers paired demo directly when active plan matches a fixture', async () => {
    const startSpy = vi.spyOn(useCoach.getState(), 'start').mockResolvedValue(true);

    act(() => {
      root.render(<HomeView />);
    });

    const demoBtn = container.querySelector('[data-testid="home-start-demo-btn"]') as HTMLButtonElement;
    expect(demoBtn).not.toBeNull();

    await act(async () => {
      demoBtn.click();
    });

    expect(startSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'demo',
        demoId: '2026-10-01-cortex-1v1-vs-ai-barr',
        speed: 4
      })
    );
  });

  it('opens demo picker modal when plan does not match bundled fixture', async () => {
    const unbundledPlan: BuildPlan = {
      ...mockPlan,
      source: { kind: 'manual', createdAt: '2026-10-02' }
    };
    usePlans.setState({ plans: [unbundledPlan], activePlanId: unbundledPlan.id });

    act(() => {
      root.render(<HomeView />);
    });

    const demoBtn = container.querySelector('[data-testid="home-start-demo-btn"]') as HTMLButtonElement;
    await act(async () => {
      demoBtn.click();
    });

    expect(container.querySelector('[data-testid="demo-picker-modal"]')).not.toBeNull();
  });

  it('renders profile suggestion banner when latest session has an active suggestion', async () => {
    useSettings.setState({
      settings: {
        schemaVersion: 1,
        profile: 'beginner',
        bar: { dataDir: null, source: null },
        alerts: {} as Settings['alerts'],
        sound: { enabled: true, volume: 0.8 },
        chatEcho: true,
        hud: { enabled: true },
        coachWindow: { alwaysOnTop: false, overlayMode: false },
        assist: { armNext: false, factoryQueue: false },
        ai: { provider: 'none', model: null, baseUrl: null, anthropicFallbacks: true },
        updates: { checkOnLaunch: false },
        launcher: { showOnStart: true },
        globalShortcut: 'Ctrl+Alt+S',
        activePlanId: null
      }
    });

    useSessions.setState({
      latestSession: {
        meta: {
          schemaVersion: 1,
          sessionId: 'test-sess',
          mode: 'player',
          gameVersion: 'test',
          engineVersion: '105.1.1',
          mapScriptName: 'Map',
          durationSec: 100,
          startedAt: '2026-10-01T00:00:00.000Z',
          teams: [{ teamId: 0, allyTeamId: 0, playerName: 'P', factionId: 'cortex', isMe: true }],
          start: null,
          source: 'live',
          anonymized: false
        },
        report: {
          schemaVersion: 1,
          sessionId: 'test-sess',
          profile: 'beginner',
          factionId: 'cortex',
          metrics: {
            durationSec: 100,
            energyStallSec: 0,
            metalStallSec: 0,
            metalFloatSec: 0,
            energyFloatSec: 0,
            idleFactorySec: 0,
            idleBuilderSec: 0,
            idleCommanderSec: 0,
            bpUtilisation: 0.9,
            timeToFirstFactory: 30,
            timeToT2: null,
            incomeAt: { '180': null, '300': null, '480': null, '600': null }
          },
          steps: [],
          adherence: 0.95,
          benchmark: null,
          tips: [],
          grade: 'S',
          profileSuggestion: {
            to: 'intermediate',
            reason: '3 great games on beginner.'
          }
        },
        hasState: true,
        hasEvents: true
      }
    });

    await act(async () => {
      root.render(<HomeView />);
    });

    expect(container.querySelector('[data-testid="profile-suggestion-banner"]')).not.toBeNull();
  });
});
