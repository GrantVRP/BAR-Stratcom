import type { AlertId, AlertSeverity, Alert, Cue, SoundId, CueAlertId } from '../schemas/coach';
import type { AlertCandidate } from './alerts';
import {
  ALERT_DEACTIVATION_HYSTERESIS_SEC,
  ALERT_SOUND_COOLDOWN_SEC,
  GLOBAL_AUDIO_LIMIT_SEC,
  AUDIO_SEVERITY_PRIORITY,
  ALL_ALERT_IDS,
  ALERT_MIN_VISIBLE_SEC,
  ALERT_REACTIVATION_WINDOW_SEC
} from './constants';

export interface AlertMemoryItem {
  active: boolean;
  since: number;
  lastTrueAt: number;
  lastFalseAt: number;
  lastClearedAt: number;
  lastSoundAt: number;
  severity: AlertSeverity;
  text: string;
}

export interface CoachMemory {
  alerts: Partial<Record<AlertId, AlertMemoryItem>>;
  lastGlobalAudioAt: number;
  lastChatEchoAt: number;
  dueStepIds: Set<string>;
  doneStepIds: Set<string>;
  skippedStepIds: Set<string>;
}

export function createInitialCoachMemory(): CoachMemory {
  return {
    alerts: {},
    lastGlobalAudioAt: -Infinity,
    lastChatEchoAt: -Infinity,
    dueStepIds: new Set<string>(),
    doneStepIds: new Set<string>(),
    skippedStepIds: new Set<string>()
  };
}

export interface AlertUpdateResult {
  activeAlerts: Alert[];
  updatedAlertMemory: Record<AlertId, AlertMemoryItem>;
  soundCandidateAlerts: Alert[];
}

/**
 * Updates alert states with sustained check, min 5s visibility, 2s deactivation hysteresis,
 * 15s reactivation interval extension, and 20s sound cooldown.
 */
export function updateAlertRules(
  detectedCandidates: Partial<Record<AlertId, AlertCandidate>>,
  clock: number,
  prevMemory: CoachMemory
): AlertUpdateResult {
  const updatedAlertMemory = {} as Record<AlertId, AlertMemoryItem>;
  const activeAlerts: Alert[] = [];
  const soundCandidateAlerts: Alert[] = [];

  for (const id of ALL_ALERT_IDS) {
    const candidate = detectedCandidates[id];
    const prev = prevMemory.alerts[id];

    let active = false;
    let since = prev ? prev.since : clock;
    let lastTrueAt = prev ? prev.lastTrueAt : -Infinity;
    let lastFalseAt = prev ? prev.lastFalseAt : -Infinity;
    let lastClearedAt = prev ? prev.lastClearedAt : -Infinity;
    const lastSoundAt = prev ? prev.lastSoundAt : -Infinity;
    let severity: AlertSeverity = candidate ? candidate.severity : prev ? prev.severity : 'info';
    let text: string = candidate ? candidate.text : prev ? prev.text : '';
    let isExtended = false;

    if (candidate) {
      lastTrueAt = clock;
      severity = candidate.severity;
      text = candidate.text;
      if (prev && prev.active) {
        active = true;
        since = prev.since;
      } else {
        // Reactivating within 15s of clearing extends previous interval without re-cueing sound (T05.10 item 5)
        if (prev && clock - lastClearedAt <= ALERT_REACTIVATION_WINDOW_SEC) {
          active = true;
          since = prev.since;
          isExtended = true;
        } else {
          active = true;
          since = clock;
        }
      }
    } else {
      lastFalseAt = clock;
      if (prev && prev.active) {
        // No flicker: remain active until visible for >= 5s AND false for >= 2s (T05.10 item 5)
        const visibleElapsed = clock - prev.since;
        const falseElapsed = clock - lastTrueAt;
        if (visibleElapsed < ALERT_MIN_VISIBLE_SEC || falseElapsed < ALERT_DEACTIVATION_HYSTERESIS_SEC) {
          active = true;
          since = prev.since;
        } else {
          active = false;
          lastClearedAt = clock;
        }
      } else {
        active = false;
      }
    }

    const item: AlertMemoryItem = {
      active,
      since,
      lastTrueAt,
      lastFalseAt,
      lastClearedAt,
      lastSoundAt,
      severity,
      text
    };

    updatedAlertMemory[id] = item;

    if (active) {
      const alertObj: Alert = {
        id,
        severity,
        text,
        since,
        dedupeKey: id
      };
      activeAlerts.push(alertObj);

      // Check 20s sound cooldown. Extended activations do NOT re-cue sound (T05.10 item 5)
      if (!isExtended && clock - lastSoundAt >= ALERT_SOUND_COOLDOWN_SEC) {
        soundCandidateAlerts.push(alertObj);
      }
    }
  }

  // Sort active alerts: severity descending (danger > warn > info), then age descending (newest first)
  activeAlerts.sort((a, b) => {
    const sevDiff = (AUDIO_SEVERITY_PRIORITY[b.severity] ?? 0) - (AUDIO_SEVERITY_PRIORITY[a.severity] ?? 0);
    if (sevDiff !== 0) return sevDiff;
    return b.since - a.since;
  });

  return {
    activeAlerts,
    updatedAlertMemory,
    soundCandidateAlerts
  };
}

