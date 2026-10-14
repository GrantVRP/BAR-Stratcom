import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { app } from 'electron';
import {
  SessionMetaSchema,
  SessionReportSchema,
  type SessionDetail,
  type SessionMeta,
  type SessionReport,
  type SessionSummary
} from '../../core/schemas';

export interface SessionStoreOptions {
  sessionsDir?: string;
  maxSessions?: number;
}

/**
 * Reads lines from state.ndjson or state.ndjson.gz in directory.
 */
export function readStateLines(sessionDir: string): string[] {
  const gzPath = path.join(sessionDir, 'state.ndjson.gz');
  const plainPath = path.join(sessionDir, 'state.ndjson');

  let content = '';
  if (fs.existsSync(gzPath)) {
    const compressed = fs.readFileSync(gzPath);
    content = zlib.gunzipSync(compressed).toString('utf8');
  } else if (fs.existsSync(plainPath)) {
    content = fs.readFileSync(plainPath, 'utf8');
  } else {
    return [];
  }

  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Reads lines from events.ndjson in directory.
 */
export function readEventsLines(sessionDir: string): string[] {
  const plainPath = path.join(sessionDir, 'events.ndjson');
  if (!fs.existsSync(plainPath)) {
    return [];
  }

  const content = fs.readFileSync(plainPath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * SessionStore manages persisted match sessions in userData/sessions/<id>/.
 * Provides listing with summary fields, lazy series loading, deletion, and retention.
 */
export class SessionStore {
  private readonly sessionsDir: string;
  private readonly maxSessions: number;

  constructor(options: SessionStoreOptions = {}) {
    if (options.sessionsDir) {
      this.sessionsDir = options.sessionsDir;
    } else {
      try {
        this.sessionsDir = path.join(app.getPath('userData'), 'sessions');
      } catch {
        this.sessionsDir = path.join(process.cwd(), 'userData', 'sessions');
      }
    }
    this.maxSessions = options.maxSessions ?? 200;
  }

  private inMemoryDemo: SessionDetail | null = null;

  public setInMemoryDemo(detail: SessionDetail | null): void {
    this.inMemoryDemo = detail;
  }

  public getInMemoryDemo(): SessionDetail | null {
    return this.inMemoryDemo;
  }

  public getSessionsDir(): string {
    return this.sessionsDir;
  }

  private isSafeSessionId(sessionId: string): boolean {
    if (!sessionId || typeof sessionId !== 'string') return false;
    if (sessionId.includes('..') || sessionId.includes('/') || sessionId.includes('\\')) {
      return false;
    }
    const resolved = path.resolve(this.sessionsDir, sessionId);
    const rel = path.relative(this.sessionsDir, resolved);
    return !rel.startsWith('..') && !path.isAbsolute(rel) && rel.length > 0;
  }

  /**
   * Lists all sessions, sorted newest first, with summary fields from meta.json and report.json.
   */
  public list(): SessionSummary[] {
    const summaries: SessionSummary[] = [];

    if (this.inMemoryDemo) {
      const demoMeta = this.inMemoryDemo.meta;
      const playerTeam = demoMeta.teams.find((t) => t.isMe) ?? demoMeta.teams[0];
      summaries.push({
        sessionId: demoMeta.sessionId,
        startedAt: demoMeta.startedAt,
        durationSec: demoMeta.durationSec,
        mapScriptName: demoMeta.mapScriptName,
        mode: demoMeta.mode,
        factionId: playerTeam?.factionId ?? null,
        playerName: playerTeam?.playerName ?? 'Player',
        planId: demoMeta.planId,
        source: 'fixture',
        grade: this.inMemoryDemo.report?.grade ?? null,
        adherence: this.inMemoryDemo.report?.adherence ?? null,
        hasReport: this.inMemoryDemo.report !== null
      });
    }

    if (!fs.existsSync(this.sessionsDir)) {
      return summaries;
    }

    const entries = fs.readdirSync(this.sessionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sessionDir = path.join(this.sessionsDir, entry.name);
      const metaPath = path.join(sessionDir, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;

      try {
        const metaContent = fs.readFileSync(metaPath, 'utf8');
        const parsedMeta = JSON.parse(metaContent);
        const metaResult = SessionMetaSchema.safeParse(parsedMeta);
        if (!metaResult.success) {
          console.warn(`Invalid meta.json for session ${entry.name}:`, metaResult.error.message);
          continue;
        }

        const meta: SessionMeta = metaResult.data;
        let report: SessionReport | null = null;
        const reportPath = path.join(sessionDir, 'report.json');
        if (fs.existsSync(reportPath)) {
          try {
            const reportContent = fs.readFileSync(reportPath, 'utf8');
            const parsedReport = JSON.parse(reportContent);
            const reportResult = SessionReportSchema.safeParse(parsedReport);
            if (reportResult.success) {
              report = reportResult.data;
            }
          } catch {
            // Ignore corrupted report
          }
        }

        const playerTeam = meta.teams.find((t) => t.isMe) ?? meta.teams[0];

        summaries.push({
          sessionId: meta.sessionId,
          startedAt: meta.startedAt,
          durationSec: meta.durationSec,
          mapScriptName: meta.mapScriptName,
          mode: meta.mode,
          factionId: playerTeam?.factionId ?? null,
          playerName: playerTeam?.playerName ?? 'Player',
          planId: meta.planId,
          source: meta.source,
          grade: report?.grade ?? null,
          adherence: report?.adherence ?? null,
          hasReport: report !== null
        });
      } catch (err) {
        console.warn(`Failed reading session ${entry.name}:`, err);
      }
    }

    // Sort newest first by startedAt (falling back to sessionId)
    summaries.sort((a, b) => {
      const timeA = new Date(a.startedAt).getTime();
      const timeB = new Date(b.startedAt).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
      return b.sessionId.localeCompare(a.sessionId);
    });

    return summaries;
  }

  /**
   * Retrieves a session by ID with meta, report, and optional lazy-loaded series data.
   */
  public get(
    sessionId: string,
    options: { includeSeries?: boolean | 'events' } = {}
  ): SessionDetail | null {
    if (this.inMemoryDemo && this.inMemoryDemo.meta.sessionId === sessionId) {
      return this.inMemoryDemo;
    }

    if (!this.isSafeSessionId(sessionId)) {
      return null;
    }

    const sessionDir = path.join(this.sessionsDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      return null;
    }

    const metaPath = path.join(sessionDir, 'meta.json');
    if (!fs.existsSync(metaPath)) {
      return null;
    }

    let meta: SessionMeta;
    try {
      const metaContent = fs.readFileSync(metaPath, 'utf8');
      const parsedMeta = JSON.parse(metaContent);
      const metaResult = SessionMetaSchema.safeParse(parsedMeta);
      if (!metaResult.success) {
        return null;
      }
      meta = metaResult.data;
    } catch {
      return null;
    }

    let report: SessionReport | null = null;
    const reportPath = path.join(sessionDir, 'report.json');
    if (fs.existsSync(reportPath)) {
      try {
        const reportContent = fs.readFileSync(reportPath, 'utf8');
        const parsedReport = JSON.parse(reportContent);
        const reportResult = SessionReportSchema.safeParse(parsedReport);
        if (reportResult.success) {
          report = reportResult.data;
        }
      } catch {
        // Report unavailable or invalid
      }
    }

    const hasState =
      fs.existsSync(path.join(sessionDir, 'state.ndjson')) ||
      fs.existsSync(path.join(sessionDir, 'state.ndjson.gz'));
    const hasEvents = fs.existsSync(path.join(sessionDir, 'events.ndjson'));

    const detail: SessionDetail = {
      meta,
      report,
      hasState,
      hasEvents
    };

    if (options.includeSeries) {
      const states: Array<Record<string, unknown>> = [];
      const events: Array<Record<string, unknown>> = [];

      // 'events' skips the (much larger) state series, e.g. for replay capture
      const stateLines = options.includeSeries === 'events' ? [] : readStateLines(sessionDir);
      for (const line of stateLines) {
        try {
          states.push(JSON.parse(line));
        } catch {
          // Skip malformed line
        }
      }

      const eventLines = readEventsLines(sessionDir);
      for (const line of eventLines) {
        try {
          events.push(JSON.parse(line));
        } catch {
          // Skip malformed line
        }
      }

      detail.series = { states, events };
    }

    return detail;
  }

  /**
   * Returns recent session reports (newest first).
   */
  public getRecentReports(limit: number = 10): SessionReport[] {
    const summaries = this.list();
    const reports: SessionReport[] = [];
    for (const summary of summaries) {
      if (!summary.hasReport) continue;
      const detail = this.get(summary.sessionId);
      if (detail?.report) {
        reports.push(detail.report);
        if (reports.length >= limit) break;
      }
    }
    return reports;
  }

  /**
   * Saves or updates a session report atomically.
   */
  public saveReport(sessionId: string, report: SessionReport): boolean {
    if (!this.isSafeSessionId(sessionId)) {
      return false;
    }

    const validated = SessionReportSchema.safeParse(report);
    if (!validated.success) {
      return false;
    }

    const sessionDir = path.join(this.sessionsDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      return false;
    }

    const reportPath = path.join(sessionDir, 'report.json');
    const tmpPath = path.join(sessionDir, 'report.json.tmp');

    try {
      fs.writeFileSync(tmpPath, JSON.stringify(validated.data, null, 2), 'utf8');
      fs.renameSync(tmpPath, reportPath);
      return true;
    } catch {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // Ignored
      }
      return false;
    }
  }

  /**
   * Deletes a session directory and all its contents.
   */
  public delete(sessionId: string): boolean {
    if (this.inMemoryDemo && this.inMemoryDemo.meta.sessionId === sessionId) {
      this.inMemoryDemo = null;
      return true;
    }

    if (!this.isSafeSessionId(sessionId)) {
      return false;
    }

    const sessionDir = path.join(this.sessionsDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      return false;
    }

    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      return true;
    } catch (err) {
      console.warn(`Failed to delete session directory ${sessionDir}:`, err);
      return false;
    }
  }

  /**
   * Enforces retention policy, keeping the newest maxSessions.
   * Returns the count of deleted sessions.
   */
  public applyRetention(maxSessions?: number): number {
    const limit = maxSessions ?? this.maxSessions;
    const summaries = this.list();

    if (summaries.length <= limit) {
      return 0;
    }

    const toDelete = summaries.slice(limit);
    let deletedCount = 0;

    for (const session of toDelete) {
      if (this.delete(session.sessionId)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

export const defaultSessionStore = new SessionStore();
