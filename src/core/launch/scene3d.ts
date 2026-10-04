/**
 * 3D launch scene layout and animation maths (T06.15), shared by tools/build-launch-3d.ts and the
 * renderer. World units are BAR elmos; x east, y up, z south (towards the camera). Pure: no DOM,
 * no WebGL.
 */

export interface P2 {
  x: number;
  z: number;
}

/** Ground area covered by the scene's terrain plane (elmos, centred on the origin). */
export const GROUND_SIZE = 1600;

/**
 * The walk (owner's draft): in from below the bottom-left, past the front of the turbine, then up and
 * off the top-right. Chosen by screen position through CAMERA (34° FOV, 16:10).
 */
export const PATH3D: P2[] = [
  { x: -232, z: 400 },
  { x: -215, z: 339 },
  { x: -184, z: 271 },
  { x: -133, z: 197 },
  { x: -102, z: 126 },
  { x: -71, z: 42 },
  { x: -5, z: -49 },
  { x: 98, z: -162 },
  { x: 229, z: -312 },
  { x: 372, z: -565 },
  { x: 430, z: -700 }
];

/** Wind turbine: centre-left of the screen, like the draft and the in-game reference. */
export const TURBINE_POS: P2 = { x: -171, z: 102 };
/** Rotor turned three-quarters to the camera. */
export const TURBINE_YAW_DEG = 30;
/** Rotor speed (degrees per second). */
export const ROTOR_SPEED_DEG = 150;

/** A BAR-like camera: 44° down, close enough that the turbine is about bot height on screen. */
export const CAMERA = {
  position: { x: -8, y: 445, z: 499 },
  target: { x: -40, y: 0, z: 40 },
  fovDeg: 34
} as const;

/** Sun from mapinfo.lua of Greenest Fields (sunDir 0.318, 0.607, -0.624), shadows to the bottom-right. */
export const SUN_DIR = { x: -0.42, y: 0.6, z: -0.62 } as const;

/** Unit speeds from the unit definitions (elmos per second) and the scene's time scale. */
export const UNIT_SPEED = { armfast: 111.3, corpyro: 82.5 } as const;
export const TIME_SCALE = 1.6;
/** Pause off-screen between passes (ms). */
export const PASS_PAUSE_MS = 1400;

/** Point on the Catmull-Rom spline through PATH3D (t in 0–1). */
export function path3dPoint(t: number, w = PATH3D): P2 {
  const segs = w.length - 1;
  const f = Math.min(Math.max(t, 0), 1) * segs;
  const i = Math.min(Math.floor(f), segs - 1);
  const u = f - i;
  const p0 = w[Math.max(i - 1, 0)]!;
  const p1 = w[i]!;
  const p2 = w[i + 1]!;
  const p3 = w[Math.min(i + 2, segs)]!;
  const c = (a: number, b: number, d: number, e: number): number =>
    0.5 * (2 * b + (-a + d) * u + (2 * a - 5 * b + 4 * d - e) * u * u + (-a + 3 * b - 3 * d + e) * u * u * u);
  return { x: c(p0.x, p1.x, p2.x, p3.x), z: c(p0.z, p1.z, p2.z, p3.z) };
}

/** Arc-length table: `count` evenly spaced points with their heading (radians, 0 = facing +z). */
export function samplePath3d(count: number, w = PATH3D): { points: Array<P2 & { heading: number }>; length: number } {
  const fine = 2000;
  const pts = Array.from({ length: fine + 1 }, (_, i) => path3dPoint(i / fine, w));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.z - pts[i - 1]!.z));
  const length = cum[cum.length - 1]!;
  const points: Array<P2 & { heading: number }> = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (length * k) / Math.max(1, count - 1);
    while (j < cum.length - 2 && cum[j + 1]! < target) j++;
    const span = cum[j + 1]! - cum[j]! || 1;
    const f = (target - cum[j]!) / span;
    const a = pts[j]!;
    const b = pts[j + 1]!;
    points.push({ x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, heading: Math.atan2(b.x - a.x, b.z - a.z) });
  }
  return { points, length };
}

/** Deterministic PRNG so the tree layout is identical on every build. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tree models (Greenest Fields' most placed Aleppo pines). */
export const TREE_MODELS = [
  'ad0_aleppo2_double_med_xl',
  'ad0_aleppo2_dense_dark_l',
  'ad0_aleppo2_double_med_m',
  'ad0_aleppo2_double_light_s',
  'ad0_aleppo2_sparse_dark_l'
] as const;

export interface TreePlacement extends P2 {
  model: (typeof TREE_MODELS)[number];
  rotation: number;
  scale: number;
}

