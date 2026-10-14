// Estimated constants for post-match analysis

// Analysis horizon (capped at 900 s)
export const ANALYSIS_HORIZON_SEC = 900;

// Commander idle horizon (first 600 s)
export const COMMANDER_IDLE_HORIZON_SEC = 600;

// Resource thresholds
export const STALL_STORAGE_RATIO = 0.01; // current <= max(1, 0.01 * storage)
export const STALL_MIN_CURRENT = 1;
export const METAL_FLOAT_STORAGE_RATIO = 0.9; // metal current >= 0.9 * storage
export const ENERGY_FLOAT_STORAGE_RATIO = 0.95; // energy current >= 0.95 * storage

// Default adherence tolerance (seconds after planned finish)
export const DEFAULT_ADHERENCE_TOLERANCE_SEC = 20;

// Grade scoring penalty caps and divisors
export const GRADE_INITIAL_SCORE = 100;

export const MAX_PENALTY_ENERGY_STALL = 25;
export const PENALTY_DIVISOR_ENERGY_STALL = 2; // energyStallSec / 2

export const MAX_PENALTY_METAL_FLOAT = 20;
export const PENALTY_DIVISOR_METAL_FLOAT = 3; // metalFloatSec / 3

export const MAX_PENALTY_IDLE_FACTORY = 15;
export const PENALTY_DIVISOR_IDLE_FACTORY = 4; // idleFactorySec / 4

export const MAX_PENALTY_IDLE_BUILDER = 15;
export const PENALTY_DIVISOR_IDLE_BUILDER = 6; // idleBuilderSec / 6

export const MAX_PENALTY_IDLE_COMMANDER = 10;
export const PENALTY_DIVISOR_IDLE_COMMANDER = 2; // idleCommanderSec / 2

export const MAX_PENALTY_ADHERENCE = 15; // (1 - adherence) * 15

// Grade boundary thresholds
export const GRADE_THRESHOLD_S = 90;
export const GRADE_THRESHOLD_A = 80;
export const GRADE_THRESHOLD_B = 65;
export const GRADE_THRESHOLD_C = 50;

// Tip condition thresholds
export const TIP_ENERGY_STALL_THRESHOLD_SEC = 20;
export const TIP_METAL_FLOAT_THRESHOLD_SEC = 30;
export const TIP_IDLE_FACTORY_THRESHOLD_SEC = 30;
export const TIP_IDLE_BUILDERS_THRESHOLD_SEC = 60;
export const TIP_IDLE_COMMANDER_THRESHOLD_SEC = 20;
export const TIP_ADHERENCE_THRESHOLD = 0.5;
export const TIP_SLOW_FACTORY_DELAY_SEC = 20;
export const TIP_BENCHMARK_PERCENTILE_THRESHOLD = 25;
