// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeView } from '../../views/HomeView';
import { CoachView } from '../../views/CoachView';
import { HudBoxSwitches } from './HudBoxSwitches';
import { RadarContacts } from './RadarContacts';
import { useCoach, useLive, usePlans, useSettings } from '../../stores';
import { ipcClient } from '../../lib/ipc-client';
import { defaultSettings } from '../../../../core/schemas/settings';
import type { CoachState } from '../../../../core/schemas/coach';
import type { LiveSnapshot } from '../../../../core/schemas/live';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../lib/ipc-client', () => ({
  ipcClient: {
    invoke: vi.fn().mockImplementation((channel: string, req: unknown) =>
      Promise.resolve(channel === 'settings:set' ? { ok: true, data: { ...defaultSettings(), ...(req as object) } } : { ok: true, data: { ok: true } })
    ),
    on: vi.fn().mockReturnValue(() => {})
  }
}));

const invoke = vi.mocked(ipcClient.invoke);
const names: Record<string, string> = { armpw: 'Pawn', armrock: 'Rocketeer' };
const getUnitName = (id?: string): string => names[id ?? ''] ?? String(id);

describe('radar mode and the IN-GAME HUD switches (owner request T09.6)', () => {
  let container: HTMLDivElement;
  let root: Root;
  const $ = (id: string): HTMLElement | null => container.querySelector(`[data-testid="${id}"]`);

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    invoke.mockClear();
    useSettings.setState({ settings: defaultSettings() });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    usePlans.getState().reset();
    useCoach.getState().reset();
    useLive.getState().reset();
  });

  it('Home: RADAR (NO PLAN) works without a plan, beside the one primary button; practice modes quiet', async () => {
    usePlans.setState({ plans: [], activePlanId: null });
    await act(async () => root.render(<HomeView />));
    const radar = $('home-start-radar-btn') as HTMLButtonElement;
    expect(radar.disabled).toBe(false);
    expect(($('home-start-live-btn') as HTMLButtonElement).disabled).toBe(true);
    expect($('home-start-live-btn')!.className).toContain('pixel-btn-primary');
    expect(radar.className).not.toContain('pixel-btn-primary');
    expect($('home-start-manual-btn')!.className).toContain('pixel-btn-ghost');
    expect($('home-start-demo-btn')!.className).toContain('pixel-btn-ghost');
    await act(async () => radar.click());
    expect(invoke).toHaveBeenCalledWith('coach:start', { mode: 'radar' });
    expect(window.location.hash).toBe('#/coach');
  });

  it('switches: in the order of the in-game stack; one change keeps the others and the display setting', async () => {
    await act(async () => root.render(<HudBoxSwitches />));
    expect(Array.from(container.querySelectorAll('[role="switch"]')).map((s) => s.getAttribute('aria-label'))).toEqual(['BUILDINGS', 'FACTORY', 'RADAR']);
    await act(async () => $('hud-box-switch-factory')!.click());
    expect(invoke).toHaveBeenCalledWith('settings:set', { hud: { enabled: true, boxes: { build: true, factory: false, radar: true } } });
  });

  it('switches are disabled, with a note, while the HUD display is off in Settings', async () => {
    useSettings.setState({ settings: { ...defaultSettings(), hud: { enabled: false } } });
    await act(async () => root.render(<HudBoxSwitches />));
    expect(($('hud-box-switch-build') as HTMLButtonElement).disabled).toBe(true);
    expect($('hud-box-switches')!.textContent).toContain('The HUD is off');
  });

  it('contacts: biggest group first, NEW for 15 s, then time in sight; total; empty states', async () => {
    await act(async () =>
      root.render(<RadarContacts enemies={{ armpw: 1, armrock: 3 }} seenAt={{ armpw: 95, armrock: 30 }} clock={100} getUnitName={getUnitName} />)
    );
    expect(Array.from(container.querySelectorAll('[data-testid="radar-contact"]')).map((r) => r.textContent)).toEqual([
      '3× Rocketeer1:10 in sight',
      '1× PawnNEW'
    ]);
    expect($('radar-contacts-total')!.textContent).toBe('4 IN SIGHT');
    await act(async () => root.render(<RadarContacts enemies={{}} seenAt={{}} clock={0} getUnitName={getUnitName} />));
    expect($('radar-contacts')!.textContent).toContain('No enemies in sight.');
    await act(async () => root.render(<RadarContacts enemies={null} seenAt={{}} clock={0} getUnitName={getUnitName} />));
    expect($('radar-contacts')!.textContent).toContain('Waiting for the game.');
  });

  it('Coach view in radar mode: badge, contacts and telemetry; no plan cards and no box switches', async () => {
    const state: CoachState = {
      mode: 'radar',
      clock: 40,
      planId: '',
      steps: [],
      currentStepIndex: 0,
      aheadBehindSec: null,
      alerts: [],
      projections: { energyEmptyInSec: null, metalEmptyInSec: null, metalFullInSec: null, energyFullInSec: null },
      profile: 'intermediate',
      enemySeenAt: { armpw: 35 }
    };
    useCoach.setState({ mode: 'radar', isRunning: true, coachState: state });
    useLive.setState({ snapshot: { enemies: { armpw: 2 } } as unknown as LiveSnapshot });
    await act(async () => root.render(<CoachView />));
    expect($('coach-mode-badge')!.textContent).toBe('RADAR (NO PLAN)');
    expect($('radar-contacts')!.textContent).toContain('2 IN SIGHT');
    expect($('coach-step-count')).toBeNull();
    expect($('hud-box-switches')).toBeNull();
    expect($('coach-stop-btn')).not.toBeNull();
  });
});
