import type { SessionReportMetrics, SessionReportGrade } from '../schemas/report';
import {
  GRADE_INITIAL_SCORE,
  MAX_PENALTY_ENERGY_STALL,
  PENALTY_DIVISOR_ENERGY_STALL,
  MAX_PENALTY_METAL_FLOAT,
  PENALTY_DIVISOR_METAL_FLOAT,
  MAX_PENALTY_IDLE_FACTORY,
  PENALTY_DIVISOR_IDLE_FACTORY,
  MAX_PENALTY_IDLE_BUILDER,
  PENALTY_DIVISOR_IDLE_BUILDER,
  MAX_PENALTY_IDLE_COMMANDER,
  PENALTY_DIVISOR_IDLE_COMMANDER,
  MAX_PENALTY_ADHERENCE,
  GRADE_THRESHOLD_S,
  GRADE_THRESHOLD_A,
  GRADE_THRESHOLD_B,
  GRADE_THRESHOLD_C
} from './constants';

export interface GradeResult {
  score: number;
  grade: SessionReportGrade;
  penalties: {
    energyStall: number;
    metalFloat: number;
    idleFactory: number;
    idleBuilder: number;
    idleCommander: number;
    adherence: number;
  };
}

/**
 * Computes raw score (0..100) and letter grade (S, A, B, C, D) per 04 §4.3.
 */
export function computeGrade(
  metrics: SessionReportMetrics,
  adherence: number,
  hasPlan: boolean
): GradeResult {
  const penaltyEnergyStall = Math.min(
    MAX_PENALTY_ENERGY_STALL,
    metrics.energyStallSec / PENALTY_DIVISOR_ENERGY_STALL
  );
  const penaltyMetalFloat = Math.min(
    MAX_PENALTY_METAL_FLOAT,
    metrics.metalFloatSec / PENALTY_DIVISOR_METAL_FLOAT
  );
  const penaltyIdleFactory = Math.min(
    MAX_PENALTY_IDLE_FACTORY,
    metrics.idleFactorySec / PENALTY_DIVISOR_IDLE_FACTORY
  );
  const penaltyIdleBuilder = Math.min(
    MAX_PENALTY_IDLE_BUILDER,
    metrics.idleBuilderSec / PENALTY_DIVISOR_IDLE_BUILDER
  );
  const penaltyIdleCommander = Math.min(
    MAX_PENALTY_IDLE_COMMANDER,
    metrics.idleCommanderSec / PENALTY_DIVISOR_IDLE_COMMANDER
  );
  const penaltyAdherence = hasPlan ? (1 - Math.max(0, Math.min(1, adherence))) * MAX_PENALTY_ADHERENCE : 0;

  const totalPenalties =
    penaltyEnergyStall +
    penaltyMetalFloat +
    penaltyIdleFactory +
    penaltyIdleBuilder +
    penaltyIdleCommander +
    penaltyAdherence;

  const rawScore = GRADE_INITIAL_SCORE - totalPenalties;
  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  let grade: SessionReportGrade = 'D';
  if (score >= GRADE_THRESHOLD_S) {
    grade = 'S';
  } else if (score >= GRADE_THRESHOLD_A) {
    grade = 'A';
  } else if (score >= GRADE_THRESHOLD_B) {
    grade = 'B';
  } else if (score >= GRADE_THRESHOLD_C) {
    grade = 'C';
  }

  return {
    score,
    grade,
    penalties: {
      energyStall: Math.round(penaltyEnergyStall * 10) / 10,
      metalFloat: Math.round(penaltyMetalFloat * 10) / 10,
      idleFactory: Math.round(penaltyIdleFactory * 10) / 10,
      idleBuilder: Math.round(penaltyIdleBuilder * 10) / 10,
      idleCommander: Math.round(penaltyIdleCommander * 10) / 10,
      adherence: Math.round(penaltyAdherence * 10) / 10
    }
  };
}
