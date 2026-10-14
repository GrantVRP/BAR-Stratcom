import { simMapFor, type SimMap } from '../maps/sim-map';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { EventEmitter } from 'events';
import type { BridgeEventMap, BridgeEventName, BridgeSource } from '../game/source';
import { SessionMetaSchema, type SessionMeta } from '../../core/schemas/session';
import {
  StateDocSchema,
  WidgetEventSchema,
  type SessionFileDoc,
  type StateDoc,
  type WidgetEvent,
  type WidgetHeartbeat
} from '../../core/schemas/protocol';
import type { DemoInfo } from '../../shared/ipc';
import { findDataDir } from '../registry/loader';
import { eventsToPlan } from '../../core/plans/events-to-plan';
import type { Registry } from '../../core/registry';
import type { BuildPlan } from '../../core/schemas/plans';

/**
 * Derives a valid BuildPlan from a fixture demo source.
 */
export function derivePlanFromDemo(demoSource: DemoSource, registry: Registry): BuildPlan {
  const meta = demoSource.getMeta();
  const myTeam = meta.teams.find((t) => t.isMe) ?? meta.teams[0]!;
  return eventsToPlan({
    registry,
    events: demoSource.getEvents(),
    teamId: myTeam.teamId,
    meta: {
      id: `plan-demo-${meta.sessionId}`,
      player: myTeam.playerName,
      map: meta.mapScriptName,
      factionId: myTeam.factionId ?? 'armada',
      gameVersion: meta.gameVersion,
      source: { kind: 'manual', createdAt: meta.startedAt }
    }
  });
}

/**
 * Reads lines from either state.ndjson or state.ndjson.gz in fixtureDir.
 */
