export interface ManualClockOptions {
  onTick?: (clock: number) => void;
  tickIntervalMs?: number; // default 1000 ms (1 s)
}

/**
 * ManualClock manages the 1 s manual clock ticking, pause, resume, and reset.
 */
export class ManualClock {
  private clock = 0;
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private onTick?: (clock: number) => void;
  private tickIntervalMs: number;

  constructor(options?: ManualClockOptions) {
    this.onTick = options?.onTick;
    this.tickIntervalMs = options?.tickIntervalMs ?? 1000;
  }

  public getClock(): number {
    return this.clock;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      this.clock += 1;
      this.onTick?.(this.clock);
    }, this.tickIntervalMs);
  }

  public pause(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public toggle(): boolean {
    if (this.running) {
      this.pause();
    } else {
      this.start();
    }
    return this.running;
  }

  public reset(): void {
    this.pause();
    this.clock = 0;
    this.onTick?.(0);
  }

  public setClock(seconds: number): void {
    this.clock = Math.max(0, seconds);
    this.onTick?.(this.clock);
  }

  public step(seconds = 1): void {
    this.clock += seconds;
    this.onTick?.(this.clock);
  }
}
