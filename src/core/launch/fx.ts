/**
 * Particle effects of the launch scene's unit deaths, driven by BAR's own CEG numbers (extracted by
 * tools/build-launch-3d.ts from effects/*.lua). Spring units: elmos and frames (30 per second).
 * Colours are premultiplied RGBA drawn with ONE / ONE_MINUS_SRC_ALPHA, as in the engine: alpha 0 is a
 * pure additive glow, alpha 1 an opaque puff. Pure: no DOM, no WebGL; randomness comes from `rng`.
 */

export interface CegNum {
  base: number;
  /** each term adds rng() · term */
  rand: number[];
}
export type CegVec = [CegNum, CegNum, CegNum];

export interface FxLayer {
  name: string;
  kind: 'particles' | 'groundflash' | 'flame' | 'heatcloud' | 'spawn';
  shape: 'blob' | 'shard' | 'spark' | 'ring';
  count: number;
  colormap: number[][];
  pos: CegVec;
  numParticles?: CegNum;
  life?: CegNum;
  lifeSpread?: CegNum;
  size?: CegNum;
  sizeSpread?: CegNum;
  sizeGrowth?: CegNum;
  sizeMod?: number;
  speed?: CegNum;
  speedSpread?: CegNum;
  emitRot?: CegNum;
  emitRotSpread?: CegNum;
  emitVector?: CegVec;
  gravity?: CegVec;
  airDrag?: number;
  ttl?: CegNum;
  length?: CegNum;
  heat?: CegNum;
  maxHeat?: CegNum;
  heatFalloff?: CegNum;
  delay?: CegNum;
  effect?: string;
}

export interface FxSpec {
  name: string;
  layers: FxLayer[];
}

export type FxLibrary = Record<string, FxSpec>;

export interface Particle {
  shape: FxLayer['shape'];
  /** lies flat on the ground (ground flashes, the upward shockwave) instead of facing the camera */
  flat?: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gx: number;
  gy: number;
  gz: number;
  drag: number;
  size: number;
  growth: number;
  sizeMod: number;
  age: number;
  life: number;
  colormap: number[][];
}

export interface FxRun {
  frame: number;
  particles: Particle[];
  pending: Array<{ at: number; effect: string; x: number; y: number; z: number }>;
}

export type Rng = () => number;

export function evalNum(n: CegNum | undefined, rng: Rng): number {
  if (!n) return 0;
  return n.rand.reduce((sum, r) => sum + rng() * r, n.base);
}

const evalVec = (v: CegVec | undefined, rng: Rng): [number, number, number] =>
  v ? [evalNum(v[0], rng), evalNum(v[1], rng), evalNum(v[2], rng)] : [0, 0, 0];

/** Colour at life fraction t: the colormap's stops spread evenly over the life (Spring CColorMap). */
export function colorAt(map: number[][], t: number): [number, number, number, number] {
  if (map.length === 1) return map[0] as [number, number, number, number];
  const f = Math.min(Math.max(t, 0), 1) * (map.length - 1);
  const i = Math.min(Math.floor(f), map.length - 2);
  const u = f - i;
  const a = map[i]!;
  const b = map[i + 1]!;
  return [0, 1, 2, 3].map((k) => a[k]! + (b[k]! - a[k]!) * u) as [number, number, number, number];
}

/** A direction `angleDeg` away from `axis`, at azimuth `az` (radians). */
function coneDirection(axis: [number, number, number], angleDeg: number, az: number): [number, number, number] {
  const len = Math.hypot(...axis) || 1;
  const n = axis.map((c) => c / len) as [number, number, number];
  const helper: [number, number, number] = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  // u = normalize(helper × n), v = n × u
  let u: [number, number, number] = [helper[1] * n[2] - helper[2] * n[1], helper[2] * n[0] - helper[0] * n[2], helper[0] * n[1] - helper[1] * n[0]];
  const ul = Math.hypot(...u) || 1;
  u = u.map((c) => c / ul) as [number, number, number];
  const v: [number, number, number] = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const a = (angleDeg * Math.PI) / 180;
  const s = Math.sin(a);
  const c = Math.cos(a);
  return [0, 1, 2].map((k) => n[k]! * c + (u[k]! * Math.cos(az) + v[k]! * Math.sin(az)) * s) as [number, number, number];
}

const HEAT_COLORS = [
  [1, 0.95, 0.8, 0],
  [1, 0.6, 0.25, 0],
  [0, 0, 0, 0]
];

