import { describe, expect, it } from 'vitest';
import {
  PATH3D,
  TURBINE_POS,
  mulberry32,
  path3dPoint,
  placeTrees,
  samplePath3d,
  walkPose,
  type WalkData
} from './scene3d';

describe('3D launch scene layout', () => {
  it('walks from the near bottom-left to the far top-right', () => {
    expect(path3dPoint(0)).toEqual(PATH3D[0]);
    expect(path3dPoint(1)).toEqual(PATH3D[PATH3D.length - 1]);
    const { points, length } = samplePath3d(100);
    expect(length).toBeGreaterThan(1000);
    // heading 0 faces +z (towards the camera); walking away and to the right is between 90° and 180°
    for (const p of points.slice(5, -5)) {
      expect(p.heading).toBeGreaterThan(Math.PI / 2);
      expect(p.heading).toBeLessThan(Math.PI);
    }
  });

  it('passes in front of the turbine without walking through it', () => {
    const { points } = samplePath3d(400);
    const nearest = Math.min(...points.map((p) => Math.hypot(p.x - TURBINE_POS.x, p.z - TURBINE_POS.z)));
    expect(nearest).toBeGreaterThan(45);
    expect(nearest).toBeLessThan(110);
  });

  it('places the pine groves the same way every time, clear of the path and the turbine', () => {
    const trees = placeTrees();
    expect(trees).toEqual(placeTrees());
    expect(trees.length).toBeGreaterThan(30);
    const path = samplePath3d(300).points;
    for (const t of trees) {
      expect(Math.min(...path.map((p) => Math.hypot(p.x - t.x, p.z - t.z)))).toBeGreaterThanOrEqual(60);
      expect(Math.hypot(t.x - TURBINE_POS.x, t.z - TURBINE_POS.z)).toBeGreaterThanOrEqual(80);
    }
    expect(mulberry32(1)()).toBe(mulberry32(1)());
  });
});

describe('walk playback', () => {
  const walk: WalkData = {
    msPerKeyframe: 100,
    loopFrom: 1,
    keyframes: [
      { turn: { thigh: { x: 10 } }, move: { pelvis: { y: -2 } } },
      { turn: { thigh: { x: 30 } }, move: {} },
      { turn: { thigh: { x: -30 }, foot: { z: 6 } }, move: {} }
    ]
  };

  it('eases from rest into the first keyframe, then between keyframes', () => {
    expect(walkPose(walk, 50).turn.thigh!.x).toBeCloseTo(5);
    expect(walkPose(walk, 50).move.pelvis!.y).toBeCloseTo(-1);
    expect(walkPose(walk, 150).turn.thigh!.x).toBeCloseTo(20);
    expect(walkPose(walk, 250).turn.thigh!.x).toBeCloseTo(0);
    // a channel set only by the step-in keyframe holds its value
    expect(walkPose(walk, 250).move.pelvis!.y).toBeCloseTo(-2);
  });

  it('loops back to the loop start from the last keyframe', () => {
    expect(walkPose(walk, 350).turn.thigh!.x).toBeCloseTo(0); // -30 → 30
    expect(walkPose(walk, 400).turn.thigh!.x).toBeCloseTo(30);
    expect(walkPose(walk, 450).turn.thigh!.x).toBeCloseTo(0); // 30 → -30 again
    expect(walkPose(walk, -10).turn.thigh!.x).toBeCloseTo(0);
  });
});
