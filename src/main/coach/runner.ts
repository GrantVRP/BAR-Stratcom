import * as fs from 'fs';
import * as path from 'path';
import type { BuildPlan } from '../../core/schemas/plans';
import type { SimInput, SimResult } from '../../core/sim/types';
import { FALLBACK_MEX_YIELD } from '../../core/plans/constants';
import type { LiveSnapshot } from '../../core/schemas/live';
import type { CoachDoc, SessionFileDoc } from '../../core/schemas/protocol';
import type { CoachState, Cue } from '../../core/schemas/coach';
import type { Registry } from '../../core/registry';
import type { BenchmarkFile } from '../../core/schemas/benchmark';
import type { AssistSettings } from '../../core/schemas/settings';
import { validatePlan } from '../../core/plans/validate';
import { simulate } from '../../core/sim/simulate';
import {
  evaluate,
  type FinishedLedger,
  type CoachMemory,
  type ProfileConfig,
  createFinishedLedger,
  createInitialCoachMemory,
  DEFAULT_PROFILES,
  applyEventsToLedger,
  ASSIST_OFF
} from '../../core/coach';
import type { BridgeSource } from '../game/source';
import { broadcast } from '../ipc/register';
import { ManualClock } from './manual-clock';
import { TickStats, noTelemetrySnapshot, type TickSummary } from './tick-support';

export interface CoachRunnerMapOptions {
  windAvg?: number | null;
  windMin?: number;
  windMax?: number;
  tidalStrength?: number;
  mexYield?: number;
  mexYieldProvenance?: 'measured' | 'estimated';
}

export interface CoachRunnerStartOptions {
  plan: BuildPlan;
  mode: 'live' | 'manual' | 'demo';
  source?: BridgeSource;
  registry: Registry;
  stratcomDir?: string | null;
  profile?: ProfileConfig;
  benchmark?: BenchmarkFile | null;
  /** Finds the pro benchmark for a session's teams (T08.4); used when no fixed `benchmark` is given. */
  benchmarkLoader?: (teams: SessionFileDoc['teams']) => BenchmarkFile | null;
  map?: CoachRunnerMapOptions;
  start?: {
    metal: number;
    energy: number;
    metalStorage: number;
    energyStorage: number;
  };
  /** The map a session is played on, as simulator input (used when `map` is not given; T11.1). */
  resolveMap?: (scriptName: string) => SimInput['map'];
  /** Settings → Assist, read every tick so a toggle applies at once (T09.2). */
  assistSettings?: () => AssistSettings;
  onUpdate?: (state: CoachState) => void;
  onCue?: (cue: Cue) => void;
}

/**
 * CoachRunner manages the 2 Hz evaluation loop, plan simulation,
 * HUD model atomic file writing, and IPC updates (02 §4.1, 04 §3.1).
 */
export class CoachRunner {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private seq = 1;
  private plan: BuildPlan | null = null;
  private planSim: SimResult | null = null;
  private mode: 'live' | 'manual' | 'demo' = 'live';
  private source: BridgeSource | null = null;
  private registry: Registry | null = null;
  private stratcomDir: string | null = null;
  private profile: ProfileConfig = DEFAULT_PROFILES.intermediate;
  private benchmark: BenchmarkFile | null = null;
  private benchmarkLoader?: CoachRunnerStartOptions['benchmarkLoader'];
  private memory: CoachMemory = createInitialCoachMemory();
  private finishedLedger: FinishedLedger = createFinishedLedger();
  private latestState: LiveSnapshot | null = null;
  private history: LiveSnapshot[] = [];
  private currentSessionId: string | null = null;
  private onUpdate?: (state: CoachState) => void;
  private onCue?: (cue: Cue) => void;
  private assistSettings?: () => AssistSettings;
  private readonly tickStats = new TickStats();
  private resolveMap?: (scriptName: string) => SimInput['map'];
  private simStart?: CoachRunnerStartOptions['start'];

  private stateHandler?: (state: LiveSnapshot) => void;
  private eventsHandler?: (events: unknown[]) => void;
  private sessionHandler?: (session: SessionFileDoc) => void;
  private heartbeatHandler?: (hb: { sessionId: string | null }) => void;

