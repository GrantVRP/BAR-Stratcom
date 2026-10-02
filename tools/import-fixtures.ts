import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';
import { StateDocSchema, WidgetEventSchema, type StateDoc, type WidgetEvent } from '../src/core/schemas/protocol';
import { SessionMetaSchema, type SessionMeta } from '../src/core/schemas/session';
import {
  extractTeamCommanders,
  getMapSlug,
  repairAndAnonymizeSessionTeams,
  repairStateDoc,
  type RawSessionFile
} from './lib/fixture-repair';

export interface ImportOptions {
  fromDir: string;
  toDir: string;
  ownerName: string;
  slugOverride?: string;
  sessionFilter?: string;
}

export function parseSessionTimestampToIso(sessionId: string): string {
  const match = sessionId.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`;
  }
  return new Date().toISOString();
}

async function readAllEvents(filePath: string): Promise<WidgetEvent[]> {
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const events: WidgetEvent[] = [];
  let lineIdx = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    lineIdx++;
    try {
      const parsed: unknown = JSON.parse(line);
      events.push(parsed as WidgetEvent);
    } catch (err) {
      throw new Error(`Failed to parse JSON in ${filePath} at line ${lineIdx}: ${err}`);
    }
  }
  return events;
}

async function readRawStateDocs(filePath: string, maxSeconds: number): Promise<StateDoc[]> {
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const docs: StateDoc[] = [];
  let lineIdx = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    lineIdx++;
    try {
      const parsed = JSON.parse(line) as StateDoc;
      if (parsed.gameSeconds > maxSeconds) {
        break;
      }
      docs.push(parsed);
    } catch (err) {
      throw new Error(`Failed to parse state JSON in ${filePath} at line ${lineIdx}: ${err}`);
    }
  }
  return docs;
}

export async function importFixtures(opts: ImportOptions): Promise<string[]> {
  const { fromDir, toDir, ownerName, slugOverride, sessionFilter } = opts;
  if (!fs.existsSync(fromDir)) {
    throw new Error(`Source directory does not exist: ${fromDir}`);
  }

  const sessionFiles = fs
    .readdirSync(fromDir)
    .filter((f) => f.startsWith('session-') && f.endsWith('.json'))
    .sort();

  const importedFolderNames: string[] = [];

  const existingStartedAts = new Set<string>();
  if (fs.existsSync(toDir)) {
    const existingDirs = fs.readdirSync(toDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const d of existingDirs) {
      const metaPath = path.join(toDir, d.name, 'meta.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          if (meta.startedAt) {
            existingStartedAts.add(meta.startedAt);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  for (const sFile of sessionFiles) {
    const rawSessionId = sFile.replace(/^session-/, '').replace(/\.json$/, '');
    if (sessionFilter && !rawSessionId.includes(sessionFilter)) {
      continue;
    }

    const sessionIso = parseSessionTimestampToIso(rawSessionId);
    if (existingStartedAts.has(sessionIso)) {
      console.log(`[import-fixtures] Skipping ${rawSessionId}: already exists in fixtures`);
      continue;
    }

    const sessionPath = path.join(fromDir, sFile);
    const eventsPath = path.join(fromDir, `events-${rawSessionId}.ndjson`);
    const statePath = path.join(fromDir, `state-${rawSessionId}.ndjson`);

    if (!fs.existsSync(eventsPath) || !fs.existsSync(statePath)) {
      console.warn(`[import-fixtures] Skipping ${rawSessionId}: missing events or state file`);
      continue;
    }

    const rawSession: RawSessionFile = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    const allEvents = await readAllEvents(eventsPath);

    // Calculate approximate duration
    const lastEvent = allEvents[allEvents.length - 1];
    const eventSec = lastEvent ? lastEvent.f / 30 : 0;

    // Read first state pass up to 900s
    let stateDocs = await readRawStateDocs(statePath, 900);
    const lastDoc = stateDocs[stateDocs.length - 1];
    const duration = Math.max(lastDoc?.gameSeconds ?? 0, eventSec);

    // Minimum length filter (T03.2 §5)
    if (rawSession.mode === 'player' && duration < 360) {
      console.log(`[import-fixtures] Skipping player session ${rawSessionId}: duration ${duration.toFixed(1)}s < 360s`);
      continue;
    }
    if ((rawSession.mode === 'spectator' || rawSession.mode === 'replay') && duration < 600) {
      console.log(`[import-fixtures] Skipping ${rawSession.mode} session ${rawSessionId}: duration ${duration.toFixed(1)}s < 600s`);
      continue;
    }

    // Extract commanders from all events
    const commanders = extractTeamCommanders(allEvents);

    // Repair session teams & notes
    const { repairedTeams, notes, isOwnerReplay, repairedPlayerFaction } = repairAndAnonymizeSessionTeams(
      rawSession,
      commanders,
      ownerName
    );

    // Derive fixture folder name
    const dateMatch = rawSessionId.match(/^(\d{4})(\d{2})(\d{2})/);
    const dateStr = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : '2026-10-01';

    const modeSlug = rawSession.teams.length === 2 ? '1v1' : rawSession.teams.length <= 8 ? 'small-team' : 'large-team';
    const factionSlug = rawSession.mode === 'spectator' || rawSession.mode === 'replay' ? 'multi' : repairedPlayerFaction;

    const mapSlug = getMapSlug(rawSession.map.scriptName);
    let slug = slugOverride;
    if (!slug) {
      if (isOwnerReplay) {
        slug = `owner-vs-ai-${mapSlug}`;
      } else if (rawSession.mode === 'player') {
        const hasAi = rawSession.teams.some((t) => t.isAI);
        const base = hasAi ? `vs-ai-${mapSlug}` : `vs-player-${mapSlug}`;
        slug = duration < 600 ? `${base}-${Math.round(duration)}s` : base;
      } else {
        slug = mapSlug;
      }
    }

    const fixtureId = `${dateStr}-${factionSlug}-${modeSlug}-${slug}`;
    const targetDir = path.join(toDir, fixtureId);
    fs.mkdirSync(targetDir, { recursive: true });

    // Repair and validate state docs
    for (let i = 0; i < stateDocs.length; i++) {
      const repaired = repairStateDoc(stateDocs[i]!, fixtureId, rawSession, commanders, ownerName);
      StateDocSchema.parse(repaired);
      stateDocs[i] = repaired;
    }

    // Filter and validate events up to last state frame
    const maxFrame = stateDocs[stateDocs.length - 1]?.frame ?? 900 * 30;
    const fixtureEvents = allEvents.filter((ev) => ev.f <= maxFrame);
    for (const ev of fixtureEvents) {
      WidgetEventSchema.parse(ev);
    }

    // Write events.ndjson
    const eventsText = fixtureEvents.map((ev) => JSON.stringify(ev)).join('\n') + '\n';
    fs.writeFileSync(path.join(targetDir, 'events.ndjson'), eventsText, 'utf-8');

    // Handle state compression and 5 MB size guard
    let stateText = stateDocs.map((doc) => JSON.stringify(doc)).join('\n') + '\n';
    const uncompressedBytes = Buffer.byteLength(stateText, 'utf-8');

    if (uncompressedBytes > 2 * 1024 * 1024) {
      let compressed = zlib.gzipSync(Buffer.from(stateText, 'utf-8'), { level: 9 });
      if (compressed.length > 5 * 1024 * 1024) {
        console.warn(`[import-fixtures] ${fixtureId} compressed state > 5 MB (${compressed.length} bytes), trimming to 600s`);
        stateDocs = await readRawStateDocs(statePath, 600);
        for (let i = 0; i < stateDocs.length; i++) {
          const repaired = repairStateDoc(stateDocs[i]!, fixtureId, rawSession, commanders, ownerName);
          StateDocSchema.parse(repaired);
          stateDocs[i] = repaired;
        }
        stateText = stateDocs.map((doc) => JSON.stringify(doc)).join('\n') + '\n';
        compressed = zlib.gzipSync(Buffer.from(stateText, 'utf-8'), { level: 9 });
        notes.push('trimmed to 600 s due to compressed size > 5 MB');
      }
      fs.writeFileSync(path.join(targetDir, 'state.ndjson.gz'), compressed);
      // Clean up uncompressed if previously existed
      if (fs.existsSync(path.join(targetDir, 'state.ndjson'))) {
        fs.unlinkSync(path.join(targetDir, 'state.ndjson'));
      }
    } else {
      fs.writeFileSync(path.join(targetDir, 'state.ndjson'), stateText, 'utf-8');
      if (fs.existsSync(path.join(targetDir, 'state.ndjson.gz'))) {
        fs.unlinkSync(path.join(targetDir, 'state.ndjson.gz'));
      }
    }

    // Build and validate SessionMeta
    const meta: SessionMeta = {
      schemaVersion: 1,
      sessionId: fixtureId,
      mode: rawSession.mode,
      gameVersion: rawSession.gameVersion,
      engineVersion: rawSession.engineVersion,
      mapScriptName: rawSession.map.scriptName,
      durationSec: stateDocs[stateDocs.length - 1]?.gameSeconds ?? Math.round(duration),
      startedAt: parseSessionTimestampToIso(rawSession.sessionId),
      teams: repairedTeams,
      start: rawSession.start
        ? {
            metal: rawSession.start.metal,
            energy: rawSession.start.energy,
            metalStorage: rawSession.start.metalStorage,
            energyStorage: rawSession.start.energyStorage
          }
        : null,
      source: 'fixture',
      anonymized: true,
      ...(notes.length > 0 ? { notes: notes.join('; ') } : {})
    };

    SessionMetaSchema.parse(meta);
    fs.writeFileSync(path.join(targetDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf-8');
    if (fs.existsSync(path.join(targetDir, 'session.json'))) {
      fs.unlinkSync(path.join(targetDir, 'session.json'));
    }

    importedFolderNames.push(fixtureId);
    console.log(`[import-fixtures] Successfully imported fixture: ${fixtureId}`);
  }

  return importedFolderNames;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('import-fixtures.ts')) {
  const args = process.argv.slice(2);
  let fromDir = path.resolve('data/raw/h1');
  let toDir = path.resolve('data/fixtures/sessions');
  let ownerName = 'Grant_P';
  let slugOverride: string | undefined;
  let sessionFilter: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      fromDir = path.resolve(args[++i]!);
    } else if (args[i] === '--to' && args[i + 1]) {
      toDir = path.resolve(args[++i]!);
    } else if (args[i] === '--me' && args[i + 1]) {
      ownerName = args[++i]!;
    } else if (args[i] === '--slug' && args[i + 1]) {
      slugOverride = args[++i]!;
    } else if (args[i] === '--session' && args[i + 1]) {
      sessionFilter = args[++i]!;
    }
  }

  importFixtures({ fromDir, toDir, ownerName, slugOverride, sessionFilter })
    .then((imported) => {
      console.log(`[import-fixtures] Imported ${imported.length} fixtures total.`);
    })
    .catch((err) => {
      console.error('[import-fixtures] Failed:', err);
      process.exit(1);
    });
}
