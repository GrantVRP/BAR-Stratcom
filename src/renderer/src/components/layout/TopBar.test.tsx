// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { BuildPlan } from '../../../../core/schemas';
import { usePlans } from '../../stores/usePlans';
import { TopBar } from './TopBar';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function plan(id: string, factionId: string): BuildPlan {
  return {
    schemaVersion: 1,
    id,
    title: `${factionId} test plan`,
    factionId,
    gameVersion: 'test',
    modes: ['1v1'],
    role: 'any',
    skill: 'intermediate',
    opening: 'bot',
    energyStyle: 'wind',
    source: { kind: 'manual', createdAt: '2026-10-04T00:00:00.000Z' },
    steps: [{ id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armmex', count: 1, targetTime: 5 }]
  } as BuildPlan;
}

describe('TopBar PLAN chip (T10.7)', () => {
  let container: HTMLDivElement;
  let root: Root;
  const chip = (): HTMLElement => container.querySelector('[data-testid="active-plan-chip"]')!;
  const title = (): HTMLElement => container.querySelector('[data-testid="active-plan-title"]')!;

  beforeEach(() => {
    usePlans.setState({ plans: [plan('p-cor', 'cortex'), plan('p-arm', 'armada')], activePlanId: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    usePlans.getState().reset();
  });

  it('takes the active plan faction colour: Cortex red, then Armada blue', async () => {
    usePlans.setState({ activePlanId: 'p-cor' });
    await act(async () => root.render(<TopBar />));
    expect(chip().getAttribute('data-faction')).toBe('cortex');
    expect(chip().style.borderColor).toBe('#ff2244');
    expect(title().style.color).toBe('#ff2244');
    expect(chip().querySelector('[data-faction-emblem="cortex"]')).not.toBeNull();

    await act(async () => usePlans.setState({ activePlanId: 'p-arm' }));
    expect(chip().getAttribute('data-faction')).toBe('armada');
    expect(chip().style.borderColor).toBe('#449bed');
    expect(title().style.color).toBe('#449bed');
  });

  it('has no UNOFFICIAL tag (owner request, T06.16; the notice is on the About page)', async () => {
    await act(async () => root.render(<TopBar />));
    expect(container.querySelector('[data-testid="unofficial-tag"]')).toBeNull();
    expect(container.textContent).not.toContain('UNOFFICIAL');
  });

  it('stays neutral when no plan is active', async () => {
    await act(async () => root.render(<TopBar />));
    expect(chip().getAttribute('data-faction')).toBe('none');
    expect(chip().style.borderColor).toBe('');
    expect(title().textContent).toBe('NONE ACTIVE');
  });
});
