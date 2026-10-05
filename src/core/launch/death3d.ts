/**
 * Unit deaths on the launch scene, from BAR's unit scripts and definitions (extracted by
 * tools/build-launch-3d.ts): the Sprinter's keyframed DeathAnim() and both units' Killed() pieces,
 * the death explosion (CEG) and the wreck. Pure: no DOM, no WebGL.
 */
import type { PieceChannels } from './scene3d';

export interface ExplodeEvent {
  piece: string;
  /** Spring explode flags, e.g. FALL, SMOKE, FIRE, EXPLODE_ON_HIT, BITMAPONLY */
  flags: string[];
}

/** One block of a baked death animation: targets reached over `ms`, events at its start. */
export interface DeathKeyframe {
  ms: number;
  turn: PieceChannels;
  move: PieceChannels;
  explode: ExplodeEvent[];
  hide: string[];
}

export interface UnitDeath {
  /** Keyframed DeathAnim(), or null when the unit dies at once. */
  anim: DeathKeyframe[] | null;
  /** Pieces Killed() explodes at the moment of death (after the animation). */
  explodes: ExplodeEvent[];
  /** Wreck model asset name, or null for no wreck. */
  corpse: string | null;
  /** Wreck texture asset name. */
  corpseTexture: string | null;
  /** Death explosion effect (FxLibrary name). */
  fx: string;
}

export interface Pose {
  turn: PieceChannels;
  move: PieceChannels;
}

/** Wait after the death (explosion) before the next unit runs in, per the owner's request. */
export const RESPAWN_DELAY_MS = 3000;
/** Greenest Fields mapinfo gravity 120 → Spring elmos per frame² (gravity / 30²). */
export const MAP_GRAVITY = 120 / 900;
export const FRAME_MS = 1000 / 30;

/**
 * Drops the blocks at the start of a death animation that change nothing (the Sprinter's bake opens
 * with a 0.3 s wait), so the collapse starts as soon as the unit is hit (owner request).
 */
export function skipLeadingIdle(anim: readonly DeathKeyframe[]): DeathKeyframe[] {
  const first = anim.findIndex(
    (k) => Object.keys(k.turn).length > 0 || Object.keys(k.move).length > 0 || k.explode.length > 0 || k.hide.length > 0
  );
  return first < 0 ? [] : anim.slice(first);
}

export function deathDuration(death: Pick<UnitDeath, 'anim'>): number {
  return (death.anim ?? []).reduce((sum, k) => sum + k.ms, 0);
}

function merge(into: PieceChannels, from: PieceChannels): void {
  for (const [piece, axes] of Object.entries(from)) Object.assign((into[piece] ??= {}), axes);
}

function lerp(a: PieceChannels, b: PieceChannels, f: number): PieceChannels {
  const out: PieceChannels = {};
  for (const piece of new Set([...Object.keys(a), ...Object.keys(b)])) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const va = a[piece]?.[axis];
      const vb = b[piece]?.[axis];
      if (va === undefined && vb === undefined) continue;
      const from = va ?? 0;
      (out[piece] ??= {})[axis] = from + ((vb ?? from) - from) * f;
    }
  }
  return out;
}

/** Pose `ms` into the death, starting from the walking pose at the moment of the kill. */
export function deathPose(anim: readonly DeathKeyframe[], ms: number, from: Pose): Pose {
  let start: Pose = { turn: structuredClone(from.turn), move: structuredClone(from.move) };
  let t = 0;
  for (const k of anim) {
    const target: Pose = { turn: structuredClone(start.turn), move: structuredClone(start.move) };
    merge(target.turn, k.turn);
    merge(target.move, k.move);
    if (ms < t + k.ms) {
      const f = k.ms > 0 ? Math.max(0, ms - t) / k.ms : 1;
      return { turn: lerp(start.turn, target.turn, f), move: lerp(start.move, target.move, f) };
    }
    start = target;
    t += k.ms;
  }
  return start;
}

/** Events of blocks that start in (fromMs, toMs]; a block at 0 counts when fromMs < 0. */
export function deathEvents(anim: readonly DeathKeyframe[], fromMs: number, toMs: number): { explode: ExplodeEvent[]; hide: string[] } {
  const out = { explode: [] as ExplodeEvent[], hide: [] as string[] };
  let t = 0;
  for (const k of anim) {
    if (t > fromMs && t <= toMs) {
      out.explode.push(...k.explode);
      out.hide.push(...k.hide);
    }
    t += k.ms;
  }
  return out;
}

/** A flying piece: position and spin in elmos / radians per frame. */
export interface Debris {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  /** frames since launch; landed pieces stay a moment, then go */
  age: number;
  landedAt: number | null;
  flags: string[];
}

/** Launches a piece: up and outward with a random spin (our approximation of Spring's piece projectiles). */
export function launchDebris(at: [number, number, number], flags: string[], rng: () => number): Debris {
  const az = rng() * Math.PI * 2;
  const out = 0.8 + rng() * 1.6;
  const fall = flags.includes('FALL');
  return {
    x: at[0],
    y: at[1],
    z: at[2],
    vx: Math.cos(az) * out,
    vy: fall ? 1.6 + rng() * 2.4 : 0.6 + rng(),
    vz: Math.sin(az) * out,
    spinX: (rng() - 0.5) * 0.5,
    spinY: (rng() - 0.5) * 0.5,
    spinZ: (rng() - 0.5) * 0.5,
    age: 0,
    landedAt: null,
    flags
  };
}

/** Frames a landed piece lies on the ground; BITMAPONLY sparks fly for at most this long. */
export const DEBRIS_REST_FRAMES = 30;

/** One frame of flight; returns false when the piece is gone. */
export function stepDebris(d: Debris): boolean {
  d.age += 1;
  if (d.landedAt !== null) return d.age - d.landedAt < DEBRIS_REST_FRAMES;
  if (d.flags.includes('FALL')) d.vy -= MAP_GRAVITY;
  d.x += d.vx;
  d.y += d.vy;
  d.z += d.vz;
  if (d.y <= 0) {
    d.y = 0;
    d.landedAt = d.age;
  }
  return d.flags.includes('BITMAPONLY') ? d.age < DEBRIS_REST_FRAMES : true;
}
