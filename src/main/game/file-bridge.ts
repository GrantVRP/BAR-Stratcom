import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import {
  SessionFileDocSchema,
  StateDocSchema,
  WidgetEventSchema,
  WidgetHeartbeatSchema,
  type SessionFileDoc,
  type StateDoc,
  type WidgetEvent,
  type WidgetHeartbeat
} from '../../core/schemas/protocol';
import {
  checkInfologForWidgetsDisabled,
  readInfologTail,
  type HealthDeriveInputs
} from './health';
import type { BridgeEventMap, BridgeEventName, BridgeSource } from './source';

export interface FileBridgeOptions {
  dataDir?: string | null;
  pollIntervalMs?: number;
  bundledVersion?: string;
  widgetInstalled?: boolean;
  installedVersion?: string | null;
  nowProvider?: () => number;
}

export class FileBridge extends EventEmitter implements BridgeSource {
  private dataDir: string | null = null;
  private pollIntervalMs: number;
  private nowProvider: () => number;
  private running = false;
  private watchHandle: fs.FSWatcher | null = null;
  private pollTimer: NodeJS.Timeout | null = null;

  // Trackers
  private lastHeartbeat: WidgetHeartbeat | null = null;
  private lastHeartbeatTime: number | null = null;
  private lastStateSeq = -1;
  private lastStateDoc: StateDoc | null = null;

  private eventsOffsets = new Map<string, number>();
  private processedSessions = new Set<string>();
  private sessionDocs = new Map<string, SessionFileDoc>();

  // Infolog & script signal
  private lastScriptMtime: number | null = null;
  private scriptChangeTime: number | null = null;
  private scriptPendingHeartbeat = false;
  private widgetsDisabled = false;
  private protocolMismatch = false;

  private bundledVersion: string;
  private widgetInstalled: boolean;
  private installedVersion: string | null;

  constructor(options: FileBridgeOptions = {}) {
    super();
    this.dataDir = options.dataDir ?? null;
    this.pollIntervalMs = options.pollIntervalMs ?? 250;
    this.nowProvider = options.nowProvider ?? Date.now;
    this.bundledVersion = options.bundledVersion ?? 'unknown';
    this.widgetInstalled = options.widgetInstalled ?? true;
    this.installedVersion = options.installedVersion ?? null;
  }

  setDataDir(dir: string | null): void {
    if (this.dataDir === dir) return;
    this.dataDir = dir;
    if (this.running) {
      this.restartWatcher();
    }
  }

