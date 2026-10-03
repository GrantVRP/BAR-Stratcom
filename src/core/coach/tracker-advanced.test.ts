import { describe, it, expect } from 'vitest';
import type { BuildPlan } from '../schemas/plans';
import type { SimResult } from '../sim/types';
import type { Registry } from '../registry';
import { applyEventsToLedger, type FinishedLedger } from './ledger';
import { trackSteps } from './tracker';

describe('Step Tracker - Advanced & Cues', () => {
  const plan: BuildPlan = {
    schemaVersion: 1,
    id: 'test-plan',
    title: 'Test Plan',
    factionId: 'armada',
    gameVersion: '1.0.0',
    modes: ['1v1'],
    role: 'any',
    skill: 'beginner',
    opening: 'bot',
    energyStyle: 'solar',
    source: {
      kind: 'manual',
      createdAt: '2026-10-02T00:00:00.000Z'
    },
    steps: [
      {
        id: 's0',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armmex',
        count: 2,
        targetTime: 20
      },
      {
        id: 's1',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armsolar',
        count: 1,
        targetTime: 40
      },
      {
        id: 's2',
        actor: { kind: 'commander' },
        action: 'build',
        unitId: 'armmex',
        count: 1,
        targetTime: 60
      }
    ]
  };

  const planSim: SimResult = {
    samples: [],
    steps: [
      { stepId: 's0', start: 0, finish: 20 },
      { stepId: 's1', start: 20, finish: 40 },
      { stepId: 's2', start: 40, finish: 60 }
    ],
    intervals: { energyStall: [], metalStall: [], metalFloat: [], energyFloat: [] },
    totals: { energyStallSec: 0, metalStallSec: 0, idleBpSec: 0 },
    flags: []
  };

  it('auto-completes non-build steps (reclaim/assist/note)', () => {
    const mixedPlan: BuildPlan = {
      ...plan,
      steps: [
        {
          id: 'b0',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'armmex',
          count: 1,
          targetTime: 10
        },
        {
          id: 'r1',
          actor: { kind: 'commander' },
          action: 'reclaim',
          count: 1,
          targetTime: 20
        },
        {
          id: 'n2',
          actor: { kind: 'commander' },
          action: 'note',
          text: 'Queue factory',
          count: 1,
          targetTime: 30
        },
        {
          id: 'b3',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'armsolar',
          count: 1,
          targetTime: 40
        }
      ]
    };

    const mixedSim: SimResult = {
      ...planSim,
      steps: [
        { stepId: 'b0', start: 0, finish: 10 },
        { stepId: 'r1', start: 10, finish: 20 },
        { stepId: 'n2', start: 20, finish: 30 },
        { stepId: 'b3', start: 30, finish: 40 }
      ]
    };

    let ledger = applyEventsToLedger({}, [{ f: 300, e: 'finished', u: 1, d: 'armmex', tm: 0 }], 0);

    let res = trackSteps({
      plan: mixedPlan,
      planSim: mixedSim,
      finished: ledger,
      clock: 25
    });
    expect(res.steps[0]!.status).toBe('done');
    expect(res.steps[1]!.status).toBe('current');
    expect(res.steps[2]!.status).toBe('upcoming');

    res = trackSteps({
      plan: mixedPlan,
      planSim: mixedSim,
      finished: ledger,
      clock: 31
    });
    expect(res.steps[1]!.status).toBe('done');
    expect(res.steps[1]!.actualFinish).toBe(30);
    expect(res.steps[2]!.status).toBe('current');

    ledger = applyEventsToLedger(ledger, [{ f: 1050, e: 'finished', u: 2, d: 'armsolar', tm: 0 }], 0);
    res = trackSteps({
      plan: mixedPlan,
      planSim: mixedSim,
      finished: ledger,
      clock: 36
    });
    expect(res.steps[2]!.status).toBe('done');
    expect(res.steps[3]!.status).toBe('done');
  });

  it('supports manual done and skipped steps', () => {
    const res = trackSteps({
      plan,
      planSim,
      finished: {},
      clock: 10,
      manualDoneStepIds: new Set(['s0']),
      skippedStepIds: new Set(['s1'])
    });

    expect(res.steps[0]!.status).toBe('done');
    expect(res.steps[1]!.status).toBe('skipped');
    expect(res.steps[2]!.status).toBe('current');
    expect(res.currentStepIndex).toBe(2);
  });

  it('emits STEP_DUE and STEP_DONE cues exactly once', () => {
    const tick1 = trackSteps({
      plan,
      planSim,
      finished: {},
      clock: 11,
      dueLeadSec: 10
    });

    const dueStepIds = tick1.cues.filter((c) => c.alertId === 'STEP_DUE').map((c) => c.id);
    expect(dueStepIds).toContain('cue-s0-due');
    expect(dueStepIds).toContain('cue-s1-due');

    const tick2 = trackSteps({
      plan,
      planSim,
      finished: {},
      clock: 15,
      dueLeadSec: 10,
      previouslyDueStepIds: tick1.dueStepIds,
      previouslyDoneStepIds: tick1.doneStepIds
    });
    expect(tick2.cues).toHaveLength(0);

    const ledger = applyEventsToLedger(
      {},
      [
        { f: 300, e: 'finished', u: 1, d: 'armmex', tm: 0 },
        { f: 540, e: 'finished', u: 2, d: 'armmex', tm: 0 }
      ],
      0
    );

    const tick3 = trackSteps({
      plan,
      planSim,
      finished: ledger,
      clock: 19,
      dueLeadSec: 10,
      previouslyDueStepIds: tick2.dueStepIds,
      previouslyDoneStepIds: tick2.doneStepIds
    });

    expect(tick3.cues).toHaveLength(1);
    expect(tick3.cues[0]).toMatchObject({
      id: 'cue-s0-done',
      alertId: 'STEP_DONE',
      sound: 'step_done'
    });

    const tick4 = trackSteps({
      plan,
      planSim,
      finished: ledger,
      clock: 20,
      dueLeadSec: 10,
      previouslyDueStepIds: tick3.dueStepIds,
      previouslyDoneStepIds: tick3.doneStepIds
    });
    expect(tick4.cues).toHaveLength(0);
  });

  it('resolves unit names from registry and handles non-build cue text', () => {
    const mockRegistry = {
      get: (id: string) =>
        id === 'armmex'
          ? ({
              id: 'armmex',
              name: 'Metal Extractor',
              factionId: 'armada'
            } as unknown as ReturnType<Registry['get']>)
          : undefined
    } as unknown as Registry;

    const planWithReclaim: BuildPlan = {
      ...plan,
      steps: [
        {
          id: 'r0',
          actor: { kind: 'commander' },
          action: 'reclaim',
          text: 'Reclaim wreck',
          count: 1,
          targetTime: 10
        },
        {
          id: 's1',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'armmex',
          count: 1,
          targetTime: 20
        },
        {
          id: 'r2',
          actor: { kind: 'commander' },
          action: 'reclaim',
          count: 1,
          targetTime: 30
        }
      ]
    };

    const simWithReclaim: SimResult = {
      ...planSim,
      steps: [
        { stepId: 'r0', start: 0, finish: 10 },
        { stepId: 's1', start: 10, finish: 20 },
        { stepId: 'r2', start: 20, finish: 30 }
      ]
    };

    const res = trackSteps({
      plan: planWithReclaim,
      planSim: simWithReclaim,
      finished: {},
      clock: 15,
      registry: mockRegistry
    });

    const dueTexts = res.cues.map((c) => c.text);
    expect(dueTexts).toContain('Reclaim wreck');
    expect(dueTexts).toContain('1x Metal Extractor');
    expect(dueTexts).toContain('reclaim');

    const doneRes = trackSteps({
      plan: planWithReclaim,
      planSim: simWithReclaim,
      finished: {},
      clock: 5,
      registry: mockRegistry,
      manualDoneStepIds: new Set(['r0', 'r2'])
    });

    const doneTexts = doneRes.cues.filter((c) => c.alertId === 'STEP_DONE').map((c) => c.text);
    expect(doneTexts).toContain('Reclaim wreck done');
    expect(doneTexts).toContain('reclaim done');
  });

  it('breaks ties in most-recently completed build steps using index', () => {
    const multiPlan: BuildPlan = {
      ...plan,
      steps: [
        {
          id: 'm0',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'armmex',
          count: 1,
          targetTime: 20
        },
        {
          id: 'm1',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'armsolar',
          count: 1,
          targetTime: 30
        }
      ]
    };

    const multiSim: SimResult = {
      ...planSim,
      steps: [
        { stepId: 'm0', start: 0, finish: 20 },
        { stepId: 'm1', start: 0, finish: 30 }
      ]
    };

    const ledger: FinishedLedger = {
      armmex: [15],
      armsolar: [15]
    };

    const res = trackSteps({
      plan: multiPlan,
      planSim: multiSim,
      finished: ledger,
      clock: 16
    });

    expect(res.aheadBehindSec).toBe(15);
  });
});
