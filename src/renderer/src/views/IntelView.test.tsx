// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntelPropertyChange, IntelReplaySummary } from '../../../core/schemas/intel';
import { setIpcClientOverride } from '../lib/ipc-client';
import { changeLines } from '../components/intel/BalanceTab';
import { BATTLES_REFRESH_MS } from '../components/intel/BattlesTab';
import { teamsText } from '../components/intel/ReplaysTab';
import { IntelView } from './IntelView';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cached = <T,>(data: T, stale = false) => ({ ok: true, data: { data, fetchedAt: '2026-10-05T12:00:00.000Z', stale } });
const battle = {
  battleId: 7,
  title: 'Test lobby',
  game: 'Beyond All Reason test',
  map: 'Test Map',
  locked: false,
  passworded: false,
  maxPlayers: 2,
  gameStatus: 'running',
  gameTime: 75,
  founder: { username: 'Host' },
  players: [{ username: 'Alice', gameStatus: 'Playing', skill: '[30 ??]' }]
};

describe('IntelView (T10.2, 06 §4.7)', () => {
  let container: HTMLDivElement;
  let root: Root;
  let invoke: ReturnType<typeof vi.fn>;
  let visibility: DocumentVisibilityState;

  beforeEach(() => {
    vi.useFakeTimers();
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    invoke = vi.fn((channel: string) => {
      if (channel === 'intel:battles') return Promise.resolve(cached([battle]));
      if (channel === 'intel:leaderboard') return Promise.resolve(cached({ season: 3, categories: [{ name: 'Duel', players: [{ id: 1, name: 'Bob', rating: 40.123 }] }] }, true));
      return Promise.resolve({ ok: false, code: 'E_HANDLER_ERROR', message: 'fetch failed' });
    });
    setIpcClientOverride({ invoke: invoke as never, on: () => () => undefined, isAvailable: () => true });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setIpcClientOverride(null);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const battleCalls = (): number => invoke.mock.calls.filter(([c]) => c === 'intel:battles').length;
  const tab = (label: string): HTMLButtonElement =>
    [...container.querySelectorAll<HTMLButtonElement>('button[role="tab"]')].find((b) => b.textContent === label)!;

  it('refreshes battles every 20 s, only while the window is visible and the tab is shown', async () => {
    await act(async () => root.render(<IntelView />));
    expect(battleCalls()).toBe(1);
    expect(container.textContent).toContain('IN GAME 1:15');
    expect(container.textContent).toContain('1/2 PLAYING');

    await act(async () => vi.advanceTimersByTime(BATTLES_REFRESH_MS));
    expect(battleCalls()).toBe(2);

    visibility = 'hidden';
    await act(async () => vi.advanceTimersByTime(BATTLES_REFRESH_MS * 3));
    expect(battleCalls()).toBe(2);

    visibility = 'visible';
    await act(async () => tab('LEADERBOARD').click());
    await act(async () => vi.advanceTimersByTime(BATTLES_REFRESH_MS * 3));
    expect(battleCalls()).toBe(2);
    expect(container.textContent).toContain('SEASON 3');
    expect(container.textContent).toContain('40.12');
    // cached data after a failed fetch says so
    expect(container.textContent).toContain('OFFLINE // data from');
  });

  it('explains an offline service with no cached data and retries', async () => {
    await act(async () => root.render(<IntelView />));
    await act(async () => tab('BALANCE').click());
    const offline = container.querySelector('[data-testid="intel-offline"]')!;
    expect(offline.textContent).toContain('INTEL-OFFLINE');
    const before = invoke.mock.calls.filter(([c]) => c === 'intel:balance').length;
    await act(async () => offline.querySelector('button')!.click());
    expect(invoke.mock.calls.filter(([c]) => c === 'intel:balance').length).toBe(before + 1);
  });

  it('flattens balance-change trees and names replay teams', () => {
    const unit: IntelPropertyChange = {
      propertyId: 'armemp',
      propertyName: 'Paralyzer',
      changeType: 'Modified',
      changes: [
        { propertyId: 'weapondefs', propertyName: 'Weapons', changeType: 'Modified', changes: [{ propertyId: 'turnrate', propertyName: 'Turn Rate', changeType: 'Modified', prevValue: 10000, newValue: 19000, percentChange: 90 }] },
        { propertyId: 'energycost', propertyName: 'Energy Cost', changeType: 'Modified', prevValue: 100, newValue: 90 }
      ]
    };
    expect(changeLines(unit)).toEqual([
      { path: 'Weapons › Turn Rate', prev: 10000, next: 19000, percent: 90 },
      { path: 'Energy Cost', prev: 100, next: 90, percent: null }
    ]);

    const replay = (teams: IntelReplaySummary['AllyTeams']): IntelReplaySummary => ({ id: 'x', startTime: '', durationMs: 0, Map: { fileName: 'm', scriptName: 'M' }, AllyTeams: teams });
    expect(teamsText(replay([{ Players: [] }, { winningTeam: true, Players: [{ name: 'A' }, { name: 'B' }], AIs: [{ shortName: 'BARb' }] }]))).toBe('A, B, BARb (AI) (WON)');
    expect(teamsText(replay([{ Players: [] }]))).toBe('No players listed');
  });
});
