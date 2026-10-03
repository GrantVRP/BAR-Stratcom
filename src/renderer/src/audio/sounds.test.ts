// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { playSound, testSound, setupAudioCueListener, type SoundId } from './sounds';
import { useSettings } from '../stores';
import { ipcClient } from '../lib/ipc-client';

class MockAudioNode {
  connect = vi.fn();
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class MockAudioContext {
  currentTime = 0;
  state = 'running';
  destination = new MockAudioNode();
  createOscillator = vi.fn(() => ({
    type: 'sine',
    frequency: new MockAudioNode(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  }));
  createGain = vi.fn(() => ({
    gain: new MockAudioNode(),
    connect: vi.fn()
  }));
  resume = vi.fn().mockResolvedValue(undefined);
}

describe('procedural Web Audio sounds (06 §5)', () => {
  beforeEach(() => {
    (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;
    useSettings.setState({
      settings: {
        schemaVersion: 1,
        profile: 'intermediate',
        bar: { dataDir: null, source: null },
        alerts: {},
        sound: { enabled: true, volume: 0.8 },
        chatEcho: false,
        hud: { enabled: true },
        coachWindow: { alwaysOnTop: false, overlayMode: false },
        assist: { armNext: false, factoryQueue: false },
        ai: { provider: 'none', model: null, baseUrl: null, anthropicFallbacks: false },
        updates: { checkOnLaunch: true },
        launcher: { showOnStart: true },
        globalShortcut: 'Ctrl+Alt+S',
        activePlanId: null
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const soundIds: SoundId[] = ['step_due', 'step_done', 'info', 'warn', 'danger'];

  for (const soundId of soundIds) {
    it(`synthesizes ${soundId} without error`, () => {
      expect(() => playSound(soundId)).not.toThrow();
    });
  }

  it('respects sound.enabled setting and does not synthesize when disabled', () => {
    useSettings.setState({
      settings: {
        ...useSettings.getState().settings!,
        sound: { enabled: false, volume: 0.8 }
      }
    });

    const ctx = new MockAudioContext();
    (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = vi.fn(() => ctx);

    playSound('warn');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('allows testSound to play even if sound.enabled is false', () => {
    useSettings.setState({
      settings: {
        ...useSettings.getState().settings!,
        sound: { enabled: false, volume: 0.8 }
      }
    });

    expect(() => testSound('danger')).not.toThrow();
  });

  it('setupAudioCueListener invokes playSound on coach:cue event', () => {
    let capturedCb: ((cue: unknown) => void) | undefined;
    vi.spyOn(ipcClient, 'on').mockImplementation((channel, cb) => {
      if (channel === 'coach:cue') {
        capturedCb = cb as (cue: unknown) => void;
      }
      return () => {};
    });

    const cleanup = setupAudioCueListener();
    expect(capturedCb).toBeDefined();

    if (capturedCb) {
      capturedCb({ id: '1', alertId: 'STEP_DONE', sound: 'step_done', text: 'done', at: 10 });
    }
    cleanup();
  });
});
