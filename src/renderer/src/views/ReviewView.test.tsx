// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReviewView } from './ReviewView';
import { useSessions, useSettings, useSnapshot } from '../stores';
import type { Settings } from '../../../core/schemas/settings';
import type { SessionDetail, SessionSummary } from '../../../core/schemas/session';
import testSnapshotRaw from '../../../core/registry/__test__/test-snapshot.json';
import type { UnitSnapshot } from '../../../core/schemas';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockDetail: SessionDetail = {
  meta: {
    schemaVersion: 1,
    sessionId: 'session-demo-01',
    mode: 'player',
    gameVersion: 'release',
    engineVersion: '105.1.1',
    mapScriptName: 'Red_River_Remake',
    durationSec: 420,
    startedAt: '2026-10-02T12:00:00.000Z',
    teams: [{ teamId: 0, allyTeamId: 0, playerName: 'CommanderAlpha', factionId: 'armada', isMe: true }],
    start: null,
    source: 'fixture', // DEMO badge!
    anonymized: false
  },
  report: {
    schemaVersion: 1,
    sessionId: 'session-demo-01',
    profile: 'intermediate',
    factionId: 'armada',
    metrics: {
      durationSec: 420,
      energyStallSec: 5.5,
      metalStallSec: 1.2,
      metalFloatSec: 10.0,
      energyFloatSec: 0,
      idleFactorySec: 2.0,
      idleBuilderSec: 12.0,
      idleCommanderSec: 4.0,
      bpUtilisation: 0.88,
      timeToFirstFactory: 34,
      timeToT2: null,
      incomeAt: { '180': null, '300': null, '480': null, '600': null }
    },
    steps: [
      { stepId: 's-1', plannedFinish: 35, actualFinish: 33, deltaSec: -2 },
      { stepId: 's-2', plannedFinish: 60, actualFinish: 68, deltaSec: 8 }
    ],
    adherence: 0.85,
    benchmark: null,
    tips: [
      { id: 'tip-e-stall', severity: 'warn', text: 'Consider building second solar earlier.' }
    ],
    grade: 'A',
    profileSuggestion: {
      to: 'advanced',
      reason: 'Consecutive A grades achieved.'
    }
  },
  hasState: true,
  hasEvents: true,
  series: {
    states: [],
    events: []
  }
};

const mockSummary: SessionSummary = {
  sessionId: 'session-demo-01',
  startedAt: '2026-10-02T12:00:00.000Z',
  durationSec: 420,
  mapScriptName: 'Red_River_Remake',
  mode: 'player',
  factionId: 'armada',
  playerName: 'CommanderAlpha',
  source: 'fixture',
  grade: 'A',
  adherence: 0.85,
  hasReport: true
};

describe('ReviewView (06 §4.6, T07.4)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    window.location.hash = '#/review';

    useSnapshot.setState({
      snapshot: testSnapshotRaw as unknown as UnitSnapshot,
      loading: false,
      error: null
    });

    useSettings.setState({
      settings: {
        schemaVersion: 1,
        profile: 'intermediate',
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

    (window as unknown as { stratcom: unknown }).stratcom = {
      invoke: vi.fn().mockImplementation((channel) => {
        if (channel === 'sessions:list') {
          return Promise.resolve({ ok: true, data: [mockSummary] });
        }
        if (channel === 'sessions:get') {
          return Promise.resolve({ ok: true, data: mockDetail });
        }
        return Promise.resolve({ ok: true, data: null });
      }),
      on: vi.fn().mockReturnValue(() => {})
    };
  });

  afterEach(() => {
    delete (window as unknown as { stratcom?: unknown }).stratcom;
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders empty state when no sessions exist', async () => {
    useSessions.setState({ sessions: [], latestSession: null });
    (window as unknown as { stratcom: { invoke: unknown } }).stratcom.invoke = vi.fn().mockResolvedValue({
      ok: true,
      data: []
    });

    await act(async () => {
      root.render(<ReviewView />);
    });

    expect(container.querySelector('[data-testid="review-empty-state"]')).not.toBeNull();
    expect(container.textContent).toContain('NO SESSIONS RECORDED');
  });

  it('renders report with DEMO badge, grade A, tips, 7 metrics, adherence, and action button', async () => {
    useSessions.setState({ sessions: [mockSummary], latestSession: mockDetail });

    await act(async () => {
      root.render(<ReviewView />);
    });

    expect(container.querySelector('[data-testid="view-review"]')).not.toBeNull();
    // DEMO badge in header and session list
    expect(container.querySelector('[data-testid="review-demo-badge"]')).not.toBeNull();
    // Grade A badge
    const gradeBadge = container.querySelector('[data-testid="review-grade-badge"]');
    expect(gradeBadge?.textContent).toBe('A');
    // Tips
    expect(container.textContent).toContain('Consider building second solar earlier.');
    // 7 Metrics
    expect(container.querySelector('[data-testid="metric-tile-energy-stall"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="metric-tile-bp-utilisation"]')).not.toBeNull();
    // Step adherence
    expect(container.querySelector('[data-testid="step-adherence-chart"]')).not.toBeNull();
    // Economy and benchmark
    expect(container.querySelector('[data-testid="review-economy-chart"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="review-benchmark-chart"]')).not.toBeNull();
    // Save opening action button
    expect(container.querySelector('[data-testid="btn-save-opening"]')).not.toBeNull();
  });

  it('renders profile suggestion banner when suggestion is present in report', async () => {
    useSessions.setState({ sessions: [mockSummary], latestSession: mockDetail });

    await act(async () => {
      root.render(<ReviewView />);
    });

    const banner = container.querySelector('[data-testid="profile-suggestion-banner"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Consecutive A grades achieved.');
  });
});
