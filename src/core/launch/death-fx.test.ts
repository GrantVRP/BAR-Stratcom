import { describe, expect, it } from 'vitest';
import { colorAt, evalNum, fxDone, startFx, stepFx, type FxLibrary } from './fx';
import { MAP_GRAVITY, deathDuration, deathEvents, deathPose, launchDebris, skipLeadingIdle, stepDebris, type DeathKeyframe } from './death3d';
import { mulberry32 } from './scene3d';

const zero = (): number => 0;
const one = (): number => 1;

// Synthetic effects (test-only), in Spring units: frames and elmos.
const lib: FxLibrary = {
  boom: {
    name: 'boom',
    layers: [
      {
        name: 'sparks',
        kind: 'particles',
        shape: 'spark',
        count: 1,
        colormap: [
          [1, 1, 1, 0],
          [0, 0, 0, 0]
        ],
        pos: [{ base: 0, rand: [] }, { base: 2, rand: [] }, { base: 0, rand: [] }],
        numParticles: { base: 3, rand: [] },
        life: { base: 10, rand: [] },
        lifeSpread: { base: 0, rand: [] },
        size: { base: 2, rand: [] },
        sizeSpread: { base: 0, rand: [] },
        sizeGrowth: { base: 0.5, rand: [] },
        speed: { base: 1, rand: [] },
        speedSpread: { base: 0, rand: [] },
        emitRot: { base: 0, rand: [] },
        emitRotSpread: { base: 0, rand: [] },
        emitVector: [{ base: 0, rand: [] }, { base: 1, rand: [] }, { base: 0, rand: [] }],
        gravity: [{ base: 0, rand: [] }, { base: -0.1, rand: [] }, { base: 0, rand: [] }],
        airDrag: 1
      },
      { name: 'flash', kind: 'groundflash', shape: 'blob', count: 1, colormap: [[1, 0.7, 0.3, 0.2]], pos: [{ base: 0, rand: [] }, { base: 0, rand: [] }, { base: 0, rand: [] }], size: { base: 40, rand: [] }, sizeGrowth: { base: -2, rand: [] }, ttl: { base: 5, rand: [] } },
      { name: 'later', kind: 'spawn', shape: 'blob', count: 2, colormap: [[1, 1, 1, 0]], pos: [{ base: 0, rand: [] }, { base: 0, rand: [] }, { base: 0, rand: [] }], delay: { base: 3, rand: [] }, effect: 'ember' }
    ]
  },
  ember: { name: 'ember', layers: [{ name: 'e', kind: 'groundflash', shape: 'blob', count: 1, colormap: [[1, 0.5, 0, 0]], pos: [{ base: 0, rand: [] }, { base: 0, rand: [] }, { base: 0, rand: [] }], size: { base: 4, rand: [] }, sizeGrowth: { base: 0, rand: [] }, ttl: { base: 6, rand: [] } }] }
};

describe('CEG particle effects (launch scene deaths)', () => {
  it('evaluates CEG numbers: base plus each random term', () => {
    expect(evalNum({ base: -3, rand: [6] }, zero)).toBe(-3);
    expect(evalNum({ base: -3, rand: [6] }, one)).toBe(3);
    expect(evalNum({ base: 1, rand: [2, 4] }, () => 0.5)).toBe(4);
    expect(evalNum(undefined, one)).toBe(0);
  });

  it('spreads a colormap evenly over the life', () => {
    const map = [
      [0, 0, 0, 0],
      [1, 0.5, 0, 1],
      [0, 0, 0, 0]
    ];
    expect(colorAt(map, 0)).toEqual([0, 0, 0, 0]);
    expect(colorAt(map, 0.25)).toEqual([0.5, 0.25, 0, 0.5]);
    expect(colorAt(map, 0.5)).toEqual([1, 0.5, 0, 1]);
    expect(colorAt(map, 1)).toEqual([0, 0, 0, 0]);
  });

  it('spawns layers, moves particles with gravity, and fires delayed sub-effects', () => {
    const run = startFx(lib, 'boom', [10, 0, 20], zero);
    expect(run.particles.filter((p) => p.shape === 'spark')).toHaveLength(3);
    expect(run.particles.find((p) => p.flat)).toMatchObject({ size: 40, life: 5 });
    expect(run.pending).toHaveLength(2);
    const spark = run.particles[0]!;
    expect([spark.x, spark.y, spark.z, spark.vy]).toEqual([10, 2, 20, 1]);

    stepFx(run, lib, zero);
    // v = (1 - 0.1) · 1, y = 2 + 0.9, size = 2 + 0.5
    expect(spark.vy).toBeCloseTo(0.9);
    expect(spark.y).toBeCloseTo(2.9);
    expect(spark.size).toBeCloseTo(2.5);

    stepFx(run, lib, zero, 2);
    expect(run.pending).toHaveLength(0); // the two embers start at frame 3
    expect(run.particles.filter((p) => p.size === 4)).toHaveLength(2);

    stepFx(run, lib, zero, 20);
    expect(fxDone(run)).toBe(true);
  });

  it('is deterministic for a seed and ignores unknown effects', () => {
    const a = startFx(lib, 'boom', [0, 0, 0], mulberry32(5));
    const b = startFx(lib, 'boom', [0, 0, 0], mulberry32(5));
    expect(a).toEqual(b);
    expect(startFx(lib, 'nothing', [0, 0, 0], zero).particles).toEqual([]);
  });
});

