import { Group, Matrix4, Mesh, Quaternion, Vector3, type Scene } from 'three';
import {
  FRAME_MS,
  RESPAWN_DELAY_MS,
  deathDuration,
  deathEvents,
  deathPose,
  skipLeadingIdle,
  launchDebris,
  stepDebris,
  type Debris,
  type ExplodeEvent,
  type Pose,
  type UnitDeath
} from '../../../../core/launch/death3d';
import { startFx, stepFx, type FxLibrary, type FxRun, type Particle } from '../../../../core/launch/fx';
import { mulberry32 } from '../../../../core/launch/scene3d';
import type { Model3D } from './model3d';

const DEG = Math.PI / 180;
/** BAR script angle signs in three.js space (as the walk). */
const AXIS_SIGN = { x: 1, y: -1, z: -1 } as const;

/** Sets every piece of a model to a pose (degrees / elmos, BAR script axes). */
export function applyPiecePose(model: Model3D, pose: Pose): void {
  for (const [name, group] of model.pieces) {
    const turn = pose.turn[name];
    group.rotation.set((turn?.x ?? 0) * DEG * AXIS_SIGN.x, (turn?.y ?? 0) * DEG * AXIS_SIGN.y, (turn?.z ?? 0) * DEG * AXIS_SIGN.z);
    const rest = model.rest.get(name)!;
    const move = pose.move[name];
    group.position.set(rest[0] + (move?.x ?? 0) * -1, rest[1] + (move?.y ?? 0), rest[2] + (move?.z ?? 0));
  }
}

// Piece trails: Spring draws these in engine code, so the colours here are our approximation.
const FIRE_TRAIL = [
  [1, 0.85, 0.45, 0],
  [0.9, 0.4, 0.08, 0],
  [0, 0, 0, 0]
];
const SMOKE_TRAIL = [
  [0.16, 0.15, 0.14, 0.45],
  [0.09, 0.09, 0.08, 0.3],
  [0, 0, 0, 0]
];
const SPARK = [
  [1, 0.95, 0.7, 0],
  [1, 0.55, 0.15, 0],
  [0, 0, 0, 0]
];

interface FlyingPiece {
  debris: Debris;
  object: Group | null;
}

export interface Placement {
  x: number;
  z: number;
  heading: number;
}

/**
 * One unit's death on the launch scene: its DeathAnim (if any) with pieces breaking off, then the
 * Killed() pieces, the death explosion and the wreck; a new unit may run in RESPAWN_DELAY_MS later.
 */
export class UnitDeathPlayer {
  private killedAt: number | null = null;
  private place: Placement = { x: 0, z: 0, heading: 0 };
  private fromPose: Pose = { turn: {}, move: {} };
  private animMs = 0;
  /** the death animation without its idle lead-in, so the collapse starts on the click */
  private readonly anim: UnitDeath['anim'];
  private eventsUpTo = -1;
  private hasExploded = false;
  private pieces: FlyingPiece[] = [];
  private run: FxRun = { frame: 0, particles: [], pending: [] };
  private lastStep = 0;
  private rng = mulberry32(1);

  constructor(
    private readonly scene: Scene,
    private readonly model: Model3D,
    private readonly death: UnitDeath,
    private readonly wreck: Model3D | null,
    private readonly fx: FxLibrary
  ) {
    this.anim = death.anim ? skipLeadingIdle(death.anim) : null;
    this.animMs = deathDuration({ anim: this.anim });
    if (wreck) {
      wreck.root.visible = false;
      scene.add(wreck.root);
    }
  }

  get dying(): boolean {
    return this.killedAt !== null;
  }

  /** The unit has exploded: only the wreck, debris and effects remain. */
  get exploded(): boolean {
    return this.killedAt !== null && this.hasExploded;
  }

  /** When the next unit may run in (ms), or null while alive. */
  get respawnAt(): number | null {
    return this.killedAt === null ? null : this.killedAt + this.animMs + RESPAWN_DELAY_MS;
  }

  particles(): readonly Particle[] {
    return this.run.particles;
  }

  kill(ms: number, place: Placement, pose: Pose): void {
    if (this.killedAt !== null) return;
    this.killedAt = ms;
    this.place = place;
    this.fromPose = pose;
    this.eventsUpTo = -1;
    this.hasExploded = false;
    this.rng = mulberry32(Math.floor(ms) | 1);
    this.lastStep = ms;
  }

