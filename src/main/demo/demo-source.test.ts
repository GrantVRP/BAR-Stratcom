import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { DemoInfoSchema } from '../../shared/ipc';
import { DemoSource, derivePlanFromDemo, listDemos } from './demo-source';
import { CoachRunner } from '../coach/runner';
import { loadRegistry } from '../registry/loader';
import type { CoachState } from '../../core/schemas/coach';

describe('DemoSource & listDemos (02 §4.2, T05.7)', () => {
  const fixtureId = '2026-10-01-cortex-1v1-vs-ai-barr-499s';
  const fixtureDir = path.resolve(process.cwd(), 'data/fixtures/sessions', fixtureId);
  const registry = loadRegistry();

  it('lists player fixtures bundled with the app and excludes spectator games', () => {
    const demos = listDemos();
    expect(demos.length).toBeGreaterThanOrEqual(4);

    for (const demo of demos) {
      expect(DemoInfoSchema.parse(demo)).toEqual(demo);
      expect(demo.durationSec).toBeGreaterThan(0);
      expect(demo.title).toBeDefined();
    }

    const ids = demos.map((d) => d.id);
    expect(ids).toContain('2026-10-01-cortex-1v1-vs-ai-barr');
    expect(ids).toContain('2026-10-01-cortex-1v1-vs-ai-barr-499s');
    // Large team games are spectator mode and should be excluded
    expect(ids).not.toContain('2026-10-02-multi-large-team-owner-vs-ai-dworld');
  });

  it('handles pause, resume, and stop mid-demo cleaning up timers', async () => {
    vi.useFakeTimers();
    try {
      const demo = new DemoSource({ fixtureDir, speed: 1 });
      let stateCount = 0;
      demo.on('state', () => {
        stateCount++;
      });

      demo.start();
      expect(demo.isRunning()).toBe(true);
      expect(demo.isPaused()).toBe(false);
      expect(stateCount).toBe(1); // t = 0 immediate step

      // Advance by 1 second (1000ms at 1x)
      await vi.advanceTimersByTimeAsync(1000);
      expect(stateCount).toBe(2);

      // Pause
      demo.pause();
      expect(demo.isPaused()).toBe(true);
      await vi.advanceTimersByTimeAsync(2000);
      expect(stateCount).toBe(2); // no progress while paused

      // Resume
      demo.resume();
      expect(demo.isPaused()).toBe(false);
      await vi.advanceTimersByTimeAsync(1000);
      expect(stateCount).toBe(3);

      // Stop mid-demo cleans up timers
      demo.stop();
      expect(demo.isRunning()).toBe(false);
      await vi.advanceTimersByTimeAsync(5000);
      expect(stateCount).toBe(3); // no progress after stop
    } finally {
      vi.useRealTimers();
    }
  });

  it('produces deterministic coach states at 100x equal to synchronous stepping', async () => {
    const demoSourceSync = new DemoSource({ fixtureDir, speed: 1 });
    const plan = derivePlanFromDemo(demoSourceSync, registry);

    // 1. Run synchronously
    const syncStates: CoachState[] = [];
    const runnerSync = new CoachRunner();
    await runnerSync.start({
      plan,
      mode: 'demo',
      source: demoSourceSync,
      registry,
      onUpdate: (state) => {
        syncStates.push(state);
      }
    });

    // Step the fixture to completion synchronously (first 50 states for speed)
    const MAX_STEPS = 50;
    let stepCount = 0;
    while (stepCount < MAX_STEPS && demoSourceSync.step()) {
      stepCount++;
    }
    await runnerSync.stop();

    expect(syncStates.length).toBeGreaterThanOrEqual(MAX_STEPS);

    // 2. Run with DemoSource timer at 100x
    vi.useFakeTimers();
    try {
      const demoSourceTimer = new DemoSource({ fixtureDir, speed: 100 });
      const timerStates: CoachState[] = [];
      const runnerTimer = new CoachRunner();

      await runnerTimer.start({
        plan,
        mode: 'demo',
        source: demoSourceTimer,
        registry,
        onUpdate: (state) => {
          timerStates.push(state);
        }
      });

      demoSourceTimer.start();

      // At 100x, 50 states take ~500ms
      for (let i = 0; i < MAX_STEPS; i++) {
        await vi.advanceTimersByTimeAsync(10);
      }

      demoSourceTimer.stop();
      await runnerTimer.stop();

      // Compare states up to MAX_STEPS
      const sliceLength = Math.min(syncStates.length, timerStates.length, MAX_STEPS);
      expect(sliceLength).toBe(MAX_STEPS);

      for (let i = 0; i < sliceLength; i++) {
        const syncState = syncStates[i]!;
        const timerState = timerStates[i]!;
        expect(timerState.clock).toBe(syncState.clock);
        expect(timerState.currentStepIndex).toBe(syncState.currentStepIndex);
        expect(timerState.aheadBehindSec).toBe(syncState.aheadBehindSec);
        expect(timerState.alerts.map((a) => a.id)).toEqual(syncState.alerts.map((a) => a.id));
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
