// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveOpeningModal } from './SaveOpeningModal';
import { useSnapshot } from '../../stores';
import type { SessionDetail } from '../../../../core/schemas/session';
import type { UnitSnapshot } from '../../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import testSnapshotRaw from '../../../../core/registry/__test__/test-snapshot.json';

const mockSnapshot = testSnapshotRaw as unknown as UnitSnapshot;

const mockSession: SessionDetail = {
  meta: {
    schemaVersion: 1,
    sessionId: 'session-player-1',
    mode: 'player',
    gameVersion: 'release',
    engineVersion: '105.1.1',
    mapScriptName: 'Red_River_Remake',
    durationSec: 400,
    startedAt: '2026-10-02T10:00:00.000Z',
    teams: [
      { teamId: 0, allyTeamId: 0, playerName: 'CommanderAlpha', factionId: 'armada', isMe: true }
    ],
    start: null,
    source: 'live',
    anonymized: false
  },
  report: null,
  hasState: true,
  hasEvents: true,
  series: {
    states: [],
    events: [
      { tm: 0, e: 'created', d: 'armcom', u: 1, f: 0 },
      { tm: 0, e: 'finished', d: 'armcom', u: 1, f: 0 },
      { tm: 0, bd: 'armcom', b: 1, e: 'created', d: 'armmex', u: 10, f: 180 },
      { tm: 0, e: 'finished', d: 'armmex', u: 10, f: 360 }
    ] as unknown as Array<Record<string, unknown>>
  }
};

describe('SaveOpeningModal (06 §4.6, T07.4)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    useSnapshot.setState({ snapshot: mockSnapshot, loading: false, error: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    delete (window as unknown as { stratcom?: unknown }).stratcom;
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('renders modal with derived plan summary and saves on confirm', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();

    const mockInvoke = vi.fn().mockImplementation((channel, arg) => {
      if (channel === 'plans:save') {
        return Promise.resolve({ ok: true, data: arg });
      }
      return Promise.resolve({ ok: true, data: [] });
    });

    (window as unknown as { stratcom: unknown }).stratcom = {
      invoke: mockInvoke,
      on: vi.fn().mockReturnValue(() => {})
    };

    await act(async () => {
      root?.render(
        <SaveOpeningModal
          session={mockSession}
          isOpen={true}
          onClose={onClose}
          onSaved={onSaved}
        />
      );
    });

    const modal = container?.querySelector('[data-testid="save-opening-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('SAVE MY OPENING AS PLAN');
    expect(modal?.textContent).toContain('1 STEPS');

    const saveBtn = container?.querySelector(
      '[data-testid="save-plan-confirm-btn"]'
    ) as HTMLButtonElement | null;
    expect(saveBtn).not.toBeNull();
    expect(saveBtn?.disabled).toBe(false);

    await act(async () => {
      saveBtn?.click();
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'plans:save',
      expect.objectContaining({
        title: expect.stringContaining('CommanderAlpha'),
        source: expect.objectContaining({
          kind: 'own-game',
          sessionId: 'session-player-1'
        })
      })
    );
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