  /** The unit is back: restore its pieces (the wreck stays where it fell). */
  revive(): void {
    this.killedAt = null;
    for (const g of this.model.pieces.values()) g.visible = true;
  }

  /** Clears everything (faction switch or restart). */
  reset(): void {
    this.revive();
    for (const p of this.pieces) if (p.object) this.scene.remove(p.object);
    this.pieces = [];
    this.run = { frame: 0, particles: [], pending: [] };
    if (this.wreck) this.wreck.root.visible = false;
  }

  /** Advances the death to `ms`; also keeps particles and debris moving after it. */
  update(ms: number): void {
    if (this.killedAt !== null) {
      const t = ms - this.killedAt;
      if (this.anim && t < this.animMs) applyPiecePose(this.model, deathPose(this.anim, t, this.fromPose));
      if (this.anim) {
        const ev = deathEvents(this.anim, this.eventsUpTo, t);
        for (const name of ev.hide) this.model.pieces.get(name)!.visible = false;
        for (const e of ev.explode) this.breakOff(e);
        this.eventsUpTo = t;
      }
      if (!this.hasExploded && t >= this.animMs) this.explode();
    }
    const frames = Math.floor((ms - this.lastStep) / FRAME_MS);
    if (frames <= 0) return;
    this.lastStep += frames * FRAME_MS;
    for (let f = 0; f < Math.min(frames, 10); f += 1) this.stepFrame();
  }

  private explode(): void {
    this.hasExploded = true;
    for (const e of this.death.explodes) this.breakOff(e);
    this.model.root.visible = false;
    if (this.wreck) {
      this.wreck.root.position.set(this.place.x, 0, this.place.z);
      this.wreck.root.rotation.y = this.place.heading;
      this.wreck.root.visible = true;
    }
    startFx(this.fx, this.death.fx, [this.place.x, 0, this.place.z], this.rng, this.run);
  }

  /** `explode piece type …`: the piece flies off (BITMAPONLY: only a burst of light). */
  private breakOff(e: ExplodeEvent): void {
    const piece = this.model.pieces.get(e.piece);
    if (!piece) return;
    piece.updateWorldMatrix(true, false);
    const p = new Vector3().setFromMatrixPosition(piece.matrixWorld);
    const debris = launchDebris([p.x, p.y, p.z], e.flags, this.rng);
    let object: Group | null = null;
    if (!e.flags.includes('BITMAPONLY')) {
      object = new Group();
      for (const child of piece.children) if (child instanceof Mesh) object.add(new Mesh(child.geometry, child.material));
      const q = new Quaternion();
      new Matrix4().copy(piece.matrixWorld).decompose(new Vector3(), q, new Vector3());
      object.quaternion.copy(q);
      object.position.copy(p);
      this.scene.add(object);
    }
    this.pieces.push({ debris, object });
  }

  private stepFrame(): void {
    stepFx(this.run, this.fx, this.rng);
    this.pieces = this.pieces.filter((piece) => {
      const d = piece.debris;
      const alive = stepDebris(d);
      if (piece.object) {
        piece.object.position.set(d.x, d.y, d.z);
        if (d.landedAt === null) {
          piece.object.rotation.x += d.spinX;
          piece.object.rotation.y += d.spinY;
          piece.object.rotation.z += d.spinZ;
        }
      }
      const flying = d.landedAt === null;
      if (d.flags.includes('BITMAPONLY')) this.emit(d, SPARK, 3.5, 6);
      else if (flying && d.flags.includes('FIRE') && d.age % 2 === 0) this.emit(d, FIRE_TRAIL, 2.2, 10);
      if ((flying || d.age - (d.landedAt ?? 0) < 20) && d.flags.includes('SMOKE') && d.age % 2 === 1) this.emit(d, SMOKE_TRAIL, 2, 30, 0.03);
      if (!alive && piece.object) this.scene.remove(piece.object);
      return alive;
    });
  }

  private emit(d: Debris, colormap: number[][], size: number, life: number, rise = 0): void {
    this.run.particles.push({
      shape: 'blob',
      x: d.x,
      y: d.y,
      z: d.z,
      vx: 0,
      vy: rise,
      vz: 0,
      gx: 0,
      gy: 0,
      gz: 0,
      drag: 1,
      size,
      growth: 0.08,
      sizeMod: 1,
      age: 0,
      life,
      colormap
    });
  }
}