  setWidgetInfo(installed: boolean, installedVersion: string | null, bundledVersion: string): void {
    this.widgetInstalled = installed;
    this.installedVersion = installedVersion;
    this.bundledVersion = bundledVersion;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.restartWatcher();
    this.poll();
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.watchHandle) {
      try {
        this.watchHandle.close();
      } catch {
        // ignore
      }
      this.watchHandle = null;
    }
  }

  override on<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override off<E extends BridgeEventName>(event: E, listener: BridgeEventMap[E]): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }

  private restartWatcher(): void {
    if (this.watchHandle) {
      try {
        this.watchHandle.close();
      } catch {
        // ignore
      }
      this.watchHandle = null;
    }

    if (!this.dataDir) return;
    const stratcomDir = path.join(this.dataDir, 'stratcom');

    try {
      if (fs.existsSync(stratcomDir)) {
        this.watchHandle = fs.watch(stratcomDir, () => {
          this.poll();
        });
      }
    } catch {
      // fs.watch not supported or path error; poll fallback will handle it
    }
  }

  poll(): void {
    if (!this.dataDir) return;
    this.checkHeartbeat();
    this.checkState();
    this.checkEvents();
    this.checkSessions();
    this.checkInfologSignal();
  }

  private checkHeartbeat(): void {
    if (!this.dataDir) return;
    const filePath = path.join(this.dataDir, 'stratcom', 'widget.json');

    try {
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      if (parsed.protocol !== 1) {
        this.protocolMismatch = true;
        return;
      }

      const result = WidgetHeartbeatSchema.safeParse(parsed);
      if (result.success) {
        this.protocolMismatch = false;

        const isNew =
          !this.lastHeartbeat ||
          result.data.frame !== this.lastHeartbeat.frame ||
          result.data.heartbeat !== this.lastHeartbeat.heartbeat ||
          result.data.gameStarted !== this.lastHeartbeat.gameStarted ||
          result.data.mode !== this.lastHeartbeat.mode;

        this.lastHeartbeat = result.data;
        this.lastHeartbeatTime = Date.now();

        if (this.scriptPendingHeartbeat && result.data.gameStarted) {
          this.scriptPendingHeartbeat = false;
          this.widgetsDisabled = false;
        }

        if (isNew) {
          this.emit('heartbeat', result.data);
        }
      }
    } catch {
      // Atomic read rule: ignore partial reads or json parse failures
    }
  }

  private checkState(): void {
    if (!this.dataDir) return;
    const filePath = path.join(this.dataDir, 'stratcom', 'state.json');

    try {
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      const result = StateDocSchema.safeParse(parsed);

      if (result.success) {
        const doc = result.data;
        if (doc.seq > this.lastStateSeq) {
          this.lastStateSeq = doc.seq;
          this.lastStateDoc = doc;
          this.emit('state', doc);
        }
      }
    } catch {
      // Atomic read rule: ignore partial reads or json parse failures
    }
  }

  private checkEvents(): void {
    if (!this.dataDir) return;
    const stratcomDir = path.join(this.dataDir, 'stratcom');

    try {
      if (!fs.existsSync(stratcomDir)) return;
      const files = fs.readdirSync(stratcomDir);
      const eventFiles = files.filter(
        (f) => f.startsWith('events-') && f.endsWith('.ndjson')
      );

      for (const fileName of eventFiles) {
        this.tailEventsFile(path.join(stratcomDir, fileName));
      }
    } catch {
      // ignore directory read errors
    }
  }

  private tailEventsFile(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) return;
      const stat = fs.statSync(filePath);
      const currentOffset = this.eventsOffsets.get(filePath) ?? 0;

      if (stat.size <= currentOffset) return;

      const fd = fs.openSync(filePath, 'r');
      try {
        const bytesToRead = stat.size - currentOffset;
        const buffer = Buffer.alloc(bytesToRead);
        fs.readSync(fd, buffer, 0, bytesToRead, currentOffset);

        // Find last newline to only process complete lines
        const lastNewline = buffer.lastIndexOf(0x0a);
        if (lastNewline === -1) {
          // No complete line yet, wait for next tick
          return;
        }

        const completeChunk = buffer.subarray(0, lastNewline + 1);
        this.eventsOffsets.set(filePath, currentOffset + lastNewline + 1);

        const text = completeChunk.toString('utf-8');
        const lines = text.split(/\r?\n/);
        const batch: WidgetEvent[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            const result = WidgetEventSchema.safeParse(parsed);
            if (result.success) {
              batch.push(result.data);
            }
          } catch {
            // Drop invalid line with debug
          }
        }

        if (batch.length > 0) {
          this.emit('events', batch);
        }
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      // ignore read errors
    }
  }

  private checkSessions(): void {
    if (!this.dataDir) return;
    const stratcomDir = path.join(this.dataDir, 'stratcom');

    try {
      if (!fs.existsSync(stratcomDir)) return;
      const files = fs.readdirSync(stratcomDir);
      const sessionFiles = files.filter(
        (f) => f.startsWith('session-') && f.endsWith('.json')
      );

      for (const file of sessionFiles) {
        if (this.processedSessions.has(file)) continue;

        const fullPath = path.join(stratcomDir, file);
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const parsed = JSON.parse(content);
          const result = SessionFileDocSchema.safeParse(parsed);
          if (result.success) {
            this.processedSessions.add(file);
            this.sessionDocs.set(result.data.sessionId, result.data);
            this.emit('session', result.data);
          }
        } catch {
          // mid-write retry next poll
        }
      }
    } catch {
      // ignore
    }
  }

  private checkInfologSignal(): void {
    if (!this.dataDir) return;
    const scriptPath = path.join(this.dataDir, '_script.txt');
    const now = this.nowProvider();

    try {
      if (fs.existsSync(scriptPath)) {
        const mtime = fs.statSync(scriptPath).mtimeMs;
        if (this.lastScriptMtime === null) {
          this.lastScriptMtime = mtime;
        } else if (mtime !== this.lastScriptMtime) {
          this.lastScriptMtime = mtime;
          this.scriptChangeTime = now;
          this.scriptPendingHeartbeat = true;
          this.widgetsDisabled = false;
        }
      }
    } catch {
      // ignore
    }

    if (this.scriptPendingHeartbeat && this.scriptChangeTime !== null) {
      if (now - this.scriptChangeTime > 20_000) {
        this.scriptPendingHeartbeat = false;
        const infologPath = path.join(this.dataDir, 'infolog.txt');
        const tail = readInfologTail(infologPath, 400);
        if (checkInfologForWidgetsDisabled(tail)) {
          this.widgetsDisabled = true;
        }
      }
    }
  }

  getSession(sessionId: string): SessionFileDoc | null {
    return this.sessionDocs.get(sessionId) ?? null;
  }

  getHealthInputs(): HealthDeriveInputs {
    const teamsCount = this.lastStateDoc?.teams?.length;
    return {
      hasDataDir: this.dataDir !== null && fs.existsSync(this.dataDir),
      widgetInstalled: this.widgetInstalled,
      installedVersion: this.installedVersion,
      bundledVersion: this.bundledVersion,
      lastHeartbeat: this.lastHeartbeat,
      lastHeartbeatTime: this.lastHeartbeatTime,
      widgetsDisabled: this.widgetsDisabled,
      protocolMismatch: this.protocolMismatch,
      spectatorTeamsCount: teamsCount
    };
  }
}
