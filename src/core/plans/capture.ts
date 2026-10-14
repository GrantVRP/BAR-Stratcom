import type { BuildPlan, CapturePlayer, PlanSource, PlanValidationResult, SessionMeta } from '../schemas';
import type { WidgetEvent } from '../schemas/protocol';
import type { Registry } from '../registry';
import { eventsToPlan } from './events-to-plan';
import { validatePlan } from './validate';

export const CAPTURE_HORIZON_SEC = 600;

export interface CaptureInput {
  registry: Registry;
  meta: SessionMeta;
  events: readonly WidgetEvent[];
  teamId: number;
  horizonSec?: number;
  /** Already parsed with `parseReplayIdOrUrl`; falls back to `meta.replay`. */
  replayId?: string;
  /** ISO timestamp supplied by the caller (core has no clock). */
  capturedAt: string;
}

export interface CaptureResult {
  plan: BuildPlan;
  issues: PlanValidationResult;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function factionLabel(factionId: string): string {
  return factionId.charAt(0).toUpperCase() + factionId.slice(1);
}

function isFactionSupported(registry: Registry, factionId: string): boolean {
  try {
    registry.commanderOf(factionId);
    return true;
  } catch {
    return false;
  }
}

function countBuildEvents(events: readonly WidgetEvent[], teamId: number, horizonSec: number): number {
  let count = 0;
  for (const e of events) {
    if (e.e === 'created' && e.tm === teamId && e.bd && e.f > 0 && e.f <= horizonSec * 30) count += 1;
  }
  return count;
}

/** Why a team cannot be captured, or null when it can. */
export function captureBlocker(
  registry: Registry,
  team: SessionMeta['teams'][number],
  events: readonly WidgetEvent[],
  horizonSec = CAPTURE_HORIZON_SEC
): string | null {
  if (team.factionId && !isFactionSupported(registry, team.factionId)) {
    return `${factionLabel(team.factionId)} is not supported yet`;
  }
  if (countBuildEvents(events, team.teamId, horizonSec) === 0) {
    return 'No build events recorded for this player';
  }
  return null;
}

/** The players of a session with whether a plan can be captured from each (capture:listPlayers). */
export function listCapturePlayers(
  registry: Registry,
  meta: SessionMeta,
  events: readonly WidgetEvent[]
): CapturePlayer[] {
  return meta.teams.map((t) => {
    const reason = captureBlocker(registry, t, events);
    return {
      teamId: t.teamId,
      name: t.playerName,
      faction: t.factionId ?? null,
      allyTeam: t.allyTeamId,
      isMe: t.isMe,
      capturable: reason === null,
      reason
    };
  });
}

/** Turns one team's recorded build events into a validated plan (capture:toPlan). */
export function capturePlan(input: CaptureInput): CaptureResult {
  const { registry, meta, events, teamId, capturedAt } = input;
  const horizonSec = input.horizonSec ?? CAPTURE_HORIZON_SEC;
  const team = meta.teams.find((t) => t.teamId === teamId);
  if (!team) throw new Error(`Team ${teamId} is not in this session`);

  const blocker = captureBlocker(registry, team, events, horizonSec);
  if (blocker) throw new Error(blocker);

  const isOwnGame = meta.mode === 'player';
  const source: PlanSource = isOwnGame
    ? { kind: 'own-game', sessionId: meta.sessionId, map: meta.mapScriptName, capturedAt }
    : {
        kind: 'replay-capture',
        sessionId: meta.sessionId,
        replayId: input.replayId ?? meta.replay?.replayId,
        player: team.playerName,
        map: meta.mapScriptName,
        capturedAt
      };

  const plan = eventsToPlan({
    registry,
    events: [...events],
    teamId,
    horizonSec,
    teams: meta.teams.map((t) => ({ teamId: t.teamId, allyTeamId: t.allyTeamId })),
    meta: {
      id: `capture-${slug(meta.sessionId)}-t${teamId}`,
      player: team.playerName,
      map: meta.mapScriptName,
      title: isOwnGame ? `${team.playerName} - ${meta.mapScriptName}`.slice(0, 60) : undefined,
      factionId: team.factionId ?? undefined,
      gameVersion: meta.gameVersion,
      source
    }
  });

  if (plan.steps.length === 0) {
    throw new Error(`No build events recorded for this player in the first ${horizonSec / 60} minutes`);
  }

  return { plan, issues: validatePlan(plan, registry) };
}
