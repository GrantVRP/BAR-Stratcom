// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HomeView } from './HomeView';
import { useCoach, useLive, usePlans } from '../stores';
import type { BuildPlan } from '../../../core/schemas/plans';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../lib/ipc-client', () => ({
  ipcClient: {
    invoke: vi.fn().mockResolvedValue({ ok: true }),
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
    kind: 'curated',
    replayId: 'rep123',
    player: 'ProPlayer',
    map: 'barr.smf',
    playedAt: '2026-10-01',
    gameVersion: 'release',
    reviewedBy: 'StratCom',
    reviewedAt: '2026-10-01'
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

  it('triggers demo coaching start when DEMO button is clicked', async () => {
    const startSpy = vi.spyOn(useCoach.getState(), 'start').mockResolvedValue(true);

    act(() => {
      root.render(<HomeView />);
    });

    const demoBtn = container.querySelector('[data-testid="home-start-demo-btn"]') as HTMLButtonElement;
    expect(demoBtn).not.toBeNull();

    await act(async () => {
      demoBtn.click();
    });

    expect(startSpy).toHaveBeenCalledWith({
      mode: 'demo',
      demoId: '2026-10-01-cortex-1v1-vs-ai-barr',
      speed: 4
    });
  });
});
