import type { Interval } from './types';

/**
 * Tracks contiguous active periods and produces merged interval records.
 */
export class IntervalAccumulator {
  private active = false;
  private start = 0;
  private end = 0;
  readonly list: Interval[] = [];

  record(val: boolean, t: number, dt: number): void {
    if (val) {
      if (!this.active) {
        this.active = true;
        this.start = t;
      }
      this.end = t + dt;
    } else if (this.active) {
      this.active = false;
      this.list.push({ start: this.start, end: this.end });
    }
  }

  finish(): Interval[] {
    if (this.active) {
      this.list.push({ start: this.start, end: this.end });
      this.active = false;
    }
    return this.list;
  }
}
