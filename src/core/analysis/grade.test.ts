import { describe, it, expect } from 'vitest';
import { computeGrade } from './grade';
import type { SessionReportMetrics } from '../schemas/report';

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

describe('computeGrade (04 §4.3, T07.2)', () => {
  it('gives S grade (100 score) for a flawless performance', () => {
    const result = computeGrade(createMockMetrics(), 1.0, true);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('S');
  });

  it('respects exact grade boundaries (S >= 90, A >= 80, B >= 65, C >= 50, else D)', () => {
    // S boundary: 90
    expect(computeGrade(createMockMetrics({ energyStallSec: 20 }), 1.0, true).grade).toBe('S'); // 100 - 10 = 90
    expect(computeGrade(createMockMetrics({ energyStallSec: 21 }), 1.0, true).grade).toBe('A'); // 100 - 10.5 = 89.5

    // A boundary: 80
    expect(computeGrade(createMockMetrics({ energyStallSec: 40 }), 1.0, true).grade).toBe('A'); // 100 - 20 = 80
    expect(computeGrade(createMockMetrics({ energyStallSec: 40, metalFloatSec: 3 }), 1.0, true).grade).toBe('B'); // 100 - 21 = 79

    // B boundary: 65
    expect(
      computeGrade(
        createMockMetrics({ energyStallSec: 40, metalFloatSec: 45 }), // 100 - 20 - 15 = 65
        1.0,
        true
      ).grade
    ).toBe('B');
    expect(
      computeGrade(
        createMockMetrics({ energyStallSec: 40, metalFloatSec: 48 }), // 100 - 20 - 16 = 64
        1.0,
        true
      ).grade
    ).toBe('C');

    // C boundary: 50
    expect(
      computeGrade(
        createMockMetrics({
          energyStallSec: 50, // capped at 25
          metalFloatSec: 60, // capped at 20
          idleCommanderSec: 10 // 5
        }), // 100 - 25 - 20 - 5 = 50
        1.0,
        true
      ).grade
    ).toBe('C');

    // D boundary: < 50
    expect(
      computeGrade(
        createMockMetrics({
          energyStallSec: 50, // 25
          metalFloatSec: 60, // 20
          idleCommanderSec: 12 // 6
        }), // 100 - 25 - 20 - 6 = 49
        1.0,
        true
      ).grade
    ).toBe('D');
  });

  it('enforces penalty caps (energyStall 25, metalFloat 20, factory 15, builder 15, commander 10, adherence 15)', () => {
    const result = computeGrade(
      createMockMetrics({
        energyStallSec: 200, // 200/2 = 100 -> cap 25
        metalFloatSec: 300, // 300/3 = 100 -> cap 20
        idleFactorySec: 200, // 200/4 = 50 -> cap 15
        idleBuilderSec: 300, // 300/6 = 50 -> cap 15
        idleCommanderSec: 100 // 100/2 = 50 -> cap 10
      }),
      0.0, // adherence 0 -> cap 15
      true
    );

    expect(result.penalties.energyStall).toBe(25);
    expect(result.penalties.metalFloat).toBe(20);
    expect(result.penalties.idleFactory).toBe(15);
    expect(result.penalties.idleBuilder).toBe(15);
    expect(result.penalties.idleCommander).toBe(10);
    expect(result.penalties.adherence).toBe(15);

    // Total penalties = 25+20+15+15+10+15 = 100 -> score 0
    expect(result.score).toBe(0);
    expect(result.grade).toBe('D');
  });

  it('ignores adherence penalty when no plan is active', () => {
    const withPlan = computeGrade(createMockMetrics(), 0.0, true);
    const withoutPlan = computeGrade(createMockMetrics(), 0.0, false);

    expect(withPlan.score).toBe(85); // 100 - 15
    expect(withoutPlan.score).toBe(100);
    expect(withoutPlan.penalties.adherence).toBe(0);
  });
});
