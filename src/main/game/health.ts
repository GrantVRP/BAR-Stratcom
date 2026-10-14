import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import type { HealthState } from '../../shared/ipc';
import type { WidgetHeartbeat } from '../../core/schemas/protocol';

export interface HealthDeriveInputs {
  hasDataDir: boolean;
  widgetInstalled: boolean;
  installedVersion: string | null;
  bundledVersion: string;
  lastHeartbeat: WidgetHeartbeat | null;
  lastHeartbeatTime: number | null; // epoch ms when last heartbeat was received
  widgetsDisabled?: boolean;
  protocolMismatch?: boolean;
  spectatorTeamsCount?: number;
}

/**
 * Compares two semver strings: returns true if installed is older than bundled.
 */
export function isVersionOutdated(installed: string | null, bundled: string): boolean {
  if (!installed) return false;
  if (installed === bundled) return false;

  const parse = (v: string): number[] =>
    v
      .split(/[-+.]/)
      .map((part) => parseInt(part, 10))
      .filter((n) => !isNaN(n));

  const instParts = parse(installed);
  const bundParts = parse(bundled);
  const len = Math.max(instParts.length, bundParts.length);

  for (let i = 0; i < len; i++) {
    const a = instParts[i] ?? 0;
    const b = bundParts[i] ?? 0;
    if (a < b) return true;
    if (a > b) return false;
  }
  return false;
}

/**
 * Inspects infolog text lines for "LuaUI: Disallowing User Widgets".
 */
export function checkInfologForWidgetsDisabled(content: string, maxLines = 400): boolean {
  const lines = content.split(/\r?\n/);
  const tail = lines.slice(-maxLines);
  return tail.some((line) => line.includes('LuaUI: Disallowing User Widgets'));
}

/**
 * Reads up to maxLines from the end of an infolog.txt file.
 */
export function readInfologTail(filePath: string, maxLines = 400): string {
  try {
    if (!fs.existsSync(filePath)) return '';
    const stat = fs.statSync(filePath);
    // Read up to 128KB from the tail
    const bytesToRead = Math.min(stat.size, 128 * 1024);
    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(bytesToRead);
      fs.readSync(fd, buffer, 0, bytesToRead, stat.size - bytesToRead);
      const text = buffer.toString('utf-8');
      const lines = text.split(/\r?\n/);
      return lines.slice(-maxLines).join('\n');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return '';
  }
}

/**
 * Pure function deriving health status and message from inputs.
 */
export function deriveHealth(inputs: HealthDeriveInputs, now: number): HealthState {
  if (!inputs.hasDataDir) {
    return {
      status: 'no-bar',
      message: 'Beyond All Reason not found. Set the folder in Settings or try Demo.',
      lastHeartbeat: inputs.lastHeartbeatTime
    };
  }

  if (!inputs.widgetInstalled) {
    return {
      status: 'widget-missing',
      message: 'Install the in-game widget.',
      lastHeartbeat: inputs.lastHeartbeatTime
    };
  }

  if (isVersionOutdated(inputs.installedVersion, inputs.bundledVersion)) {
    return {
      status: 'widget-outdated',
      message: 'Update the widget.',
      lastHeartbeat: inputs.lastHeartbeatTime
    };
  }

  if (inputs.protocolMismatch) {
    return {
      status: 'protocol-mismatch',
      message: 'Widget/app version mismatch. Reinstall the widget.',
      lastHeartbeat: inputs.lastHeartbeatTime
    };
  }

  if (inputs.widgetsDisabled) {
    return {
      status: 'widgets-disabled',
      message: 'This lobby disabled user widgets. Use Manual Clock.',
      lastHeartbeat: inputs.lastHeartbeatTime
    };
  }

  const { lastHeartbeat, lastHeartbeatTime } = inputs;

  if (!lastHeartbeat || lastHeartbeatTime === null) {
    return {
      status: 'bar-idle',
      message: 'Start BAR. The coach connects automatically.',
      lastHeartbeat: null
    };
  }

  const elapsedSec = (now - lastHeartbeatTime) / 1000;

  // Stalled: during game, no heartbeat for > 5 s
  if (lastHeartbeat.gameStarted && !lastHeartbeat.gameOver && elapsedSec > 5) {
    return {
      status: 'widget-stalled',
      message: "Widget stopped responding (check BAR's widget list, F11).",
      lastHeartbeat: lastHeartbeatTime
    };
  }

  // Idle: outside game, no heartbeat for > 10 s
  if (elapsedSec > 10) {
    return {
      status: 'bar-idle',
      message: 'Start BAR. The coach connects automatically.',
      lastHeartbeat: lastHeartbeatTime
    };
  }

  // Active heartbeat
  if (!lastHeartbeat.gameStarted || lastHeartbeat.mode === 'pregame') {
    return {
      status: 'pregame',
      message: 'In lobby/loading…',
      lastHeartbeat: lastHeartbeatTime
    };
  }

  if (lastHeartbeat.mode === 'player') {
    return {
      status: 'live',
      message: 'Live',
      lastHeartbeat: lastHeartbeatTime
    };
  }

  const count = inputs.spectatorTeamsCount ?? 0;
  const teamText = count > 0 ? `${count} teams` : 'teams';

  if (lastHeartbeat.mode === 'spectator') {
    return {
      status: 'spectating',
      message: `Recording ${teamText} for capture`,
      lastHeartbeat: lastHeartbeatTime
    };
  }

  if (lastHeartbeat.mode === 'replay') {
    return {
      status: 'replay',
      message: `Recording ${teamText} for capture`,
      lastHeartbeat: lastHeartbeatTime
    };
  }

  return {
    status: 'bar-idle',
    message: 'Start BAR. The coach connects automatically.',
    lastHeartbeat: lastHeartbeatTime
  };
}

export type HealthChangeListener = (health: HealthState) => void;

export class HealthManager extends EventEmitter {
  private currentHealth: HealthState;
  private timer: NodeJS.Timeout | null = null;
  private inputProvider: () => HealthDeriveInputs;
  private nowProvider: () => number;

  constructor(
    inputProvider: () => HealthDeriveInputs,
    nowProvider: () => number = Date.now
  ) {
    super();
    this.inputProvider = inputProvider;
    this.nowProvider = nowProvider;
    this.currentHealth = deriveHealth(this.inputProvider(), this.nowProvider());
  }

  start(intervalMs = 1000): void {
    if (this.timer) return;
    this.checkHealth();
    this.timer = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getHealth(): HealthState {
    return this.currentHealth;
  }

  checkHealth(): HealthState {
    const inputs = this.inputProvider();
    const nextHealth = deriveHealth(inputs, this.nowProvider());

    if (
      nextHealth.status !== this.currentHealth.status ||
      nextHealth.message !== this.currentHealth.message ||
      nextHealth.lastHeartbeat !== this.currentHealth.lastHeartbeat
    ) {
      this.currentHealth = nextHealth;
      this.emit('health', this.currentHealth);
    }

    return this.currentHealth;
  }
}
