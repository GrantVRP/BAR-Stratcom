// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CoachView } from './CoachView';
import { useCoach, usePlans } from '../stores';
import type { CoachState } from '../../../core/schemas/coach';
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
  id: 'test-plan-1',
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
    replayId: 'rep1',
    player: 'Player',
    map: 'barr.smf',
    playedAt: '2026-10-01',
    gameVersion: 'release',
    reviewedBy: 'Reviewer',
    reviewedAt: '2026-10-01'
  },
  steps: [
    { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'cormex', count: 2 },
    { id: 's2', actor: { kind: 'commander' }, action: 'build', unitId: 'corsolar', count: 1 }
  ]
};

const mockCoachState: CoachState = {
  mode: 'demo',
  clock: 45,
  planId: 'test-plan-1',
  currentStepIndex: 0,
  aheadBehindSec: 5,
  alerts: [
    {
      id: 'E_STALL_SOON',
      severity: 'warn',
      text: 'ENERGY EMPTY IN 6s',
      since: 40,
      dedupeKey: 'e-stall'
    }
  ],
  steps: [
    { stepId: 's1', status: 'current', plannedStart: 0, plannedFinish: 30, actualFinish: null },
    { stepId: 's2', status: 'upcoming', plannedStart: 30, plannedFinish: 60, actualFinish: null }
  ],
  projections: {
    energyEmptyInSec: 6,
    metalEmptyInSec: null,
    metalFullInSec: null,
    energyFullInSec: null
  },
  profile: 'intermediate'
};

describe('CoachView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    usePlans.setState({ plans: [mockPlan], activePlanId: 'test-plan-1' });
    useCoach.setState({
      coachState: mockCoachState,
      mode: 'demo',
      isRunning: true
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    useCoach.getState().reset();
    usePlans.getState().reset();
  });

  it('renders coach view with clock, next step, alerts, and mode', () => {
    act(() => {
      root.render(<CoachView />);
    });

    expect(container.querySelector('[data-testid="view-coach"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="coach-clock"]')?.textContent).toContain('0:45');
    expect(container.textContent).toContain('DEMO 4×');
    expect(container.textContent).toContain('1/2');
    expect(container.textContent).toContain('ENERGY EMPTY IN 6s');
    expect(container.querySelector('[data-testid="coach-next-card"]')).not.toBeNull();
  });

  it('renders manual clock controls when in manual mode', () => {
    act(() => {
      useCoach.setState({
        mode: 'manual',
        coachState: { ...mockCoachState, mode: 'manual' }
      });
      root.render(<CoachView />);
    });

    expect(container.textContent).toContain('MANUAL CLOCK');
    expect(container.textContent).toContain('START CLOCK');
    expect(container.textContent).toContain('(Space toggles clock)');
  });
});
