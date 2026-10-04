// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CoachNextCard } from './CoachNextCard';
import type { CoachStep } from '../../../../core/schemas/coach';
import type { BuildPlan, BuildStep } from '../../../../core/schemas/plans';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('CoachNextCard (T06.12)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const mockPlan: BuildPlan = {
    schemaVersion: 1,
    id: 'p1',
    title: 'Test Plan',
    factionId: 'cortex',
    gameVersion: 'release',
    modes: ['1v1'],
    role: 'any',
    skill: 'intermediate',
    opening: 'vehicle',
    energyStyle: 'wind',
    source: { kind: 'manual', createdAt: '2026-10-03' },
    steps: []
  };

  const planStep: BuildStep = {
    id: 's1',
    actor: { kind: 'commander' },
    action: 'build',
    unitId: 'corvp',
    count: 1,
    targetTime: 201
  };

  const currentStep: CoachStep = {
    stepId: 's1',
    status: 'current',
    plannedStart: 85,
    plannedFinish: 201, // 3:21
    actualFinish: null
  };

  it('displays planned time explicitly as @m:ss (in m:ss) when clock <= plannedFinish', () => {
    act(() => {
      root.render(
        <CoachNextCard
          currentStep={currentStep}
          planStep={planStep}
          plan={mockPlan}
          aheadBehindSec={0}
          clock={85} // 116s remaining -> in 1:56
          getUnitName={(id) => (id === 'corvp' ? 'Vehicle Plant' : 'Unknown unit')}
        />
      );
    });

    const countdownEl = container.querySelector('[data-testid="coach-next-countdown"]');
    expect(countdownEl?.textContent).toBe('@3:21 (in 1:56)');
    expect(countdownEl?.className).toContain('text-[#4ade80]');

    const unitEl = container.querySelector('[data-testid="coach-next-unit"]');
    expect(unitEl?.textContent).toBe('1× Vehicle Plant');
  });

  it('displays LATE +m:ss in danger tone when step itself is overdue (clock > plannedFinish)', () => {
    act(() => {
      root.render(
        <CoachNextCard
          currentStep={currentStep}
          planStep={planStep}
          plan={mockPlan}
          aheadBehindSec={-28}
          clock={229} // 28s late -> LATE +0:28
          getUnitName={(id) => (id === 'corvp' ? 'Vehicle Plant' : 'Unknown unit')}
        />
      );
    });

    const countdownEl = container.querySelector('[data-testid="coach-next-countdown"]');
    expect(countdownEl?.textContent).toBe('LATE +0:28');
    expect(countdownEl?.className).toContain('text-[#f87171]');
  });

  it('never renders raw unitId when unit is not found in getUnitName', () => {
    act(() => {
      root.render(
        <CoachNextCard
          currentStep={currentStep}
          planStep={planStep}
          plan={mockPlan}
          aheadBehindSec={null}
          clock={85}
          getUnitName={() => 'Unknown unit'}
        />
      );
    });

    const unitEl = container.querySelector('[data-testid="coach-next-unit"]');
    expect(unitEl?.textContent).toBe('1× Unknown unit');
    expect(unitEl?.textContent).not.toContain('corvp');
  });
});
