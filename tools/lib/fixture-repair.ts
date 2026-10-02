import type { StateDoc } from '../../src/core/schemas/protocol';
import type { SessionTeamMember } from '../../src/core/schemas/session';

export interface RawSessionTeam {
  teamId: number;
  allyTeamId: number;
  playerName: string;
  factionId: string | null;
  isAI: boolean;
  isMe: boolean;
}

export interface RawSessionFile {
  protocol: number;
  kind: string;
  sessionId: string;
  mode: 'player' | 'spectator' | 'replay';
  gameVersion: string;
  engineVersion: string;
  widgetVersion?: string;
  map: {
    scriptName: string;
    windMin: number;
    windMax: number;
    tidal: number;
  };
  teams: RawSessionTeam[];
  start: {
    metal: number;
    energy: number;
    metalStorage: number;
    energyStorage: number;
  } | null;
}

export interface CommanderInfo {
  commanderDef: string;
  factionId: string;
}

export function deriveFactionFromDef(def: string): string | null {
  if (def.startsWith('arm')) return 'armada';
  if (def.startsWith('cor')) return 'cortex';
  if (def.startsWith('leg')) return 'legion';
  return null;
}

/**
 * Scans events for commander creation events per team.
 */
export function extractTeamCommanders(events: Array<{ e: string; tm?: number; d?: string }>): Map<number, CommanderInfo> {
  const map = new Map<number, CommanderInfo>();
  for (const ev of events) {
    if (ev.e === 'created' && ev.tm !== undefined && ev.d) {
      const factionId = deriveFactionFromDef(ev.d);
      if (factionId && ev.d.includes('com')) {
        if (!map.has(ev.tm)) {
          map.set(ev.tm, { commanderDef: ev.d, factionId });
        }
      }
    }
  }
  return map;
}

export interface RepairResult {
  repairedTeams: SessionTeamMember[];
  notes: string[];
  isOwnerReplay: boolean;
  repairedPlayerFaction: string;
}

/**
 * Repairs session teams for widget 3.0.0 data and applies anonymisation.
 */
export function repairAndAnonymizeSessionTeams(
  session: RawSessionFile,
  commanders: Map<number, CommanderInfo>,
  ownerName: string
): RepairResult {
  const isWidget300 = !session.widgetVersion || session.widgetVersion === '3.0.0';
  const notes: string[] = [];

  let repairedFaction = false;
  let repairedAi = false;

  // General rule (T03.2 §9): a spectator/replay fixture is an owner game if the owner name appears
  // as any team, OR if more than half of its teams are AI.
  const aiTeamCount = session.teams.filter((t) => t.isAI).length;
  const hasOwnerTeam = session.teams.some((t) => t.playerName === ownerName);
  const isOwnerReplay =
    (session.mode === 'replay' || session.mode === 'spectator') &&
    (hasOwnerTeam || aiTeamCount > session.teams.length / 2);

  const repairedTeams: SessionTeamMember[] = [];
  let playerFaction = 'cortex'; // default fallback

  for (const t of session.teams) {
    let playerName = t.playerName;
    let factionId = t.factionId;

    if (isWidget300) {
      // 1. Repair AI teams whose playerName equals the human's name -> "AI" (BEFORE anonymisation)
      if (t.isAI && playerName === ownerName) {
        playerName = 'AI';
        repairedAi = true;
      }

      // 2. Repair null factionId from commander event
      if (!factionId) {
        const comm = commanders.get(t.teamId);
        if (comm) {
          factionId = comm.factionId;
          repairedFaction = true;
        }
      }
    }

    // 3. Anonymise human owner to "Player"
    if (playerName === ownerName || t.isMe) {
      playerName = 'Player';
      if (factionId) {
        playerFaction = factionId;
      }
    }

    repairedTeams.push({
      teamId: t.teamId,
      allyTeamId: t.allyTeamId,
      playerName,
      factionId,
      isMe: t.isMe
    });
  }

  if (repairedFaction) {
    notes.push('repaired factionId and startUnitId');
  }
  if (repairedAi) {
    notes.push('repaired AI team playerName');
  }
  if (isOwnerReplay) {
    notes.push('owner game vs AI, not a pro reference');
  }
  if (isWidget300 && (session.mode === 'replay' || session.mode === 'spectator')) {
    notes.push('widget-3.0.0 replay team names may be unreliable');
  }

  return {
    repairedTeams,
    notes,
    isOwnerReplay,
    repairedPlayerFaction: playerFaction
  };
}

/**
 * Repairs a single state doc (me, teams, counts, enemies, sessionId).
 */
export function repairStateDoc(
  doc: StateDoc,
  fixtureSessionId: string,
  session: RawSessionFile,
  commanders: Map<number, CommanderInfo>,
  ownerName: string
): StateDoc {
  const isWidget300 = !session.widgetVersion || session.widgetVersion === '3.0.0';

  // Set sessionId to fixture folder name
  doc.sessionId = fixtureSessionId;

  // Normalize empty counts/enemies
  if (Array.isArray(doc.counts) && doc.counts.length === 0) {
    (doc as unknown as { counts: Record<string, unknown> }).counts = {};
  }
  if (Array.isArray(doc.enemies) && doc.enemies.length === 0) {
    (doc as unknown as { enemies: Record<string, unknown> }).enemies = {};
  }

  // Repair me
  if (doc.me) {
    if (isWidget300) {
      const comm = commanders.get(doc.me.teamId);
      if (comm) {
        if (!doc.me.factionId) {
          doc.me.factionId = comm.factionId;
        }
        if (typeof doc.me.startUnitId === 'number' || !doc.me.startUnitId) {
          doc.me.startUnitId = comm.commanderDef;
        }
      }
    }
    if (doc.me.playerName === ownerName) {
      doc.me.playerName = 'Player';
    }
  }

  // Repair teams
  if (doc.teams) {
    for (const t of doc.teams) {
      if (Array.isArray(t.counts) && t.counts.length === 0) {
        (t as unknown as { counts: Record<string, unknown> }).counts = {};
      }
      const rawTeam = session.teams.find((st) => st.teamId === t.teamId);
      if (isWidget300) {
        if (rawTeam?.isAI && t.playerName === ownerName) {
          t.playerName = 'AI';
        }
        if (!t.factionId) {
          const comm = commanders.get(t.teamId);
          if (comm) {
            t.factionId = comm.factionId;
          }
        }
      }
      if (t.playerName === ownerName) {
        t.playerName = 'Player';
      }
    }
  }

  return doc;
}

/**
 * Derives a clean map slug from script name.
 */
export function getMapSlug(scriptName: string): string {
  const lower = scriptName.toLowerCase();
  if (lower.includes('barr')) return 'barr';
  if (lower.includes('onyx')) return 'onyx';
  if (lower.includes('altair')) return 'altair';
  if (lower.includes('dworld')) return 'dworld';
  if (lower.includes('ptaq')) return 'ptaq';
  if (lower.includes('mediterraneum')) return 'mediterraneum';

  // Fallback: clean non-alphanumeric, take first word or clean string
  const clean = scriptName
    .replace(/[._\-vV]?\d+(\.\d+)*$/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return clean || 'map';
}