  private manualClock: ManualClock = new ManualClock({
    onTick: () => {
      void this.tick();
    }
  });
  private manualDoneStepIds = new Set<string>();

  public getManualClock(): ManualClock {
    return this.manualClock;
  }

  public markStepDone(stepId: string): void {
    this.manualDoneStepIds.add(stepId);
    if (this.running) {
      void this.tick();
    }
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getMode(): 'live' | 'manual' | 'demo' {
    return this.mode;
  }

  public getSeq(): number {
    return this.seq;
  }

  public async start(options: CoachRunnerStartOptions): Promise<void> {
    if (this.running) {
      await this.stop();
    }

    // 1. Validate plan (must have no errors)
    const { errors } = validatePlan(options.plan, options.registry);
    if (errors.length > 0) {
      throw new Error(`Plan validation failed: ${errors.map((e) => e.message).join('; ')}`);
    }

    // 2. Simulate the plan; an unknown map is simulated without wind (flagged), never with a made-up
    // "typical" wind, and re-simulated once the session names the map (resolveMap)
    const mapInput = {
      windAvg: options.map?.windAvg ?? null,
      windMin: options.map?.windMin ?? 0,
      windMax: options.map?.windMax ?? 0,
      tidalStrength: options.map?.tidalStrength ?? 0,
      mexYield: options.map?.mexYield ?? FALLBACK_MEX_YIELD,
      mexYieldProvenance: options.map?.mexYieldProvenance ?? ('estimated' as const)
    };
    this.simStart = options.start;
    this.resolveMap = options.map ? undefined : options.resolveMap;
    this.planSim = this.simulatePlan(options.plan, options.registry, mapInput);

    this.plan = options.plan;
    this.mode = options.mode;
    this.registry = options.registry;
    this.stratcomDir = options.stratcomDir ?? null;
    this.profile = options.profile ?? DEFAULT_PROFILES.intermediate;
    this.benchmark = options.benchmark ?? null;
    this.benchmarkLoader = options.benchmark ? undefined : options.benchmarkLoader;
    this.onUpdate = options.onUpdate;
    this.onCue = options.onCue;
    this.assistSettings = options.assistSettings;

    this.running = true;
    this.seq = 1;
    this.memory = createInitialCoachMemory();
    this.finishedLedger = createFinishedLedger();
    this.latestState = null;
    this.history = [];
    this.currentSessionId = null;
    this.manualDoneStepIds.clear();

    if (this.mode === 'manual') {
      this.manualClock.reset();
    }

    // 3. Attach listeners to bridge source
    if (options.source) {
      this.source = options.source;

      this.stateHandler = (state) => {
        this.latestState = state;
        this.history.push(state);
        // Retain last 60s of history
        const cutoff = state.gameSeconds - 60;
        while (this.history.length > 0 && this.history[0]!.gameSeconds < cutoff) {
          this.history.shift();
        }
        if (this.mode === 'demo') {
          void this.tick();
        }
      };

      this.eventsHandler = (events) => {
        const teamId = this.latestState?.me?.teamId;
        this.finishedLedger = applyEventsToLedger(
          this.finishedLedger,
          events as Parameters<typeof applyEventsToLedger>[1],
          teamId
        );
      };

      this.sessionHandler = (session) => {
        this.currentSessionId = session.sessionId;
        this.useSessionBenchmark(session);
      };

      this.heartbeatHandler = (hb) => {
        if (!this.currentSessionId && hb.sessionId) {
          this.currentSessionId = hb.sessionId;
          const session = this.source?.getSession?.(hb.sessionId);
          if (session) this.useSessionBenchmark(session);
        }
      };

      this.source.on('state', this.stateHandler);
      this.source.on('events', this.eventsHandler);
      this.source.on('session', this.sessionHandler);
      this.source.on('heartbeat', this.heartbeatHandler);
    }

    // 4. Start 2 Hz evaluation timer in live mode
    if (this.mode === 'live') {
      this.timer = setInterval(() => {
        void this.tick();
      }, 500);

      // Initial immediate tick
      await this.tick();
    } else if (this.mode === 'manual') {
      // In manual mode, tick at clock = 0 initially
      await this.tick();
    }
  }

  /** BENCHMARK_LOW compares with pros of the player's faction + mode (04 §7). */
  private useSessionBenchmark(session: SessionFileDoc): void {
    if (this.benchmarkLoader) this.benchmark = this.benchmarkLoader(session.teams);
    // the session names the map: simulate the plan on it (real wind from BAR's table)
    if (this.resolveMap && this.plan && this.registry) {
      this.planSim = this.simulatePlan(this.plan, this.registry, this.resolveMap(session.map.scriptName));
      this.resolveMap = undefined;
    }
  }

  private simulatePlan(plan: BuildPlan, registry: Registry, map: SimInput['map']): SimResult {
    return simulate({ plan, registry, map, start: this.simStart, options: { schedule: 'respect-targets' } });
  }

  public async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.mode === 'manual') {
      this.manualClock.pause();
    }

