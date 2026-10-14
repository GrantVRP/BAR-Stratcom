// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProfileSuggestionBanner } from './ProfileSuggestionBanner';
import { useSessions, useSettings } from '../../stores';
import type { SessionDetail } from '../../../../core/schemas/session';
import type { Settings } from '../../../../core/schemas/settings';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockDetail: SessionDetail = {
  meta: {
    schemaVersion: 1,
    sessionId: 'session-xyz',
    mode: 'player',
    gameVersion: 'release',
    engineVersion: '105.1.1',
    mapScriptName: 'Test_Map',
    durationSec: 500,
    startedAt: '2026-10-01T12:00:00.000Z',
    teams: [{ teamId: 0, allyTeamId: 0, playerName: 'Player', factionId: 'armada', isMe: true }],
    start: null,
    source: 'live',
    anonymized: false
  },
  report: {
    schemaVersion: 1,
    sessionId: 'session-xyz',
    profile: 'beginner',
    factionId: 'armada',
    metrics: {
      durationSec: 500,
      energyStallSec: 0,
      metalStallSec: 0,
      metalFloatSec: 0,
      energyFloatSec: 0,
      idleFactorySec: 0,
      idleBuilderSec: 0,
      idleCommanderSec: 0,
      bpUtilisation: 0.8,
      timeToFirstFactory: 35,
      timeToT2: null,
      incomeAt: { '180': null, '300': null, '480': null, '600': null }
    },
    steps: [],
    adherence: 0.9,
    benchmark: null,
    tips: [],
    grade: 'A',
    profileSuggestion: {
      to: 'intermediate',
      reason: 'Last 3 games on beginner achieved grade A or higher with >=80% adherence.'
    }
  },
  hasState: true,
  hasEvents: true
};

describe('ProfileSuggestionBanner', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();

    useSettings.setState({
      settings: {
        schemaVersion: 1,
        profile: 'beginner',
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
      },
      updateSettings: vi.fn().mockImplementation(async (partial) => {
        useSettings.setState((s) => ({
          settings: s.settings ? { ...s.settings, ...partial } : null
        }));
        return true;
      })
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders null when there is no report or suggestion is null', async () => {
    useSessions.setState({ latestSession: null });

    await act(async () => {
      root.render(<ProfileSuggestionBanner />);
    });

    expect(container.querySelector('[data-testid="profile-suggestion-banner"]')).toBeNull();
  });

  it('renders null when settings.profile is already equal to suggestion.to', async () => {
    useSettings.setState((s) => ({
      settings: s.settings ? { ...s.settings, profile: 'intermediate' } : null
    }));
    useSessions.setState({ latestSession: mockDetail });

    await act(async () => {
      root.render(<ProfileSuggestionBanner />);
    });

    expect(container.querySelector('[data-testid="profile-suggestion-banner"]')).toBeNull();
  });

  it('renders banner with reason and actions when suggestion is active', async () => {
    useSessions.setState({ latestSession: mockDetail });

    await act(async () => {
      root.render(<ProfileSuggestionBanner />);
    });

    const banner = container.querySelector('[data-testid="profile-suggestion-banner"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Last 3 games on beginner');
    expect(container.querySelector('[data-testid="profile-suggestion-accept"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="profile-suggestion-dismiss"]')).not.toBeNull();
  });

  it('clicking Accept updates profile setting, saves dismissal, and hides banner', async () => {
    useSessions.setState({ latestSession: mockDetail });

    await act(async () => {
      root.render(<ProfileSuggestionBanner />);
    });

    const acceptBtn = container.querySelector(
      '[data-testid="profile-suggestion-accept"]'
    ) as HTMLButtonElement;
    expect(acceptBtn).not.toBeNull();

    await act(async () => {
      acceptBtn.click();
    });

    expect(useSettings.getState().settings?.profile).toBe('intermediate');
    expect(localStorage.getItem('stratcom:dismissed-profile-suggestion')).toBe(
      'session-xyz:intermediate'
    );
    expect(container.querySelector('[data-testid="profile-suggestion-banner"]')).toBeNull();
  });

  it('clicking Dismiss saves dismissal and hides banner without changing profile', async () => {
    useSessions.setState({ latestSession: mockDetail });

    await act(async () => {
      root.render(<ProfileSuggestionBanner />);
    });

    const dismissBtn = container.querySelector(
      '[data-testid="profile-suggestion-dismiss"]'
    ) as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();

    await act(async () => {
      dismissBtn.click();
    });

    expect(useSettings.getState().settings?.profile).toBe('beginner');
    expect(localStorage.getItem('stratcom:dismissed-profile-suggestion')).toBe(
      'session-xyz:intermediate'
    );
    expect(container.querySelector('[data-testid="profile-suggestion-banner"]')).toBeNull();
  });

  it('does not render if previously dismissed for that session and target profile', async () => {
    localStorage.setItem('stratcom:dismissed-profile-suggestion', 'session-xyz:intermediate');
    useSessions.setState({ latestSession: mockDetail });

    await act(async () => {
      root.render(<ProfileSuggestionBanner />);
    });

    expect(container.querySelector('[data-testid="profile-suggestion-banner"]')).toBeNull();
  });
});
