// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReviewView } from './ReviewView';
import { useSessions, useSettings } from '../stores';
import type { Settings } from '../../../core/schemas/settings';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ReviewView', () => {
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
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders review placeholder', async () => {
    useSessions.setState({ latestSession: null });

    await act(async () => {
      root.render(<ReviewView />);
    });

    expect(container.querySelector('[data-testid="view-review"]')).not.toBeNull();
    expect(container.textContent).toContain('MATCH REVIEW & BENCHMARKS');
    expect(container.querySelector('[data-testid="profile-suggestion-banner"]')).toBeNull();
  });

  it('renders profile suggestion banner in review view when suggestion is present', async () => {
    useSessions.setState({
      latestSession: {
        meta: {
          schemaVersion: 1,
          sessionId: 'review-sess',
          mode: 'player',
          gameVersion: 'test',
          engineVersion: '105.1.1',
          mapScriptName: 'Map',
          durationSec: 100,
          startedAt: '2026-10-01T00:00:00.000Z',
          teams: [{ teamId: 0, allyTeamId: 0, playerName: 'P', factionId: 'armada', isMe: true }],
          start: null,
          source: 'live',
          anonymized: false
        },
        report: {
          schemaVersion: 1,
          sessionId: 'review-sess',
          profile: 'intermediate',
          factionId: 'armada',
          metrics: {
            durationSec: 100,
            energyStallSec: 0,
            metalStallSec: 0,
            metalFloatSec: 0,
            energyFloatSec: 0,
            idleFactorySec: 0,
            idleBuilderSec: 0,
            idleCommanderSec: 0,
            bpUtilisation: 0.85,
            timeToFirstFactory: 32,
            timeToT2: null,
            incomeAt: { '180': null, '300': null, '480': null, '600': null }
          },
          steps: [],
          adherence: 0.9,
          benchmark: null,
          tips: [],
          grade: 'S',
          profileSuggestion: {
            to: 'advanced',
            reason: 'Great play on intermediate.'
          }
        },
        hasState: true,
        hasEvents: true
      }
    });

    await act(async () => {
      root.render(<ReviewView />);
    });

    expect(container.querySelector('[data-testid="profile-suggestion-banner"]')).not.toBeNull();
    expect(container.textContent).toContain('Great play on intermediate.');
  });
});
