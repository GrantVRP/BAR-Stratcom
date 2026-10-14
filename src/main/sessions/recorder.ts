import * as fs from 'fs';
import * as path from 'path';
import { isSafeName } from '../fs/path-guard';
import type { BridgeSource } from '../game/source';
import type { SessionFileDoc, StateDoc, WidgetEvent, WidgetHeartbeat } from '../../core/schemas/protocol';
import { SessionMetaSchema, type SessionMeta } from '../../core/schemas/session';
import { broadcast } from '../ipc/register';
import { SessionStore } from './store';
import { generateReportForSession } from './report-generator';

export interface SessionRecorderOptions {
  sessionsDir: string;
  stratcomDir?: string | null;
  activePlanIdProvider?: () => string | null;
  onReviewReady?: (payload: { sessionId: string }) => void;
  nowProvider?: () => number;
}

/**
 * SessionRecorder records live player and spectator sessions into
 * userData/sessions/<id>/, maintaining state.ndjson, events.ndjson, and meta.json.
 * On gameover or heartbeat loss (> 15s after game start), it finalises and cleans up
 * imported files in stratcomDir.
 */
export class SessionRecorder {
  private sessionsDir: string;
  private stratcomDir: string | null;
  private activePlanIdProvider?: () => string | null;
  private onReviewReady?: (payload: { sessionId: string }) => void;
  private nowProvider: () => number;

  private source: BridgeSource | null = null;
  private activeSessionId: string | null = null;
  private sessionDoc: SessionFileDoc | null = null;
  private lastHeartbeat: WidgetHeartbeat | null = null;
  private lastHeartbeatTime = 0;
  private gameStarted = false;
  private maxDurationSec = 0;
  private sessionStartedAt: string | null = null;
  private finalised = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  private stateQueue = Promise.resolve();
  private eventsQueue = Promise.resolve();

  private heartbeatHandler?: (hb: WidgetHeartbeat) => void;
  private sessionHandler?: (doc: SessionFileDoc) => void;
  private stateHandler?: (state: StateDoc) => void;
  private eventsHandler?: (events: WidgetEvent[]) => void;

  constructor(options: SessionRecorderOptions) {
    this.sessionsDir = options.sessionsDir;
    this.stratcomDir = options.stratcomDir ?? null;
    this.activePlanIdProvider = options.activePlanIdProvider;
    this.onReviewReady = options.onReviewReady;
    this.nowProvider = options.nowProvider ?? Date.now;
  }

  public setStratcomDir(dir: string | null): void {
    this.stratcomDir = dir;
  }

  public getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  public isFinalised(): boolean {
    return this.finalised;
  }

  public attach(source: BridgeSource): void {
    if (this.source) {
      this.detach();
    }
    this.source = source;

    this.heartbeatHandler = (hb) => {
      this.handleHeartbeat(hb);
    };

    this.sessionHandler = (doc) => {
      this.handleSessionDoc(doc);
    };

    this.stateHandler = (state) => {
      this.handleState(state);
    };

    this.eventsHandler = (events) => {
      this.handleEvents(events);
    };

    this.source.on('heartbeat', this.heartbeatHandler);
    this.source.on('session', this.sessionHandler);
    this.source.on('state', this.stateHandler);
    this.source.on('events', this.eventsHandler);

    this.heartbeatTimer = setInterval(() => {
      void this.checkHeartbeatLoss();
    }, 1000);
  }

