import type { AlertId } from '../schemas/coach';

/**
 * CustomParams.unitgroup values in snapshot that classify anti-air units.
 * Verified against test-31479-433a460: aa (34 units) and weaponaa (6 units).
 */
export const ANTI_AIR_UNIT_GROUPS = new Set(['aa', 'weaponaa']);

/**
 * Default audio timings in seconds.
 */
export const ALERT_DEACTIVATION_HYSTERESIS_SEC = 2;
export const ALERT_SOUND_COOLDOWN_SEC = 20;
export const GLOBAL_AUDIO_LIMIT_SEC = 8;
export const CHAT_ECHO_COOLDOWN_SEC = 10;
export const DEFAULT_DUE_LEAD_SEC = 10;

/**
 * Minimum duration an alert must stay visible once activated.
 * // estimated: prevents HUD/audio flicker; human reaction and glance time requires at least 5s visible.
 */
export const ALERT_MIN_VISIBLE_SEC = 5;

/**
 * Window within which a cleared alert reactivating extends the previous interval instead of
 * creating a new activation, and suppresses sound re-cue.
 * // estimated: intermittent resource stalls or micro-idle states within 15s are a single continuous episode.
 */
export const ALERT_REACTIVATION_WINDOW_SEC = 15;

/**
 * Opening grace period before resource float alerts may trigger.
 * // estimated: players start game with full resource storage (1000 M / 1000 E) to execute initial build orders.
 */
export const FLOAT_OPENING_GRACE_SEC = 60;

/**
 * Tolerance window around planned sim stalls to suppress live stall warnings.
 * // estimated: ±10s tolerance matches slight timing variance between planned sim and real game execution.
 */
export const PLAN_EXPECTED_STALL_WINDOW_SEC = 10;

/**
 * Delay threshold after planned finish before an overdue step with >= 2 later completed steps is marked skipped.
 * // estimated: steps overdue by >60s while multiple later steps finish indicate order divergence or abandoned build items.
 */
export const STEP_OVERDUE_SKIP_SEC = 60;

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

/**
 * Most units one "load factory queue" press may queue; the widget enforces the same
 * limit on its side.
 */
export const ASSIST_QUEUE_MAX_UNITS = 20;
