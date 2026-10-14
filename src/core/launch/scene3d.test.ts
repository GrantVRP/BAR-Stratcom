import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  CAMERA,
  PATH3D,
  SHOWCASE,
  TURBINE_POS,
  mulberry32,
  path3dPoint,
  placeTrees,
  samplePath3d,
  showcasePass,
  showcaseTrees,
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

describe('showcase layout', () => {
  const { length } = samplePath3d(1200);

  it('stands the Cortex turbine beside the Armada one, both clear of the path and the pines', () => {
    const { armada, cortex } = SHOWCASE.turbines;
    expect(armada).toEqual(TURBINE_POS);
    expect(cortex.z).toBe(armada.z);
    expect(armada.x - cortex.x).toBeGreaterThanOrEqual(70);
    expect(armada.x - cortex.x).toBeLessThanOrEqual(110);
    const path = samplePath3d(400).points;
    for (const spot of [armada, cortex]) {
      expect(Math.min(...path.map((p) => Math.hypot(p.x - spot.x, p.z - spot.z)))).toBeGreaterThan(45);
      for (const t of showcaseTrees()) expect(Math.hypot(t.x - spot.x, t.z - spot.z)).toBeGreaterThanOrEqual(80);
    }
    // the launcher's pines, only fewer
    const launcher = placeTrees();
    expect(showcaseTrees().every((t) => launcher.some((l) => l.x === t.x && l.z === t.z))).toBe(true);
    expect(launcher.length - showcaseTrees().length).toBeLessThanOrEqual(4);
  });

  it('loops seamlessly: whole rotor turns, and each unit is where it was a loop earlier', () => {
    expect(((SHOWCASE.rotorDegPerS * SHOWCASE.loopMs) / 1000) % 360).toBe(0);
    for (const unit of ['armfast', 'corpyro'] as const) {
      for (const ms of [0, 1000, 5000, 7990]) expect(showcasePass(unit, ms + SHOWCASE.loopMs, length)).toEqual(showcasePass(unit, ms, length));
    }
  });

  it('has the Sprinter chase the Fiend in view for most of the loop, never running into it', () => {
    // the README picture's camera: a unit is in view while any of it (35 elmos tall) is in the frame
    const camera = new PerspectiveCamera(CAMERA.fovDeg, 854 / 534, 10, 4000);
    camera.position.set(CAMERA.position.x, CAMERA.position.y, CAMERA.position.z);
    camera.lookAt(CAMERA.target.x, CAMERA.target.y, CAMERA.target.z);
    camera.updateMatrixWorld();
    const lut = samplePath3d(1200);
    const inView = (pass: { at: number } | null): boolean => {
      if (!pass) return false;
      const p = lut.points[Math.round(pass.at * (lut.points.length - 1))]!;
      const foot = new Vector3(p.x, 0, p.z).project(camera);
      const head = new Vector3(p.x, 35, p.z).project(camera);
      return foot.y - 0.06 < 1 && head.y > -1; // 0.06: its shadow, to the bottom-right
    };
    let together = 0;
    let empty = 0;
    for (let ms = 0; ms < SHOWCASE.loopMs; ms += 10) {
      const sprinter = showcasePass('armfast', ms, length);
      const fiend = showcasePass('corpyro', ms, length);
      if (sprinter && fiend) expect(Math.abs(sprinter.at - fiend.at) * length).toBeGreaterThan(100);
      if (inView(sprinter) && inView(fiend)) {
        together += 10;
        expect(fiend!.at).toBeGreaterThan(sprinter!.at);
      }
      if (!inView(sprinter) && !inView(fiend)) empty += 10;
    }
    expect(together).toBeGreaterThan(3500);
    expect(empty).toBeLessThan(1000);
    // each unit starts its pass off screen, at the bottom-left
    for (const unit of ['armfast', 'corpyro'] as const) expect(inView(showcasePass(unit, SHOWCASE.startMs[unit], length))).toBe(false);
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