export function readStateLines(fixtureDir: string): string[] {
  const gzPath = path.join(fixtureDir, 'state.ndjson.gz');
  const plainPath = path.join(fixtureDir, 'state.ndjson');

  let content: string;
  if (fs.existsSync(gzPath)) {
    const compressed = fs.readFileSync(gzPath);
    content = zlib.gunzipSync(compressed).toString('utf8');
  } else if (fs.existsSync(plainPath)) {
    content = fs.readFileSync(plainPath, 'utf8');
  } else {
    throw new Error(`Neither state.ndjson.gz nor state.ndjson found in ${fixtureDir}`);
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Returns player fixtures bundled with the app.
 */
export function listDemos(baseDir?: string): DemoInfo[] {
  const dataDir = baseDir ?? findDataDir();
  const sessionsDir = path.join(dataDir, 'fixtures', 'sessions');

  if (!fs.existsSync(sessionsDir)) {
    return [];
  }

  const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
  const demos: DemoInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fixtureDir = path.join(sessionsDir, entry.name);
    const metaPath = path.join(fixtureDir, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;

    try {
      const rawMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const meta = SessionMetaSchema.parse(rawMeta);

      // Only return player mode fixtures
      if (meta.mode !== 'player') continue;

      const myTeam = meta.teams.find((t) => t.isMe) ?? meta.teams[0];
      const rawFaction = myTeam?.factionId ?? 'unknown';
      const factionTitle = rawFaction.charAt(0).toUpperCase() + rawFaction.slice(1);
      const title = `${factionTitle} on ${meta.mapScriptName}`;
      const minutes = Math.floor(meta.durationSec / 60);
      const seconds = Math.floor(meta.durationSec % 60);
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const description = `1v1 vs AI • ${formattedDuration}`;

      demos.push({
        id: meta.sessionId,
        title,
        description,
        durationSec: meta.durationSec
      });
    } catch {
      // Ignore unparseable fixtures
    }
  }

  return demos.sort((a, b) => a.id.localeCompare(b.id));
}

export interface DemoSourceOptions {
  fixtureDir: string;
  speed?: number; // default 1 (e.g. 1, 4, 100)
}

/**
 * DemoSource replays a recorded match fixture (meta + state + events)
 * on a scaled timer, implementing BridgeSource.
 */
export class DemoSource extends EventEmitter implements BridgeSource {
  private fixtureDir: string;
  private speed: number;
  private running = false;
  private paused = false;
  private timer: NodeJS.Timeout | null = null;

  private meta: SessionMeta;
  private readonly simMap: SimMap;
  private states: StateDoc[] = [];
  private events: WidgetEvent[] = [];

  private currentStateIndex = 0;
  private currentEventIndex = 0;
  private heartbeatSeq = 1;

  constructor(options: DemoSourceOptions) {
    super();
    this.fixtureDir = options.fixtureDir;
    this.speed = options.speed && options.speed > 0 ? options.speed : 1;

    // Load fixture data
    const metaPath = path.join(this.fixtureDir, 'meta.json');
    const rawMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    this.meta = SessionMetaSchema.parse(rawMeta);
    // the fixture's real map (data/maps + BAR's wind table), not made-up wind values
    this.simMap = simMapFor(this.meta.mapScriptName);

    const stateLines = readStateLines(this.fixtureDir);
    this.states = stateLines.map((l) => StateDocSchema.parse(JSON.parse(l)));
    this.states.sort((a, b) => a.frame - b.frame);

    const eventsPath = path.join(this.fixtureDir, 'events.ndjson');
    if (fs.existsSync(eventsPath)) {
      const eventLines = fs
        .readFileSync(eventsPath, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      this.events = eventLines.map((l) => WidgetEventSchema.parse(JSON.parse(l)));
      this.events.sort((a, b) => a.f - b.f);
    }
  }

  public getMeta(): SessionMeta {
    return this.meta;
  }

  public getStates(): StateDoc[] {
    return this.states;
  }

  public getEvents(): WidgetEvent[] {
    return this.events;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public getSpeed(): number {
    return this.speed;
  }

  public setSpeed(newSpeed: number): void {
    if (newSpeed <= 0) return;
    this.speed = newSpeed;
    if (this.running && !this.paused) {
      this.reschedule();
    }
  }

  override on<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override off<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.currentStateIndex = 0;
    this.currentEventIndex = 0;
    this.heartbeatSeq = 1;

    // 1. Emit initial session doc
    const sessionDoc: SessionFileDoc = {
      protocol: 1,
      kind: 'session',
      sessionId: this.meta.sessionId,
      mode: this.meta.mode,
      gameVersion: this.meta.gameVersion,
      engineVersion: this.meta.engineVersion,
      map: {
        scriptName: this.meta.mapScriptName,
        windMin: this.simMap.windMin,
        windMax: this.simMap.windMax,
        tidal: this.simMap.tidalStrength
      },
      teams: this.meta.teams.map((t) => ({
        teamId: t.teamId,
        allyTeamId: t.allyTeamId,
        playerName: t.playerName,
        factionId: t.factionId,
        isAI: !t.isMe,
        isMe: t.isMe
      })),
      start: this.meta.start
    };
    this.emit('session', sessionDoc);

    // 2. Emit initial heartbeat
    this.emitHeartbeat(0, false);

    // 3. Step immediately for t = 0
    this.step();

    // 4. Schedule recurring ticks
    this.reschedule();
  }

  public pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.reschedule();
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    this.paused = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Advances simulation by one recorded state frame.
   * Returns false when all states have finished.
   */
  public step(): boolean {
    if (this.currentStateIndex >= this.states.length) {
      // Emit any remaining events
      if (this.currentEventIndex < this.events.length) {
        const remaining = this.events.slice(this.currentEventIndex);
        this.currentEventIndex = this.events.length;
        this.emit('events', remaining);
      }
      this.stop();
      this.emit('end', { reason: 'completed' });
      return false;
    }

    const state = this.states[this.currentStateIndex]!;
    this.currentStateIndex++;

    // Collect events up to state.frame
    const batch: WidgetEvent[] = [];
    while (
      this.currentEventIndex < this.events.length &&
      this.events[this.currentEventIndex]!.f <= state.frame
    ) {
      batch.push(this.events[this.currentEventIndex]!);
      this.currentEventIndex++;
    }

    if (batch.length > 0) {
      this.emit('events', batch);
    }

    // Emit state and heartbeat
    this.emit('state', state);
    const isGameOver = batch.some((e) => e.e === 'gameover');
    this.emitHeartbeat(state.frame, isGameOver);

    if (isGameOver) {
      this.stop();
      this.emit('end', { reason: 'gameover' });
      return false;
    }

    return true;
  }

  private reschedule(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Default fixture interval is 1 state per second = 1000 ms
    const intervalMs = Math.max(1, Math.floor(1000 / this.speed));
    this.timer = setInterval(() => {
      if (!this.step()) {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
      }
    }, intervalMs);
  }

  private emitHeartbeat(frame: number, gameOver: boolean): void {
    const hb: WidgetHeartbeat = {
      protocol: 1,
      widgetVersion: '3.0.0',
      engineVersion: this.meta.engineVersion,
      gameVersion: this.meta.gameVersion,
      sessionId: this.meta.sessionId,
      mode: this.meta.mode,
      canControlUnits: false,
      frame,
      gameStarted: true,
      gameOver,
      map: {
        scriptName: this.meta.mapScriptName,
        windMin: this.simMap.windMin,
        windMax: this.simMap.windMax,
        avgWind: this.simMap.windAvg,
        windRisk: null,
        tidal: this.simMap.tidalStrength
      },
      perf: null,
      degraded: false,
      heartbeat: this.heartbeatSeq++
    };
    this.emit('heartbeat', hb);
  }
}
