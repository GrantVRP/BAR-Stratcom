import { describe, expect, it, vi } from 'vitest';
import { ManualClock } from './manual-clock';
import { CoachRunner } from './runner';
import type { BuildPlan } from '../../core/schemas/plans';
import { UnitSnapshotSchema } from '../../core/schemas/units';
import { createRegistry } from '../../core/registry';
import syntheticSnapshotData from '../../core/registry/__test__/test-snapshot.json';
import type { CoachState, Cue } from '../../core/schemas/coach';

const snapshot = UnitSnapshotSchema.parse(syntheticSnapshotData);
const factions = {
  schemaVersion: 1 as const,
  factions: [
    {
      id: 'armada',
      displayName: 'Armada',
      unitPrefix: 'arm',
      enabled: true,
      accent: '#449bed',
      commanderIds: ['armcom']
    }
  ]
};
const aliases = {
  schemaVersion: 1 as const,
  aliases: []
};
const registry = createRegistry(snapshot, factions, aliases);

const testPlan: BuildPlan = {
  schemaVersion: 1,
  id: 'test-manual-plan',
  title: 'Manual Plan',
  factionId: 'armada',
  gameVersion: 'Beyond All Reason test-fixture',
  modes: ['1v1'],
  role: 'any',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'solar',
  source: { kind: 'manual', createdAt: '2026-10-02T00:00:00.000Z' },
  steps: [
    { id: 's1', actor: { kind: 'commander' }, action: 'build', unitId: 'armsolar', count: 1, targetTime: 10 },
    { id: 's2', actor: { kind: 'commander' }, action: 'build', unitId: 'armlab', count: 1, targetTime: 30 },
    {
      id: 's3',
      actor: { kind: 'factory', unitId: 'armlab', index: 1 },
      action: 'build',
      unitId: 'armpw',
      count: 2,
      targetTime: 60
    }
  ]
};

describe('ManualClock', () => {
  it('manages start, pause, reset, toggle, and 1s ticks with fake timers', async () => {
    vi.useFakeTimers();
    try {
      let ticks = 0;
      const clock = new ManualClock({
        onTick: () => {
          ticks++;
        }
      });

      expect(clock.getClock()).toBe(0);
      expect(clock.isRunning()).toBe(false);

      clock.start();
      expect(clock.isRunning()).toBe(true);

      // Advance by 3 seconds
      await vi.advanceTimersByTimeAsync(3000);
      expect(clock.getClock()).toBe(3);
      expect(ticks).toBe(3);

      // Pause
      clock.pause();
      expect(clock.isRunning()).toBe(false);
      await vi.advanceTimersByTimeAsync(2000);
      expect(clock.getClock()).toBe(3);

      // Toggle (should resume)
      clock.toggle();
      expect(clock.isRunning()).toBe(true);
      await vi.advanceTimersByTimeAsync(1000);
      expect(clock.getClock()).toBe(4);

      // Reset
      clock.reset();
      expect(clock.isRunning()).toBe(false);
      expect(clock.getClock()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('runs coach in manual mode: clock progression, markDone, and allowed alerts only', async () => {
    vi.useFakeTimers();
    try {
      const runner = new CoachRunner();
      const emittedStates: CoachState[] = [];
      const emittedCues: Cue[] = [];

      await runner.start({
        plan: testPlan,
        mode: 'manual',
        registry,
        onUpdate: (state) => {
          emittedStates.push(state);
        },
        onCue: (cue) => {
          emittedCues.push(cue);
        }
      });

      const clock = runner.getManualClock();
      expect(clock.getClock()).toBe(0);
      expect(emittedStates.length).toBeGreaterThanOrEqual(1);

      const initialState = emittedStates[emittedStates.length - 1]!;
      expect(initialState.mode).toBe('manual');
      expect(initialState.clock).toBe(0);
      expect(initialState.currentStepIndex).toBe(0);

      // Start the manual clock
      clock.start();

      // Advance by 10s: step s1 reaches planned targetTime (10s)
      await vi.advanceTimersByTimeAsync(10_000);
      expect(clock.getClock()).toBe(10);

      const stateAt10 = emittedStates[emittedStates.length - 1]!;
      expect(stateAt10.clock).toBe(10);

      // Test markDone on step s1
      runner.markStepDone('s1');

      const stateAfterMarkDone = emittedStates[emittedStates.length - 1]!;
      const step1 = stateAfterMarkDone.steps.find((s) => s.stepId === 's1');
      expect(step1?.status).toBe('done');
      expect(step1?.actualFinish).toBe(10);

      // Verify no sensor alerts exist (allowed alerts in manual mode are ONLY planned risks from planSim)
      for (const st of emittedStates) {
        for (const alert of st.alerts) {
          expect(['E_STALL_SOON', 'M_STALL_SOON']).toContain(alert.id);
        }
      }

      // Verify audio cues: in manual mode, only STEP_DUE cues are allowed
      for (const cue of emittedCues) {
        expect(['STEP_DUE', 'STEP_DONE']).toContain(cue.alertId);
      }

      await runner.stop();
      expect(clock.isRunning()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
