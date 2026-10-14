// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveOpeningModal } from './SaveOpeningModal';
import { useSnapshot } from '../../stores';
import type { SessionDetail } from '../../../../core/schemas/session';
import type { BuildPlan, UnitSnapshot } from '../../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import testSnapshotRaw from '../../../../core/registry/__test__/test-snapshot.json';

const mockSnapshot = testSnapshotRaw as unknown as UnitSnapshot;
const REPLAY_ID = 'feedbeeffeedbeeffeedbeeffeedbeef';
const noIssues = { errors: [], warnings: [] };

const fakePlan: BuildPlan = {
  schemaVersion: 1,
  id: 'plan-1',
  title: 'CommanderAlpha - Red_River_Remake',
  factionId: 'armada',
  gameVersion: 'release',
  modes: ['1v1'],
  role: 'any',
  skill: 'intermediate',
  opening: 'mixed',
  energyStyle: 'solar',
  source: {
    kind: 'own-game',
    sessionId: 'session-player-1',
    map: 'Red_River_Remake',
    capturedAt: '2026-10-02T10:00:00.000Z'
  },
  steps: [{ id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armmex', count: 1, targetTime: 6 }],
  notes: ''
};

function session(mode: 'player' | 'replay', teams: SessionDetail['meta']['teams']): SessionDetail {
  return {
    meta: {
      schemaVersion: 1,
      sessionId: mode === 'player' ? 'session-player-1' : 'session-replay-1',
      mode,
      gameVersion: 'release',
      engineVersion: '105.1.1',
      mapScriptName: mode === 'player' ? 'Red_River_Remake' : 'DWorld_V4',
      durationSec: 800,
      startedAt: '2026-10-02T12:00:00.000Z',
      teams,
      start: null,
      source: 'live',
      anonymized: false
    },
    report: null,
    hasState: true,
    hasEvents: true
  };
}

const mockPlayerSession = session('player', [
  { teamId: 0, allyTeamId: 0, playerName: 'CommanderAlpha', factionId: 'armada', isMe: true }
]);
const mockReplaySession = session('replay', [
  { teamId: 0, allyTeamId: 0, playerName: 'ProPlayerA', factionId: 'armada', isMe: false },
  { teamId: 1, allyTeamId: 1, playerName: 'ProPlayerB', factionId: 'cortex', isMe: false },
  { teamId: 2, allyTeamId: 1, playerName: 'ProPlayerC', factionId: 'legion', isMe: false }
]);

type ToPlanArg = { teamId: number; replayId?: string };

function player(teamId: number, name: string, faction: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { teamId, name, faction, allyTeam: teamId, isMe: false, capturable: true, reason: null, ...extra };
}

function mockIpc(players: unknown[], toPlan: (arg: ToPlanArg) => unknown): ReturnType<typeof vi.fn> {
  const invoke = vi.fn().mockImplementation((channel: string, arg: ToPlanArg) => {
    if (channel === 'capture:listPlayers') return Promise.resolve({ ok: true, data: players });
    if (channel === 'capture:toPlan') return Promise.resolve(toPlan(arg));
    if (channel === 'plans:save') return Promise.resolve({ ok: true, data: arg });
    return Promise.resolve({ ok: true, data: [] });
  });
  (window as unknown as { stratcom: unknown }).stratcom = { invoke, on: vi.fn().mockReturnValue(() => {}) };
  return invoke;
}

describe('SaveOpeningModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  const q = <T extends Element>(testId: string): T | null => container.querySelector<T>(`[data-testid="${testId}"]`);

  async function render(detail: SessionDetail, onSaved = vi.fn(), onClose = vi.fn()): Promise<void> {
    await act(async () => {
      root.render(<SaveOpeningModal session={detail} isOpen={true} onClose={onClose} onSaved={onSaved} />);
    });
  }

  async function change(el: HTMLInputElement | HTMLSelectElement, value: string): Promise<void> {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
      el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
  }

  beforeEach(() => {
    useSnapshot.setState({ snapshot: mockSnapshot, loading: false, error: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    delete (window as unknown as { stratcom?: unknown }).stratcom;
    act(() => root.unmount());
    container.remove();
  });

  it('saves the player own opening with the edited title', async () => {
    const invoke = mockIpc([player(0, 'CommanderAlpha', 'armada', { isMe: true })], () => ({
      ok: true,
      data: { plan: fakePlan, issues: noIssues }
    }));
    const onSaved = vi.fn();
    const onClose = vi.fn();
    await render(mockPlayerSession, onSaved, onClose);

    expect(q('save-opening-modal')?.textContent).toContain('SAVE MY OPENING AS PLAN');
    expect(q('select-capture-player')).toBeNull();
    expect(q('capture-validation-badge')?.textContent).toBe('VALID');
    expect(q('capture-preview-timeline')).not.toBeNull();

    const titleInput = q<HTMLInputElement>('save-opening-title-input')!;
    expect(titleInput.value).toBe(fakePlan.title);
    await change(titleInput, 'My Fast Lab');

    await act(async () => q<HTMLButtonElement>('save-plan-confirm-btn')!.click());

    expect(invoke).toHaveBeenCalledWith(
      'plans:save',
      expect.objectContaining({ title: 'My Fast Lab', source: fakePlan.source })
    );
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('disables players that cannot be captured and captures the chosen player with a replay link', async () => {
    const invoke = mockIpc(
      [
        player(0, 'ProPlayerA', 'armada'),
        player(1, 'ProPlayerB', 'cortex'),
        player(2, 'ProPlayerC', 'legion', { capturable: false, reason: 'Legion is not supported yet' })
      ],
      ({ teamId, replayId }) => ({
        ok: true,
        data: {
          plan: {
            ...fakePlan,
            title: `Team ${teamId}`,
            source: {
              kind: 'replay-capture',
              sessionId: 'session-replay-1',
              replayId,
              player: 'ProPlayerB',
              map: 'DWorld_V4',
              capturedAt: '2026-10-02T12:00:00.000Z'
            }
          },
          issues: noIssues
        }
      })
    );
    await render(mockReplaySession);

    const select = q<HTMLSelectElement>('select-capture-player')!;
    const options = Array.from(select.options);
    expect(options.map((o) => o.disabled)).toEqual([false, false, true]);
    expect(options[2]?.textContent).toContain('Legion is not supported yet');
    expect(invoke).toHaveBeenCalledWith('capture:toPlan', { sessionId: 'session-replay-1', teamId: 0 });

    await change(select, '1');
    expect(invoke).toHaveBeenCalledWith('capture:toPlan', { sessionId: 'session-replay-1', teamId: 1 });
    expect(q<HTMLInputElement>('save-opening-title-input')!.value).toBe('Team 1');

    const replayInput = q<HTMLInputElement>('input-capture-replay')!;
    await change(replayInput, 'not a replay');
    expect(q('capture-replay-error')).not.toBeNull();
    expect(q<HTMLButtonElement>('save-plan-confirm-btn')!.disabled).toBe(true);

    await change(replayInput, `https://bar-rts.com/replays/${REPLAY_ID}`);
    expect(q('capture-replay-error')).toBeNull();
    await act(async () => q<HTMLButtonElement>('save-plan-confirm-btn')!.click());

    expect(invoke).toHaveBeenCalledWith('capture:toPlan', {
      sessionId: 'session-replay-1',
      teamId: 1,
      replayId: REPLAY_ID
    });
    expect(invoke).toHaveBeenCalledWith(
      'plans:save',
      expect.objectContaining({ source: expect.objectContaining({ kind: 'replay-capture', replayId: REPLAY_ID }) })
    );
  });

  it('lists validation errors and blocks saving', async () => {
    mockIpc([player(0, 'ProPlayerA', 'armada')], () => ({
      ok: true,
      data: {
        plan: fakePlan,
        issues: {
          errors: [{ code: 'E_NOT_BUILDABLE', message: 'Commander cannot build this', stepId: 's1' }],
          warnings: []
        }
      }
    }));
    await render(mockReplaySession);

    expect(q('capture-validation-badge')?.textContent).toBe('1 ERRORS');
    expect(q('capture-validation-errors')?.textContent).toContain('Commander cannot build this');
    expect(q<HTMLButtonElement>('save-plan-confirm-btn')!.disabled).toBe(true);
  });

  it('explains why the player own game cannot be captured', async () => {
    const invoke = mockIpc(
      [
        player(0, 'CommanderAlpha', 'armada', {
          isMe: true,
          capturable: false,
          reason: 'No build events recorded for this player'
        })
      ],
      () => ({ ok: false, message: 'unexpected' })
    );
    await render(mockPlayerSession);

    expect(q('capture-error-msg')?.textContent).toBe('No build events recorded for this player');
    expect(invoke).not.toHaveBeenCalledWith('capture:toPlan', expect.anything());
    expect(q<HTMLButtonElement>('save-plan-confirm-btn')!.disabled).toBe(true);
  });
});