interface AudioCandidate {
  id: string;
  alertId: CueAlertId;
  sound: SoundId;
  text: string;
  at: number;
  priority: number;
  targetAlertId?: AlertId;
}

/**
 * Resolves audio cues under the 8s global audio limit and priority rule (danger > warn > info > step).
 */
export function resolveAudioCues(
  alertSoundCandidates: readonly Alert[],
  stepCues: readonly Cue[],
  clock: number,
  lastGlobalAudioAt: number
): { emittedCues: Cue[]; newLastGlobalAudioAt: number; soundedAlertIds: Set<AlertId> } {
  const soundedAlertIds = new Set<AlertId>();

  // Check 8s global audio limit
  if (clock - lastGlobalAudioAt < GLOBAL_AUDIO_LIMIT_SEC) {
    return {
      emittedCues: [],
      newLastGlobalAudioAt: lastGlobalAudioAt,
      soundedAlertIds
    };
  }

  const candidates: AudioCandidate[] = [];

  for (const a of alertSoundCandidates) {
    candidates.push({
      id: `cue-${a.id}-${Math.round(clock)}`,
      alertId: a.id,
      sound: a.severity,
      text: a.text,
      at: clock,
      priority: AUDIO_SEVERITY_PRIORITY[a.severity] ?? 0,
      targetAlertId: a.id
    });
  }

  for (const s of stepCues) {
    candidates.push({
      id: s.id,
      alertId: s.alertId,
      sound: s.sound,
      text: s.text,
      at: s.at,
      priority: AUDIO_SEVERITY_PRIORITY[s.sound] ?? 1
    });
  }

  if (candidates.length === 0) {
    return {
      emittedCues: [],
      newLastGlobalAudioAt: lastGlobalAudioAt,
      soundedAlertIds
    };
  }

  // Pick highest priority candidate
  candidates.sort((a, b) => b.priority - a.priority);
  const winner = candidates[0];

  if (!winner) {
    return {
      emittedCues: [],
      newLastGlobalAudioAt: lastGlobalAudioAt,
      soundedAlertIds
    };
  }

  if (winner.targetAlertId) {
    soundedAlertIds.add(winner.targetAlertId);
  }

  const cue: Cue = {
    id: winner.id,
    alertId: winner.alertId,
    sound: winner.sound,
    text: winner.text,
    at: winner.at
  };

  return {
    emittedCues: [cue],
    newLastGlobalAudioAt: clock,
    soundedAlertIds
  };
}