  public detach(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.source) {
      if (this.heartbeatHandler) this.source.off('heartbeat', this.heartbeatHandler);
      if (this.sessionHandler) this.source.off('session', this.sessionHandler);
      if (this.stateHandler) this.source.off('state', this.stateHandler);
      if (this.eventsHandler) this.source.off('events', this.eventsHandler);
      this.source = null;
    }
  }

  private handleHeartbeat(hb: WidgetHeartbeat): void {
    this.lastHeartbeat = hb;
    this.lastHeartbeatTime = this.nowProvider();

    if (hb.gameStarted) {
      this.gameStarted = true;
    }

    if (hb.sessionId && hb.sessionId !== this.activeSessionId) {
      if (hb.mode === 'player' || hb.mode === 'spectator') {
        if (this.activeSessionId && !this.finalised) {
          void this.finalise();
        }
        this.startSession(hb.sessionId);
      }
    }

    if (hb.gameOver && this.activeSessionId && !this.finalised) {
      void this.finalise();
    }
  }

  private handleSessionDoc(doc: SessionFileDoc): void {
    if (doc.mode !== 'player' && doc.mode !== 'spectator') {
      return;
    }

    if (doc.sessionId !== this.activeSessionId) {
      if (this.activeSessionId && !this.finalised) {
        void this.finalise();
      }
      this.startSession(doc.sessionId);
    }

    this.sessionDoc = doc;
    void this.writeMetaFile();
  }

  private handleState(state: StateDoc): void {
    if (!this.activeSessionId) {
      // If we don't have an active session yet, check state sessionId
      if (state.sessionId) {
        this.startSession(state.sessionId);
      } else {
        return;
      }
    } else if (state.sessionId !== this.activeSessionId) {
      return;
    }

    const sessionId = this.activeSessionId;
    if (!sessionId) return;

    if (this.finalised) return;

    if (state.gameSeconds > this.maxDurationSec) {
      this.maxDurationSec = state.gameSeconds;
    }

    const sessionDir = path.join(this.sessionsDir, sessionId);
    const line = JSON.stringify(state) + '\n';

    this.stateQueue = this.stateQueue.then(async () => {
      await fs.promises.mkdir(sessionDir, { recursive: true });
      await fs.promises.appendFile(path.join(sessionDir, 'state.ndjson'), line, 'utf8');
    });
  }

  private handleEvents(events: WidgetEvent[]): void {
    if (!this.activeSessionId || this.finalised) return;

    let hasGameStart = false;
    let hasGameOver = false;

    for (const ev of events) {
      if (ev.e === 'gamestart') {
        hasGameStart = true;
      } else if (ev.e === 'gameover') {
        hasGameOver = true;
      }
    }

    if (hasGameStart) {
      this.gameStarted = true;
    }

    const sessionId = this.activeSessionId;
    const sessionDir = path.join(this.sessionsDir, sessionId);
    const lines = events.map((e) => JSON.stringify(e)).join('\n') + '\n';

    this.eventsQueue = this.eventsQueue.then(async () => {
      await fs.promises.mkdir(sessionDir, { recursive: true });
      await fs.promises.appendFile(path.join(sessionDir, 'events.ndjson'), lines, 'utf8');
    });

    if (hasGameOver) {
      void this.finalise();
    }
  }

  private startSession(sessionId: string): void {
    // the id names a folder under userData/sessions: a plain name only (path guard)
    if (!isSafeName(sessionId)) return;
    this.activeSessionId = sessionId;
    this.sessionDoc = null;
    this.finalised = false;
    this.finalisePromise = null;
    this.gameStarted = false;
    this.maxDurationSec = 0;
    this.sessionStartedAt = new Date(this.nowProvider()).toISOString();
    this.lastHeartbeatTime = this.nowProvider();
  }

  private async checkHeartbeatLoss(): Promise<void> {
    if (!this.activeSessionId || this.finalised || !this.gameStarted) {
      return;
    }

    const now = this.nowProvider();
    if (this.lastHeartbeatTime > 0 && now - this.lastHeartbeatTime > 15_000) {
      await this.finalise();
    }
  }

  private finalisePromise: Promise<void> | null = null;

  public async finalise(): Promise<void> {
    if (!this.activeSessionId) {
      return;
    }

    if (this.finalised) {
      return this.finalisePromise ?? Promise.resolve();
    }

    this.finalised = true;
    this.finalisePromise = this.runFinalise();
    return this.finalisePromise;
  }

  private async runFinalise(): Promise<void> {
    const sessionId = this.activeSessionId;
    if (!sessionId) return;

    // Flush pending file writes
    await Promise.all([this.stateQueue, this.eventsQueue]);

    // Build and validate meta.json
    const meta = this.buildMeta(sessionId);
    const validated = SessionMetaSchema.parse(meta);

    // Atomically write meta.json
    const sessionDir = path.join(this.sessionsDir, sessionId);
    await fs.promises.mkdir(sessionDir, { recursive: true });
    const metaFile = path.join(sessionDir, 'meta.json');
    const tmpFile = path.join(sessionDir, 'meta.json.tmp');
    await fs.promises.writeFile(tmpFile, JSON.stringify(validated, null, 2), 'utf8');
    await fs.promises.rename(tmpFile, metaFile);

    // Generate and persist post-match report
    await generateReportForSession({ sessionDir, meta: validated });

    // Broadcast review ready
    broadcast('review:ready', { sessionId });
    this.onReviewReady?.({ sessionId });

    // Apply retention policy (keep newest 200 sessions)
    try {
      const store = new SessionStore({ sessionsDir: this.sessionsDir });
      store.applyRetention();
    } catch {
      // Ignored
    }

    // Cleanup stratcom files only after successful write
    await this.cleanupStratcomFiles(sessionId);
  }

  private buildMeta(sessionId: string): SessionMeta {
    if (this.sessionDoc) {
      return {
        schemaVersion: 1,
        sessionId,
        mode: this.sessionDoc.mode,
        gameVersion: this.sessionDoc.gameVersion,
        engineVersion: this.sessionDoc.engineVersion,
        mapScriptName: this.sessionDoc.map.scriptName,
        durationSec: this.maxDurationSec,
        startedAt: this.sessionStartedAt ?? new Date(this.nowProvider()).toISOString(),
        teams: this.sessionDoc.teams.map((t) => ({
          teamId: t.teamId,
          allyTeamId: t.allyTeamId,
          playerName: t.playerName,
          factionId: t.factionId,
          isMe: t.isMe
        })),
        start: this.sessionDoc.start,
        planId: this.activePlanIdProvider?.() ?? undefined,
        source: 'live',
        anonymized: false
      };
    }

    const hb = this.lastHeartbeat;
    return {
      schemaVersion: 1,
      sessionId,
      mode: hb && (hb.mode === 'player' || hb.mode === 'spectator') ? hb.mode : 'player',
      gameVersion: hb?.gameVersion ?? 'unknown',
      engineVersion: hb?.engineVersion ?? 'unknown',
      mapScriptName: hb?.map.scriptName ?? 'unknown',
      durationSec: this.maxDurationSec,
      startedAt: this.sessionStartedAt ?? new Date(this.nowProvider()).toISOString(),
      teams: [
        {
          teamId: 0,
          allyTeamId: 0,
          playerName: 'Player',
          factionId: null,
          isMe: true
        }
      ],
      start: null,
      planId: this.activePlanIdProvider?.() ?? undefined,
      source: 'live',
      anonymized: false
    };
  }

  private async writeMetaFile(): Promise<void> {
    if (!this.activeSessionId) return;
    try {
      const sessionId = this.activeSessionId;
      const meta = this.buildMeta(sessionId);
      const validated = SessionMetaSchema.parse(meta);
      const sessionDir = path.join(this.sessionsDir, sessionId);
      await fs.promises.mkdir(sessionDir, { recursive: true });
      const metaFile = path.join(sessionDir, 'meta.json');
      const tmpFile = path.join(sessionDir, 'meta.json.tmp');
      await fs.promises.writeFile(tmpFile, JSON.stringify(validated, null, 2), 'utf8');
      await fs.promises.rename(tmpFile, metaFile);
    } catch {
      // In-flight meta write can retry on next event or finalise
    }
  }

  private async cleanupStratcomFiles(sessionId: string): Promise<void> {
    if (!this.stratcomDir) return;
    try {
      if (!fs.existsSync(this.stratcomDir)) return;
      const entries = await fs.promises.readdir(this.stratcomDir);
      for (const entry of entries) {
        const isEvents = entry.startsWith(`events-${sessionId}`) && entry.endsWith('.ndjson');
        const isSession = entry.startsWith(`session-${sessionId}`) && entry.endsWith('.json');
        if (isEvents || isSession) {
          try {
            await fs.promises.unlink(path.join(this.stratcomDir, entry));
          } catch {
            // Ignore deletion failures
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }
}
