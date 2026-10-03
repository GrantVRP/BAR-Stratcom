import { describe, it, expect } from 'vitest';
import type { BuildPlan } from '../schemas/plans';
import type { SimResult } from '../sim/types';
import { applyEventsToLedger } from './ledger';
import { trackSteps } from './tracker';

describe('Step Tracker - Core Flow', () => {
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

  it('handles initial state before any events', () => {
    const res = trackSteps({
      plan,
      planSim,
      finished: {},
      clock: 0
    });

    expect(res.steps).toHaveLength(3);
    expect(res.steps[0]).toEqual({
      stepId: 's0',
      status: 'current',
      plannedStart: 0,
      plannedFinish: 20,
      actualFinish: null
    });
    expect(res.steps[1]!.status).toBe('upcoming');
    expect(res.steps[2]!.status).toBe('upcoming');
    expect(res.currentStepIndex).toBe(0);
    expect(res.aheadBehindSec).toBeNull();
  });

  it('tracks in-order completion and ahead/behind progression', () => {
    let ledger = applyEventsToLedger(
      {},
      [
        { f: 300, e: 'finished', u: 101, d: 'armmex', tm: 0 },
        { f: 540, e: 'finished', u: 102, d: 'armmex', tm: 0 }
      ],
      0
    );

    let res = trackSteps({
      plan,
      planSim,
      finished: ledger,
      clock: 19
    });

    expect(res.steps[0]!.status).toBe('done');
    expect(res.steps[0]!.actualFinish).toBe(18);
    expect(res.steps[1]!.status).toBe('current');
    expect(res.currentStepIndex).toBe(1);
    expect(res.aheadBehindSec).toBe(2);

    ledger = applyEventsToLedger(ledger, [{ f: 1050, e: 'finished', u: 103, d: 'armsolar', tm: 0 }], 0);

    res = trackSteps({
      plan,
      planSim,
      finished: ledger,
      clock: 36
    });

    expect(res.steps[1]!.status).toBe('done');
    expect(res.steps[1]!.actualFinish).toBe(35);
    expect(res.steps[2]!.status).toBe('current');
    expect(res.currentStepIndex).toBe(2);
    expect(res.aheadBehindSec).toBe(5);

    ledger = applyEventsToLedger(ledger, [{ f: 1950, e: 'finished', u: 104, d: 'armmex', tm: 0 }], 0);

    res = trackSteps({
      plan,
      planSim,
      finished: ledger,
      clock: 66
    });

    expect(res.steps[2]!.status).toBe('done');
    expect(res.steps[2]!.actualFinish).toBe(65);
    expect(res.currentStepIndex).toBe(3);
    expect(res.aheadBehindSec).toBe(-5);
  });

  it('handles out-of-order completion correctly', () => {
    const ledger = applyEventsToLedger({}, [{ f: 750, e: 'finished', u: 103, d: 'armsolar', tm: 0 }], 0);

    const res = trackSteps({
      plan,
      planSim,
      finished: ledger,
      clock: 26
    });

    expect(res.steps[0]!.status).toBe('current');
    expect(res.steps[0]!.actualFinish).toBeNull();
    expect(res.steps[1]!.status).toBe('done');
    expect(res.steps[1]!.actualFinish).toBe(25);
    expect(res.steps[2]!.status).toBe('upcoming');
    expect(res.currentStepIndex).toBe(0);
    expect(res.aheadBehindSec).toBe(-6);
  });

  it('calculates behind value when current step is overdue', () => {
    const res = trackSteps({
      plan,
      planSim,
      finished: {},
      clock: 35
    });

    expect(res.steps[0]!.status).toBe('current');
    expect(res.aheadBehindSec).toBe(-15);
  });

  it('verifies destroyed-after-finish still counts (regression for legacy bug)', () => {
    let ledger = applyEventsToLedger(
      {},
      [
        { f: 300, e: 'finished', u: 101, d: 'armmex', tm: 0 },
        { f: 450, e: 'finished', u: 102, d: 'armmex', tm: 0 }
      ],
      0
    );

    let res = trackSteps({
      plan,
      planSim,
      finished: ledger,
      clock: 16
    });

    expect(res.steps[0]!.status).toBe('done');

    // Unit destroyed at 25s - must still be done
    ledger = applyEventsToLedger(ledger, [{ f: 750, e: 'destroyed', u: 102, d: 'armmex', tm: 0 }], 0);

    res = trackSteps({
      plan,
      planSim,
      finished: ledger,
      clock: 26
    });

    expect(res.steps[0]!.status).toBe('done');
    expect(res.steps[0]!.actualFinish).toBe(15);
  });

  it('tracks cumulative counts across repeated unit steps', () => {
    let ledger = applyEventsToLedger({}, [{ f: 300, e: 'finished', u: 101, d: 'armmex', tm: 0 }], 0);

    let res = trackSteps({ plan, planSim, finished: ledger, clock: 11 });
    expect(res.steps[0]!.status).toBe('current');
    expect(res.steps[2]!.status).toBe('upcoming');

    ledger = applyEventsToLedger(ledger, [{ f: 450, e: 'finished', u: 102, d: 'armmex', tm: 0 }], 0);
    res = trackSteps({ plan, planSim, finished: ledger, clock: 16 });
    expect(res.steps[0]!.status).toBe('done');
    expect(res.steps[0]!.actualFinish).toBe(15);
    expect(res.steps[2]!.status).toBe('upcoming');

    ledger = applyEventsToLedger(ledger, [{ f: 1500, e: 'finished', u: 103, d: 'armmex', tm: 0 }], 0);
    res = trackSteps({ plan, planSim, finished: ledger, clock: 51 });
    expect(res.steps[2]!.status).toBe('done');
    expect(res.steps[2]!.actualFinish).toBe(50);
  });
});
