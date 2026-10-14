import fs from 'node:fs';
import path from 'node:path';
import type { Registry } from '../../core/registry';
import type { CoachState } from '../../core/schemas/coach';
import type { LiveSnapshot } from '../../core/schemas/live';
import type { CoachDoc, SessionFileDoc } from '../../core/schemas/protocol';
import type { HudSettings } from '../../core/schemas/settings';
import type { Profile } from '../../core/schemas/common';
import { ASSIST_OFF } from '../../core/coach/assist';
import { trackEnemySightings } from '../../core/coach/hud-boxes';
import { applyHudSettings, buildRadarModeHud } from '../../core/coach/hud-settings';
import type { BridgeSource } from '../game/source';
import { broadcast } from '../ipc/register';
import { nextCoachSeq } from './coach-seq';

export interface RadarRunnerStartOptions {
  source: BridgeSource;
  registry: Registry;
  /** \`<BAR data>/stratcom\`; null when the game folder is unknown (nothing is written). */
  stratcomDir: string | null;
  profile: Profile;
  /** Settings → hud, read every tick (Widget HUD Display off hides it). */
  hudSettings?: () => HudSettings;
}

/**
 * Radar mode: coaching without a plan. Twice a second it writes a coach.json
 * whose HUD is only the radar box (the widget draws the scope from the game; the app lists the enemy
 * contacts from state.json) and sends the Coach view a plan-less state with the sightings.
 */
export class RadarRunner {
  private running = false;
  private source: BridgeSource | null = null;
  private registry: Registry | null = null;
  private stratcomDir: string | null = null;
  private profile: Profile = 'intermediate';
  private hudSettings?: () => HudSettings;
  private latest: LiveSnapshot | null = null;
  private sessionId: string | null = null;
  private seenAt: Record<string, number> = {};
  private timer: NodeJS.Timeout | null = null;

  private readonly onState = (state: LiveSnapshot): void => {
    this.latest = state;
  };

  private readonly onSession = (session: SessionFileDoc): void => {
    this.sessionId = session.sessionId;
  };

  public isRunning(): boolean {
    return this.running;
  }

  public start(options: RadarRunnerStartOptions): void {
    void this.stop();
    this.running = true;
    this.source = options.source;
    this.registry = options.registry;
    this.stratcomDir = options.stratcomDir;
    this.profile = options.profile;
    this.hudSettings = options.hudSettings;
    this.latest = null;
    this.sessionId = null;
    this.seenAt = {};
    this.source.on('state', this.onState);
    this.source.on('session', this.onSession);
    this.timer = setInterval(() => void this.tick(), 500);
  }

  /** Stops and writes the off doc (resolves once it is written). */
  public async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.source?.off('state', this.onState);
    this.source?.off('session', this.onSession);
    this.source = null;
    await this.write(this.doc('off')).catch(() => undefined);
  }

  /** One update: sightings, the Coach view's state, coach.json. */
  public async tick(): Promise<void> {
    if (!this.running || !this.registry) return;
    const clock = this.latest?.gameSeconds ?? 0;
    const enemies = this.latest?.enemies ?? {};
    this.seenAt = trackEnemySightings(this.seenAt, enemies, clock);

    const state: CoachState = {
      mode: 'radar',
      clock,
      planId: '',
      steps: [],
      currentStepIndex: 0,
      aheadBehindSec: null,
      alerts: [],
      projections: { energyEmptyInSec: null, metalEmptyInSec: null, metalFullInSec: null, energyFullInSec: null },
      profile: this.profile,
      enemySeenAt: this.seenAt
    };
    broadcast('coach:update', state);

    try {
      await this.write(this.doc('live', applyHudSettings(buildRadarModeHud(enemies, this.seenAt, this.registry, clock), this.hudSettings?.())));
    } catch {
      // a failed write is retried on the next tick
    }
  }

  private doc(mode: 'live' | 'off', hud?: CoachDoc['hud']): CoachDoc {
    return {
      protocol: 1,
      seq: nextCoachSeq(),
      sessionId: this.sessionId,
      mode,
      generatedAtSec: Math.floor(Date.now() / 1000),
      hud: hud ?? { visible: false, title: 'OFF', lines: [], progress: null },
      echo: [],
      assist: ASSIST_OFF
    };
  }

  private async write(doc: CoachDoc): Promise<void> {
    if (!this.stratcomDir) return;
    const target = path.join(this.stratcomDir, 'coach.json');
    const tmp = path.join(this.stratcomDir, 'coach.json.tmp');
    await fs.promises.writeFile(tmp, JSON.stringify(doc, null, 2), 'utf8');
    await fs.promises.rename(tmp, target);
  }
}

export const defaultRadarRunner = new RadarRunner();
