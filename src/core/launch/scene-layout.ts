/**
 * Launcher scene layout (T06.14), in scene pixels. The scene is a 320 × 200 pixel-art canvas shown at
 * a whole-number scale (4× in the default 1280 × 800 window). Shared by the renderer and by
 * tools/build-launch-scene.ts, which draws the dirt track along the same path the runner follows.
 */
export const SCENE_W = 320;
export const SCENE_H = 200;

export interface Point {
  x: number;
  y: number;
}

/**
 * The runner's route (the owner's draft): in from below the bottom-left, a gentle S-bend past the
 * front of the wind turbine, then up and off the top-right, like the winding tracks on Greenest
 * Fields. A Catmull-Rom spline through these waypoints.
 */
export const RUN_WAYPOINTS: Point[] = [
  { x: 14, y: 238 },
  { x: 58, y: 202 },
  { x: 100, y: 174 },
  { x: 124, y: 148 },
  { x: 130, y: 120 },
  { x: 146, y: 94 },
  { x: 182, y: 72 },
  { x: 222, y: 52 },
  { x: 254, y: 26 },
  { x: 282, y: -6 },
  { x: 300, y: -38 }
];

/** Turbine placement: centre of its base on the ground, and the rotor hub. */
export const TURBINE_BASE: Point = { x: 92, y: 132 };
export const TURBINE_TOWER = { w: 48, h: 100 } as const;
/** Rotor hub inside the tower image. */
export const TOWER_HUB: Point = { x: 24, y: 20 };
export const ROTOR_SIZE = 76;
export const ROTOR_FRAMES = 24;
/** Rotor frames cover 120° (three blades), 5° apart. */
export const ROTOR_STEP_DEG = 120 / ROTOR_FRAMES;

/** Runner sprite heights (scene px) from near (bottom) to far (top): depth without blurry scaling. */
export const RUNNER_SIZES = [44, 38, 32, 27] as const;

/** Point at parameter t (0–1) on the Catmull-Rom spline through the waypoints. */
export function pathPoint(t: number, w = RUN_WAYPOINTS): Point {
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
  return { x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y) };
}

/** Distance-uniform sampling: `count` points evenly spaced along the path (constant running speed). */
export function samplePath(count: number, w = RUN_WAYPOINTS): Point[] {
  const fine = 800;
  const pts = Array.from({ length: fine + 1 }, (_, i) => pathPoint(i / fine, w));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  }
  const total = cum[cum.length - 1]!;
  const out: Point[] = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / Math.max(1, count - 1);
    while (j < cum.length - 2 && cum[j + 1]! < target) j++;
    const span = cum[j + 1]! - cum[j]! || 1;
    const f = (target - cum[j]!) / span;
    out.push({ x: pts[j]!.x + (pts[j + 1]!.x - pts[j]!.x) * f, y: pts[j]!.y + (pts[j + 1]!.y - pts[j]!.y) * f });
  }
  return out;
}

/** Which runner size to use at a height on screen: nearer the bottom = bigger. */
export function runnerSizeAt(y: number): (typeof RUNNER_SIZES)[number] {
  if (y > 150) return RUNNER_SIZES[0];
  if (y > 105) return RUNNER_SIZES[1];
  if (y > 60) return RUNNER_SIZES[2];
  return RUNNER_SIZES[3];
}

/** Ground shadow size under a runner of `size`. */
export function shadowSize(size: number): { w: number; h: number } {
  return { w: Math.round(size * 0.75), h: Math.max(3, Math.round(size * 0.2)) };
}

/** Cloud shadow sprite size. */
export const CLOUD = { w: 140, h: 72 } as const;

/** Running timings per faction: the Sprinter is the quicker raider. */
export const RUN_TIMING = {
  armada: { passMs: 3400, pauseMs: 1300, stepMs: 110 },
  cortex: { passMs: 4000, pauseMs: 1300, stepMs: 130 }
} as const;
