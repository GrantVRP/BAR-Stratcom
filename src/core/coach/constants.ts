import type { AlertId } from '../schemas/coach';

/**
 * CustomParams.unitgroup values in snapshot that classify anti-air units (R-07).
 * Verified against test-31479-433a460: aa (34 units) and weaponaa (6 units).
 */
export const ANTI_AIR_UNIT_GROUPS = new Set(['aa', 'weaponaa']);

/**
 * Default audio timings in seconds (04 §3.3).
 */
export const ALERT_DEACTIVATION_HYSTERESIS_SEC = 2;
export const ALERT_SOUND_COOLDOWN_SEC = 20;
export const GLOBAL_AUDIO_LIMIT_SEC = 8;
export const CHAT_ECHO_COOLDOWN_SEC = 10;
export const DEFAULT_DUE_LEAD_SEC = 10;

/**
 * Priority order for audio limiter: danger > warn > info > step cues.
 */
export const AUDIO_SEVERITY_PRIORITY: Record<string, number> = {
  danger: 4,
  warn: 3,
  info: 2,
  step_due: 1,
  step_done: 1
};

export const ALL_ALERT_IDS: AlertId[] = [
  'E_STALL_SOON',
  'E_STALLING',
  'M_STALL_SOON',
  'M_STALLING',
  'M_FLOAT',
  'E_FLOAT',
  'IDLE_FACTORY',
  'IDLE_BUILDERS',
  'IDLE_COMMANDER',
  'BEHIND_PLAN',
  'BENCHMARK_LOW',
  'SCOUT_REMINDER',
  'ENEMY_AIR_NO_AA'
];
