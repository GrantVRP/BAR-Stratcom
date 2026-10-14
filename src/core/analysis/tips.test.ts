import { describe, it, expect } from 'vitest';
import { evaluateTips } from './tips';
import type { SessionReportMetrics } from '../schemas/report';
import type { TipContext } from './types';

function createMockMetrics(overrides: Partial<SessionReportMetrics> = {}): SessionReportMetrics {
  return {
    durationSec: 300,
    energyStallSec: 0,
    metalStallSec: 0,
    metalFloatSec: 0,
    energyFloatSec: 0,
    idleFactorySec: 0,
    idleBuilderSec: 0,
    idleCommanderSec: 0,
    bpUtilisation: 1.0,
    timeToFirstFactory: 60,
    timeToT2: null,
    incomeAt: { '180': null, '300': null, '480': null, '600': null },
    ...overrides
  };
}

function createMockContext(overrides: Partial<TipContext> = {}): TipContext {
  return {
    metrics: createMockMetrics(),
    hasPlan: true,
    adherence: 1.0,
    plannedFirstFactory: 60,
    benchmark: null,
    profile: 'intermediate',
    ...overrides
  };
}

describe('evaluateTips', () => {
  it('returns empty array when performance is within all tolerances', () => {
    const ctx = createMockContext();
    const tips = evaluateTips(ctx);
    expect(tips).toEqual([]);
  });

  it('triggers tip.energy-stall when energyStallSec > 20 with danger severity', () => {
    const ctx = createMockContext({
      metrics: createMockMetrics({ energyStallSec: 25 })
    });
    const tips = evaluateTips(ctx);
    expect(tips.length).toBe(1);
    expect(tips[0]?.id).toBe('tip.energy-stall');
    expect(tips[0]?.severity).toBe('danger');
    expect(tips[0]?.text).toContain('Energy-stalled for 25s.');
  });

  it('triggers tip.metal-float when metalFloatSec > 30', () => {
    const ctx = createMockContext({
      metrics: createMockMetrics({ metalFloatSec: 45 })
    });
    const tips = evaluateTips(ctx);
    expect(tips.length).toBe(1);
    expect(tips[0]?.id).toBe('tip.metal-float');
    expect(tips[0]?.severity).toBe('warn');
    expect(tips[0]?.text).toContain('Floated metal for 45s.');
  });

  it('triggers tip.idle-factory when idleFactorySec > 30', () => {
    const ctx = createMockContext({
      metrics: createMockMetrics({ idleFactorySec: 40 })
    });
    const tips = evaluateTips(ctx);
    expect(tips.length).toBe(1);
    expect(tips[0]?.id).toBe('tip.idle-factory');
    expect(tips[0]?.text).toContain('Factories sat idle for 40s.');
  });

  it('triggers tip.idle-builders when idleBuilderSec > 60', () => {
    const ctx = createMockContext({
      metrics: createMockMetrics({ idleBuilderSec: 75 })
    });
    const tips = evaluateTips(ctx);
    expect(tips.length).toBe(1);
    expect(tips[0]?.id).toBe('tip.idle-builders');
    expect(tips[0]?.text).toContain('Constructors were idle for 75 builder-seconds.');
  });

  it('triggers tip.idle-commander when idleCommanderSec > 20', () => {
    const ctx = createMockContext({
      metrics: createMockMetrics({ idleCommanderSec: 30 })
    });
    const tips = evaluateTips(ctx);
    expect(tips.length).toBe(1);
    expect(tips[0]?.id).toBe('tip.idle-commander');
    expect(tips[0]?.text).toContain('Commander idle for 30s in the first 10 minutes.');
  });

  it('triggers tip.adherence when plan active and adherence < 0.5', () => {
    const ctx = createMockContext({
      hasPlan: true,
      adherence: 0.35
    });
    const tips = evaluateTips(ctx);
    expect(tips.length).toBe(1);
    expect(tips[0]?.id).toBe('tip.adherence');
    expect(tips[0]?.text).toBe('Only 35% of steps on time. Practise the first 10 steps against AI.');

    // Not triggered if no plan active
    const withoutPlan = createMockContext({ hasPlan: false, adherence: 0.35 });
    expect(evaluateTips(withoutPlan)).toEqual([]);
  });

  it('triggers tip.slow-factory when first factory > planned + 20s', () => {
    const ctx = createMockContext({
      hasPlan: true,
      plannedFirstFactory: 60,
      metrics: createMockMetrics({ timeToFirstFactory: 85 })
    });
    const tips = evaluateTips(ctx);
    expect(tips.length).toBe(1);
    expect(tips[0]?.id).toBe('tip.slow-factory');
    expect(tips[0]?.text).toBe('First factory was 25s late.');
  });

  it('triggers tip.benchmark when metal percentile at 300s < 25', () => {
    const ctx = createMockContext({
      benchmark: {
        percentileMetalAt300: 15,
        percentileMetalAt600: null
      }
    });
    const tips = evaluateTips(ctx);
    expect(tips.length).toBe(1);
    expect(tips[0]?.id).toBe('tip.benchmark');
    expect(tips[0]?.severity).toBe('info');
    expect(tips[0]?.text).toBe('Metal income at 5:00 was below 75% of pro games.');
  });

  it('sorts tips strictly by impact descending and caps at top 3', () => {
    // Trigger 5 tips:
    // 1. energyStall 40s -> impact 20
    // 2. metalFloat 60s -> impact 20
    // 3. idleFactory 40s -> impact 10
    // 4. idleBuilders 120s -> impact 15
    // 5. idleCommander 24s -> impact 10
    const ctx = createMockContext({
      metrics: createMockMetrics({
        energyStallSec: 40, // impact 20
        metalFloatSec: 60, // impact 20
        idleBuilderSec: 120, // impact 15
        idleFactorySec: 40, // impact 10
        idleCommanderSec: 24 // impact 10
      })
    });

    const tips = evaluateTips(ctx);
    expect(tips.length).toBe(3); // capped at 3

    // First two must be energy-stall and metal-float (impact 20 each)
    const top2Ids = [tips[0]?.id, tips[1]?.id];
    expect(top2Ids).toContain('tip.energy-stall');
    expect(top2Ids).toContain('tip.metal-float');

    // Third must be idle-builders (impact 15 > 10)
    expect(tips[2]?.id).toBe('tip.idle-builders');
  });
});