// Synthetic death animation (test-only): a wait, a block that drops a leg, then a slump.
const anim: DeathKeyframe[] = [
  { ms: 300, turn: {}, move: {}, explode: [], hide: [] },
  { ms: 100, turn: { torso: { x: -20 } }, move: { pelvis: { y: 2 } }, explode: [{ piece: 'lleg', flags: ['FALL', 'FIRE'] }], hide: ['lleg'] },
  { ms: 200, turn: { torso: { x: -60 } }, move: {}, explode: [], hide: [] }
];

describe('death animation playback', () => {
  it('drops the idle lead-in so the death starts on the hit (owner request)', () => {
    const trimmed = skipLeadingIdle(anim);
    expect(trimmed).toHaveLength(2);
    expect(trimmed[0]!.hide).toEqual(['lleg']);
    expect(deathDuration({ anim: trimmed })).toBe(300);
    expect(skipLeadingIdle([anim[0]!])).toEqual([]);
  });

  it('lasts the sum of its blocks', () => {
    expect(deathDuration({ anim })).toBe(600);
    expect(deathDuration({ anim: null })).toBe(0);
  });

  it('starts from the walking pose and reaches each block target over its duration', () => {
    const from = { turn: { torso: { x: 10 } }, move: {} };
    expect(deathPose(anim, 0, from).turn.torso!.x).toBe(10);
    expect(deathPose(anim, 350, from).turn.torso!.x).toBeCloseTo(-5); // 10 → -20 halfway
    expect(deathPose(anim, 350, from).move.pelvis!.y).toBeCloseTo(1);
    expect(deathPose(anim, 500, from).turn.torso!.x).toBeCloseTo(-40); // -20 → -60 halfway
    expect(deathPose(anim, 900, from).turn.torso!.x).toBe(-60);
  });

  it('reports explode and hide events once, when their block starts', () => {
    expect(deathEvents(anim, -1, 299)).toEqual({ explode: [], hide: [] });
    expect(deathEvents(anim, 299, 300).hide).toEqual(['lleg']);
    expect(deathEvents(anim, 300, 600).explode).toEqual([]);
  });

  it('throws pieces up and lets FALL pieces drop to the ground under map gravity', () => {
    const d = launchDebris([0, 20, 0], ['FALL', 'SMOKE'], zero);
    expect(d.vy).toBeCloseTo(1.6);
    stepDebris(d);
    expect(d.vy).toBeCloseTo(1.6 - MAP_GRAVITY);
    let frames = 0;
    while (d.landedAt === null && frames < 500) {
      stepDebris(d);
      frames += 1;
    }
    expect(d.y).toBe(0);
    // a landed piece lies there for a moment, then is gone
    let alive = true;
    for (let i = 0; i < 40 && alive; i += 1) alive = stepDebris(d);
    expect(alive).toBe(false);
  });

  it('BITMAPONLY bursts fly without gravity and fade', () => {
    const d = launchDebris([0, 10, 0], ['BITMAPONLY'], zero);
    const vy = d.vy;
    stepDebris(d);
    expect(d.vy).toBe(vy);
    let alive = true;
    for (let i = 0; i < 40 && alive; i += 1) alive = stepDebris(d);
    expect(alive).toBe(false);
  });
});
