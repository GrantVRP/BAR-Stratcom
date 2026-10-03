// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LibraryView } from './LibraryView';
import { usePlans, useSnapshot } from '../stores';
import type { BuildPlan } from '../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const testPlans: BuildPlan[] = [
  {
    schemaVersion: 1,
    id: 'armada-test-plan',
    title: 'Armada Rocketeer Rush',
    description: 'Fast armada rocketeer rush on Red River.',
    factionId: 'armada',
    gameVersion: 'test-31479-433a460',
    modes: ['1v1'],
    role: 'front',
    skill: 'beginner',
    opening: 'bot',
    energyStyle: 'solar',
    source: {
      kind: 'curated',
      replayId: 'rep1',
      player: 'AcePilot',
      map: 'Red River',
      playedAt: '2026-10-01T00:00:00Z',
      gameVersion: '1.0',
      reviewedBy: 'StratCom',
      reviewedAt: '2026-10-02T00:00:00Z'
    },
    steps: [
      {
        id: 's1',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armmex',
        count: 2,
        targetTime: 6,
        text: 'Initial mexes'
      },
      {
        id: 's2',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armlab',
        count: 1,
        targetTime: 30,
        text: 'Bot lab'
      }
    ],
    tags: ['rocketeer', 'rush']
  },
  {
    schemaVersion: 1,
    id: 'cortex-test-plan',
    title: 'Cortex Grunt Swarm',
    description: 'Aggressive cortex grunt swarm.',
    factionId: 'cortex',
    gameVersion: 'test-31479-433a460',
    modes: ['1v1'],
    role: 'front',
    skill: 'intermediate',
    opening: 'vehicle',
    energyStyle: 'wind',
    source: {
      kind: 'manual',
      createdAt: '2026-10-02T12:00:00Z'
    },
    steps: [
      {
        id: 'c1',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'cormex',
        count: 1,
        targetTime: 5
      }
    ],
    tags: ['grunt']
  }
];

describe('LibraryView & PlanDetailView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.location.hash = '#/library';

    usePlans.setState({
      plans: testPlans,
      activePlanId: null,
      loading: false,
      error: null,
      loadPlans: vi.fn().mockResolvedValue(undefined)
    });

    const unitsMap = new Map();
    unitsMap.set('armmex', {
      id: 'armmex',
      name: 'Metal Extractor',
      metalCost: 50,
      energyCost: 500,
      buildTime: 1200
    });
    unitsMap.set('armlab', {
      id: 'armlab',
      name: 'Bot Lab',
      metalCost: 600,
      energyCost: 1200,
      buildTime: 4000
    });

    useSnapshot.setState({
      snapshot: {
        schemaVersion: 1,
        gameVersion: 'test-31479-433a460',
        engineVersion: '105.1.1',
        exportedAt: '2026-10-01T00:00:00Z',
        source: 'test-fixture',
        units: []
      },
      unitsById: unitsMap,
      loading: false,
      error: null,
      load: vi.fn().mockResolvedValue(undefined)
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders all plans in the grid initially', async () => {
    await act(async () => {
      root.render(<LibraryView />);
    });

    expect(container.querySelector('[data-testid="view-library"]')).not.toBeNull();
    expect(container.textContent).toContain('Armada Rocketeer Rush');
    expect(container.textContent).toContain('Cortex Grunt Swarm');
    expect(container.textContent).toContain('CURATED // from AcePilot on Red River, 2026-10-01');

    const cardTitle = container.querySelector('[data-testid="plan-card-armada-test-plan"] h3');
    expect(cardTitle?.getAttribute('title')).toBe('Armada Rocketeer Rush');
    expect(cardTitle?.className).toContain('truncate');
  });

  it('filters plans by faction', async () => {
    await act(async () => {
      root.render(<LibraryView />);
    });

    const factionSelect = container.querySelector('[data-testid="filter-faction"]') as HTMLSelectElement;
    expect(factionSelect).not.toBeNull();

    await act(async () => {
      factionSelect.value = 'cortex';
      factionSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).not.toContain('Armada Rocketeer Rush');
    expect(container.textContent).toContain('Cortex Grunt Swarm');
  });

  it('filters plans by text search', async () => {
    await act(async () => {
      root.render(<LibraryView />);
    });

    const searchInput = container.querySelector('[data-testid="input-library-search"]') as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(searchInput, 'Rocketeer');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Armada Rocketeer Rush');
    expect(container.textContent).not.toContain('Cortex Grunt Swarm');
  });

  it('opens PlanDetailView on card click and renders timeline rows', async () => {
    await act(async () => {
      root.render(<LibraryView />);
    });

    const card = container.querySelector('[data-testid="plan-card-armada-test-plan"]') as HTMLElement;
    expect(card).not.toBeNull();

    await act(async () => {
      card.click();
    });

    // Detail view should now be rendered
    expect(container.querySelector('[data-testid="view-plan-detail"]')).not.toBeNull();
    expect(container.textContent).toContain('Armada Rocketeer Rush');
    expect(container.textContent).toContain('BUILD TIMELINE');

    // Timeline rows
    const step0 = container.querySelector('[data-testid="timeline-step-0"]');
    expect(step0).not.toBeNull();
    expect(step0?.textContent).toContain('[CDR]');
    expect(step0?.textContent).toContain('2× Metal Extractor');
    expect(step0?.textContent).toContain('Initial mexes');

    // Back button
    const backBtn = container.querySelector('[data-testid="btn-back-to-library"]') as HTMLButtonElement;
    expect(backBtn).not.toBeNull();

    await act(async () => {
      backBtn.click();
    });

    // Should return to library
    expect(container.querySelector('[data-testid="view-library"]')).not.toBeNull();
  });

  it('activates plan on ACTIVATE button click', async () => {
    await act(async () => {
      root.render(<LibraryView />);
    });

    const card = container.querySelector('[data-testid="plan-card-armada-test-plan"]') as HTMLElement;
    await act(async () => {
      card.click();
    });

    const activateBtn = container.querySelector('[data-testid="btn-activate-plan"]') as HTMLButtonElement;
    expect(activateBtn).not.toBeNull();
    expect(activateBtn.textContent).toContain('ACTIVATE');

    await act(async () => {
      activateBtn.click();
    });

    expect(usePlans.getState().activePlanId).toBe('armada-test-plan');
  });
});
