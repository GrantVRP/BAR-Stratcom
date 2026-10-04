import { describe, expect, it } from 'vitest';
import {
  RUN_WAYPOINTS,
  RUNNER_SIZES,
  SCENE_H,
  SCENE_W,
  TURBINE_BASE,
  pathPoint,
  runnerSizeAt,
  samplePath,
  shadowSize
} from './scene-layout';

describe('launcher scene layout (T06.14)', () => {
  it('runs from below the bottom-left to above the top-right, as in the owner draft', () => {
    const start = pathPoint(0);
    const end = pathPoint(1);
    expect(start).toEqual(RUN_WAYPOINTS[0]);
    expect(end).toEqual(RUN_WAYPOINTS[RUN_WAYPOINTS.length - 1]);
    expect(start.y).toBeGreaterThan(SCENE_H);
    expect(start.x).toBeLessThan(SCENE_W / 4);
    expect(end.y).toBeLessThan(0);
    expect(end.x).toBeGreaterThan((SCENE_W * 3) / 4);
  });

  it('passes in front of the turbine base and keeps climbing', () => {
    const pts = samplePath(200);
    const nearest = pts.reduce((a, b) =>
      Math.hypot(b.x - TURBINE_BASE.x, b.y - TURBINE_BASE.y) < Math.hypot(a.x - TURBINE_BASE.x, a.y - TURBINE_BASE.y) ? b : a
    );
    expect(Math.hypot(nearest.x - TURBINE_BASE.x, nearest.y - TURBINE_BASE.y)).toBeLessThan(45);
    expect(nearest.x).toBeGreaterThan(TURBINE_BASE.x);
    expect(pts.every((p, i) => i === 0 || p.y <= pts[i - 1]!.y + 0.5)).toBe(true);
  });

  it('samples evenly spaced points so the runner keeps a steady speed', () => {
    const pts = samplePath(50);
    const gaps = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(mean * 0.05);
    expect(pathPoint(-1)).toEqual(pathPoint(0));
    expect(pathPoint(2)).toEqual(pathPoint(1));
  });

  it('shrinks the runner with distance and sizes its shadow', () => {
    expect([runnerSizeAt(190), runnerSizeAt(130), runnerSizeAt(80), runnerSizeAt(10)]).toEqual([...RUNNER_SIZES]);
    expect(shadowSize(44)).toEqual({ w: 33, h: 9 });
    expect(shadowSize(10)).toEqual({ w: 8, h: 3 });
  });
});