function spawnLayer(run: FxRun, layer: FxLayer, at: [number, number, number], rng: Rng): void {
  for (let c = 0; c < layer.count; c += 1) {
    const off = evalVec(layer.pos, rng);
    const x = at[0] + off[0];
    const y = at[1] + off[1];
    const z = at[2] + off[2];
    const base = { x, y, z, vx: 0, vy: 0, vz: 0, gx: 0, gy: 0, gz: 0, drag: 1, sizeMod: 1, age: 0, colormap: layer.colormap };
    switch (layer.kind) {
      case 'particles': {
        const n = Math.floor(evalNum(layer.numParticles, rng));
        const axis = evalVec(layer.emitVector, rng);
        for (let i = 0; i < n; i += 1) {
          const dir = coneDirection(axis, evalNum(layer.emitRot, rng) + rng() * evalNum(layer.emitRotSpread, rng), rng() * Math.PI * 2);
          const speed = evalNum(layer.speed, rng) + rng() * evalNum(layer.speedSpread, rng);
          const g = evalVec(layer.gravity, rng);
          run.particles.push({
            ...base,
            shape: layer.shape,
            vx: dir[0] * speed,
            vy: dir[1] * speed,
            vz: dir[2] * speed,
            gx: g[0],
            gy: g[1],
            gz: g[2],
            drag: layer.airDrag ?? 1,
            size: evalNum(layer.size, rng) + rng() * evalNum(layer.sizeSpread, rng),
            growth: evalNum(layer.sizeGrowth, rng),
            sizeMod: layer.sizeMod ?? 1,
            life: Math.max(1, evalNum(layer.life, rng) + rng() * evalNum(layer.lifeSpread, rng))
          });
        }
        break;
      }
      case 'groundflash':
        run.particles.push({ ...base, shape: 'blob', flat: true, y: at[1] + 1, size: evalNum(layer.size, rng), growth: evalNum(layer.sizeGrowth, rng), life: Math.max(1, evalNum(layer.ttl, rng)) });
        break;
      case 'flame': {
        const ttl = Math.max(1, evalNum(layer.ttl, rng));
        const length = evalNum(layer.length, rng);
        if (layer.shape === 'ring') {
          // the shockwave grows to its length over its life
          run.particles.push({ ...base, shape: 'ring', flat: true, size: evalNum(layer.size, rng), growth: length / ttl, life: ttl });
        } else {
          const d = evalVec(layer.emitVector, rng);
          const dl = Math.hypot(...d) || 1;
          const speed = length / ttl;
          run.particles.push({ ...base, shape: 'blob', vx: (d[0] / dl) * speed, vy: (d[1] / dl) * speed, vz: (d[2] / dl) * speed, size: evalNum(layer.size, rng) / 2, growth: evalNum(layer.sizeGrowth, rng), life: ttl });
        }
        break;
      }
      case 'heatcloud': {
        const heat = evalNum(layer.heat, rng);
        const falloff = Math.max(0.01, evalNum(layer.heatFalloff, rng));
        run.particles.push({ ...base, shape: 'blob', colormap: HEAT_COLORS, size: evalNum(layer.size, rng), growth: evalNum(layer.sizeGrowth, rng), life: Math.max(1, heat / falloff) });
        break;
      }
      case 'spawn':
        if (layer.effect) run.pending.push({ at: run.frame + evalNum(layer.delay, rng), effect: layer.effect, x, y, z });
        break;
    }
  }
}

/** Starts effect `name` at a point (adds to `run` when given). Unknown effects add nothing. */
export function startFx(lib: FxLibrary, name: string, at: [number, number, number], rng: Rng, run: FxRun = { frame: 0, particles: [], pending: [] }): FxRun {
  for (const layer of lib[name]?.layers ?? []) spawnLayer(run, layer, at, rng);
  return run;
}

/** Advances by whole frames: gravity, drag, motion, growth, ageing; delayed spawns fire. */
export function stepFx(run: FxRun, lib: FxLibrary, rng: Rng, frames = 1): void {
  for (let f = 0; f < frames; f += 1) {
    run.frame += 1;
    const due = run.pending.filter((p) => p.at <= run.frame);
    run.pending = run.pending.filter((p) => p.at > run.frame);
    for (const p of due) startFx(lib, p.effect, [p.x, p.y, p.z], rng, run);
    for (const p of run.particles) {
      p.vx = (p.vx + p.gx) * p.drag;
      p.vy = (p.vy + p.gy) * p.drag;
      p.vz = (p.vz + p.gz) * p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      if (p.y < 0) {
        p.y = 0;
        p.vy = 0;
      }
      p.size = p.size * p.sizeMod + p.growth;
      p.age += 1;
    }
    run.particles = run.particles.filter((p) => p.age < p.life && p.size > 0);
  }
}

export function fxDone(run: FxRun): boolean {
  return run.particles.length === 0 && run.pending.length === 0;
}
