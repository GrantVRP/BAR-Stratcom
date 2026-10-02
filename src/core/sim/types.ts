import type { Registry } from '../registry';
import type { BuildPlan } from '../schemas';
import type { PlanIssue } from '../plans/validate';

export interface Interval {
  start: number;
  end: number;
}

export interface SimSample {
  t: number; // every 1 s
  metal: {
    current: number;
    storage: number;
    income: number;
    spend: number;
  };
  energy: {
    current: number;
    storage: number;
    income: number;
    spend: number;
  };
  bpTotal: number;
  bpActive: number;
  stallMetal: boolean;
  stallEnergy: boolean;
}

export interface SimStepResult {
  stepId: string;
  start: number | null;
  finish: number | null; // null = never finished within horizon
}

export interface SimIntervals {
  energyStall: Interval[];
  metalStall: Interval[];
  metalFloat: Interval[];
  energyFloat: Interval[];
}

export interface SimTotals {
  energyStallSec: number;
  metalStallSec: number;
  idleBpSec: number;
}

export type SimFlag =
  | 'windUnknown'
  | 'mexYieldEstimated'
  | 'startEstimated'
  | 'horizonReached';

export interface SimResult {
  samples: SimSample[];
  steps: SimStepResult[];
  intervals: SimIntervals;
  totals: SimTotals;
  flags: SimFlag[];
}

export interface SimInput {
  registry: Registry;
  plan: BuildPlan;
  map: {
    windAvg: number | null;
    windMin: number;
    windMax: number;
    tidalStrength: number;
    mexYield: number;
    mexYieldProvenance: 'measured' | 'estimated';
  };
  start?: {
    metal: number;
    energy: number;
    metalStorage: number;
    energyStorage: number;
  };
  options?: {
    dt?: number; // default 0.5 s
    horizon?: number; // default 900 s
    schedule?: 'respect-targets' | 'asap'; // default 'respect-targets' when steps have targetTime
    converterThreshold?: number; // fraction of energy storage; default in constants.ts
    windSeries?: number[]; // per-second wind (calibration only); otherwise windAvg
    baseMexExtractsMetal?: number; // derived from registry T1 mex; fallback to BASE_MEX_EXTRACTS_METAL
  };
}

export class SimInputError extends Error {
  readonly issues: PlanIssue[];

  constructor(message: string, issues: PlanIssue[] = []) {
    super(message);
    this.name = 'SimInputError';
    this.issues = issues;
  }
}