    if (this.source) {
      if (this.stateHandler) this.source.off('state', this.stateHandler);
      if (this.eventsHandler) this.source.off('events', this.eventsHandler);
      if (this.sessionHandler) this.source.off('session', this.sessionHandler);
      if (this.heartbeatHandler) this.source.off('heartbeat', this.heartbeatHandler);
      this.source = null;
    }

    // In live mode, write off state to coach.json atomically
    if (this.mode === 'live' && this.stratcomDir) {
      try {
        await this.writeOffFile();
      } catch {
        // Ignore file write errors during stop
      }
    }

    this.running = false;
  }

  public async tick(): Promise<void> {
    if (!this.running || !this.plan || !this.planSim || !this.registry) {
      return;
    }

    const tickStart = performance.now();
    const now: LiveSnapshot =
      this.mode === 'manual'
        ? noTelemetrySnapshot(this.manualClock.getClock())
        : (this.latestState ?? noTelemetrySnapshot(0));

    const evalResult = evaluate({
      plan: this.plan,
      planSim: this.planSim,
      registry: this.registry,
      now,
      history: this.history,
      finished: this.finishedLedger,
      benchmark: this.benchmark,
      profile: this.profile,
      memory: this.memory,
      mode: this.mode,
      chatEchoEnabled: true,
      manualDoneStepIds: this.manualDoneStepIds,
      assistSettings: this.assistSettings?.()
    });

    this.memory = evalResult.memory;

    // Emit updates
    this.onUpdate?.(evalResult.state);
    broadcast('coach:update', evalResult.state);

    for (const cue of evalResult.cues) {
      this.onCue?.(cue);
      broadcast('coach:cue', cue);
    }

    // In live mode only: write coach.json atomically
    if (this.mode === 'live' && this.stratcomDir) {
      const doc: CoachDoc = {
        protocol: 1,
        seq: this.seq++,
        sessionId: this.currentSessionId,
        mode: 'live',
        generatedAtSec: Math.floor(Date.now() / 1000),
        hud: evalResult.display.hud,
        echo: evalResult.display.echo,
        assist: evalResult.display.assist
      };

      try {
        await this.writeDocAtomic(doc);
      } catch {
        // Ignore periodic write failures; next tick retries
      }
    }
    this.tickStats.record(performance.now() - tickStart);
  }

  /** Tick duration (evaluate + write) over the last ticks: the 08 §5 budget is p95 ≤ 10 ms (T11.3). */
  public getTickStats(): TickSummary {
    return this.tickStats.summary();
  }

  private async writeDocAtomic(doc: CoachDoc): Promise<void> {
    if (!this.stratcomDir) return;
    const targetFile = path.join(this.stratcomDir, 'coach.json');
    const tmpFile = path.join(this.stratcomDir, 'coach.json.tmp');
    await fs.promises.writeFile(tmpFile, JSON.stringify(doc, null, 2), 'utf8');
    await fs.promises.rename(tmpFile, targetFile);
  }

  private async writeOffFile(): Promise<void> {
    if (!this.stratcomDir) return;
    const offDoc: CoachDoc = {
      protocol: 1,
      seq: this.seq++,
      sessionId: this.currentSessionId,
      mode: 'off',
      generatedAtSec: Math.floor(Date.now() / 1000),
      hud: { visible: false, title: 'OFF', lines: [], progress: null },
      echo: [],
      assist: ASSIST_OFF
    };
    await this.writeDocAtomic(offDoc);
  }
}

export const defaultCoachRunner = new CoachRunner();