/** Tree groves (centre, radius, count), like the clumps on the map; kept off the path and the turbine. */
const GROVES: Array<[P2, number, number]> = [
  [{ x: -398, z: -198 }, 130, 9],
  [{ x: -259, z: -59 }, 90, 6],
  [{ x: 212, z: 11 }, 110, 8],
  [{ x: -47, z: -304 }, 110, 6],
  [{ x: 250, z: -330 }, 120, 6],
  [{ x: 120, z: 227 }, 70, 3],
  [{ x: -297, z: 121 }, 70, 4]
];

export function placeTrees(seed = 3): TreePlacement[] {
  const rand = mulberry32(seed);
  const path = samplePath3d(300).points;
  const trees: TreePlacement[] = [];
  for (const [centre, radius, count] of GROVES) {
    let placed = 0;
    for (let tries = 0; placed < count && tries < 600; tries++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * radius;
      const p = { x: centre.x + Math.cos(a) * r, z: centre.z + Math.sin(a) * r * 0.8 };
      if (path.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 60)) continue;
      if (Math.hypot(p.x - TURBINE_POS.x, p.z - TURBINE_POS.z) < 80) continue;
      if (trees.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < 38)) continue;
      const pick = rand();
      const model = pick < 0.3 ? TREE_MODELS[0] : pick < 0.5 ? TREE_MODELS[1] : pick < 0.72 ? TREE_MODELS[2] : pick < 0.86 ? TREE_MODELS[4] : TREE_MODELS[3];
      trees.push({ ...p, model, rotation: rand() * Math.PI * 2, scale: 0.9 + rand() * 0.3 });
      placed++;
    }
  }
  return trees;
}

/* ---------------------------------------------------------------------------------------------- */
/* Walk animation playback                                                                        */
/* ---------------------------------------------------------------------------------------------- */

export type Axis = 'x' | 'y' | 'z';
export type PieceChannels = Record<string, Partial<Record<Axis, number>>>;

export interface WalkKeyframe {
  turn: PieceChannels;
  move: PieceChannels;
}

export interface WalkData {
  /** Duration of one keyframe at full speed (ms). */
  msPerKeyframe: number;
  loopFrom: number;
  keyframes: WalkKeyframe[];
}

/** Absolute pose after applying keyframes 0..n in order (each keyframe sets targets for some channels). */
function poseAfter(walk: WalkData, n: number): { turn: PieceChannels; move: PieceChannels } {
  const turn: PieceChannels = {};
  const move: PieceChannels = {};
  for (let i = 0; i <= n; i++) {
    const kf = walk.keyframes[i]!;
    for (const [piece, axes] of Object.entries(kf.turn)) Object.assign((turn[piece] ??= {}), axes);
    for (const [piece, axes] of Object.entries(kf.move)) Object.assign((move[piece] ??= {}), axes);
  }
  return { turn, move };
}

/**
 * Pose `ms` into the walk: each keyframe's targets are reached linearly over one keyframe duration,
 * the loop repeats from `loopFrom`. Returns degrees (turn) and elmos (move) per piece and axis.
 */
export function walkPose(walk: WalkData, ms: number): { turn: PieceChannels; move: PieceChannels } {
  const loopLen = walk.keyframes.length - walk.loopFrom;
  const step = Math.max(0, ms) / walk.msPerKeyframe;
  const k = Math.floor(step);
  const f = step - k;
  // keyframe index we are moving towards, and the one we came from
  const toIdx = k < walk.keyframes.length ? k : walk.loopFrom + ((k - walk.loopFrom) % loopLen);
  const fromIdx =
    k === 0 ? -1 : k < walk.keyframes.length ? k - 1 : toIdx === walk.loopFrom ? walk.keyframes.length - 1 : toIdx - 1;
  const to = poseAfter(walk, toIdx);
  const from = fromIdx < 0 ? { turn: {}, move: {} } : poseAfter(walk, fromIdx);
  const lerpChannels = (a: PieceChannels, b: PieceChannels): PieceChannels => {
    const out: PieceChannels = {};
    for (const piece of new Set([...Object.keys(a), ...Object.keys(b)])) {
      for (const axis of ['x', 'y', 'z'] as const) {
        const va = a[piece]?.[axis] ?? 0;
        const vb = b[piece]?.[axis] ?? va;
        if (a[piece]?.[axis] === undefined && b[piece]?.[axis] === undefined) continue;
        (out[piece] ??= {})[axis] = va + (vb - va) * f;
      }
    }
    return out;
  };
  return { turn: lerpChannels(from.turn, to.turn), move: lerpChannels(from.move, to.move) };
}
