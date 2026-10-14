import { LAUNCH_RUNNER, LAUNCH_TURBINE } from '../launch/constants';
import {
  AmbientLight,
  Color,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  Mesh,
  MeshDepthMaterial,
  MeshLambertMaterial,
  MeshToonMaterial,
  NearestFilter,
  PerspectiveCamera,
  PlaneGeometry,
  RedFormat,
  RGBADepthPacking,
  Scene,
  Vector3,
  type Texture
} from 'three';
import {
  CAMERA,
  GROUND_SIZE,
  PASS_PAUSE_MS,
  ROTOR_SPEED_DEG,
  SUN_DIR,
  TIME_SCALE,
  TREE_MODELS,
  TURBINE_POS,
  TURBINE_FLIP_DEG,
  TURBINE_YAW_DEG,
  UNIT_SPEED,
  placeTrees,
  samplePath3d,
  walkPose,
  type WalkData
} from '../../../../core/launch/scene3d';
import type { UnitDeath } from '../../../../core/launch/death3d';
import type { FxLibrary } from '../../../../core/launch/fx';
import { loadJson, loadTexture } from './assets3d';
import { buildModel, type Model3D, type ModelJson } from './model3d';
import { FxPoints } from './fx-points';
import { UnitDeathPlayer, applyPiecePose, type Placement } from './runner-death';

export type Faction3D = 'armada' | 'cortex';

const DEG = Math.PI / 180;
/** BAR script angle signs in three.js space (y and z turn the other way). */
export const AXIS_SIGN = { x: 1, y: -1, z: -1 } as const;
const RUNNER: Record<Faction3D, (typeof LAUNCH_RUNNER)[Faction3D]> = LAUNCH_RUNNER;
const TURBINE: Record<Faction3D, { model: string; yaw: string; rotor: string; tex: string }> = {
  armada: { model: LAUNCH_TURBINE.armada, yaw: 'turbine', rotor: 'blades', tex: 'tex-arm' },
  cortex: { model: LAUNCH_TURBINE.cortex, yaw: 'cradle', rotor: 'fan', tex: 'tex-cor' }
};

function toonRamp(): DataTexture {
  const ramp = new DataTexture(new Uint8Array([125, 175, 220, 255]), 4, 1, RedFormat);
  ramp.minFilter = NearestFilter;
  ramp.magFilter = NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

interface Runner {
  model: Model3D;
  walk: WalkData;
  speed: number;
  death: UnitDeathPlayer;
  /** when the current unit started its pass, and where it is now (null: off screen) */
  spawnMs: number;
  lastMs: number;
  place: Placement | null;
  walkMs: number;
}

export interface LaunchWorld {
  scene: Scene;
  camera: PerspectiveCamera;
  /** Advance to `ms` since the faction was shown; `still` freezes the runner by the turbine. */
  update(faction: Faction3D, ms: number, still: boolean): void;
  /** Where the walking unit is on screen (normalised device coords), or null. */
  runnerScreen(faction: Faction3D): { x: number; y: number } | null;
  /** Whether a point (normalised device coords) is on the walking unit. */
  hitRunner(faction: Faction3D, ndcX: number, ndcY: number): boolean;
  /** Destroys the walking unit: its BAR death, then a new one 3 s later. */
  kill(faction: Faction3D, ms: number): boolean;
  /** Particle sizing for the low-resolution render target. */
  setTargetHeight(height: number): void;
  dispose(): void;
}

function applyPose(model: Model3D, walk: WalkData, ms: number): void {
  applyPiecePose(model, walkPose(walk, ms));
}

export async function buildLaunchWorld(): Promise<LaunchWorld> {
  const ramp = toonRamp();
  const [armTex, corTex, treeTex, groundTex, armWreckTex, corWreckTex] = await Promise.all(
    ['tex-arm', 'tex-cor', 'tex-tree', 'tex-ground', 'tex-arm-wreck', 'tex-cor-wreck'].map((n) => loadTexture(n))
  );
  const textures: Record<string, Texture> = { 'tex-arm': armTex!, 'tex-cor': corTex!, 'tex-arm-wreck': armWreckTex!, 'tex-cor-wreck': corWreckTex! };
  const fxLibrary = await loadJson<FxLibrary>('fx-library');
  const unitMaterial = (tex: string): MeshToonMaterial => new MeshToonMaterial({ map: textures[tex]!, gradientMap: ramp });

  const scene = new Scene();
  scene.background = new Color(0x2c3b18);
  scene.fog = new Fog(0x2c3b18, 1400, 2600);

  const ground = new Mesh(new PlaneGeometry(GROUND_SIZE, GROUND_SIZE), new MeshLambertMaterial({ map: groundTex! }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Aleppo pines: each model decoded once, then cloned (shared geometry) for every placement
  const treeMaterial = new MeshToonMaterial({ map: treeTex!, gradientMap: ramp, alphaTest: 0.45, side: DoubleSide });
  const treeDepth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: treeTex!, alphaTest: 0.45 });
  const treeModels = new Map<string, Group>();
  for (const name of TREE_MODELS) {
    const m = buildModel(await loadJson<ModelJson>(`model-${name}`), treeMaterial);
    m.root.traverse((o) => {
      if (o instanceof Mesh) o.customDepthMaterial = treeDepth;
    });
    treeModels.set(name, m.root);
  }
  for (const t of placeTrees()) {
    const tree = treeModels.get(t.model)!.clone(true);
    tree.position.set(t.x, 0, t.z);
    tree.rotation.y = t.rotation;
    tree.scale.setScalar(t.scale);
    scene.add(tree);
  }

  const turbines = {} as Record<Faction3D, Model3D>;
  const runners = {} as Record<Faction3D, Runner>;
  for (const faction of ['armada', 'cortex'] as const) {
    const t = TURBINE[faction];
    const turbine = buildModel(await loadJson<ModelJson>(`model-${t.model}`), unitMaterial(t.tex));
    turbine.root.position.set(TURBINE_POS.x, 0, TURBINE_POS.z);
    turbine.pieces.get(t.yaw)!.rotation.y = (TURBINE_YAW_DEG + TURBINE_FLIP_DEG[faction]) * DEG;
    scene.add(turbine.root);
    turbines[faction] = turbine;

    const unit = RUNNER[faction];
    const model = buildModel(await loadJson<ModelJson>(`model-${unit}`), unitMaterial(t.tex));
    scene.add(model.root);
    const death = await loadJson<UnitDeath>(`death-${unit}`);
    const wreck = death.corpse && death.corpseTexture ? buildModel(await loadJson<ModelJson>(death.corpse), unitMaterial(death.corpseTexture)) : null;
    runners[faction] = {
      model,
      walk: await loadJson<WalkData>(`walk-${unit}`),
      speed: UNIT_SPEED[unit],
      death: new UnitDeathPlayer(scene, model, death, wreck, fxLibrary),
      spawnMs: 0,
      lastMs: 0,
      place: null,
      walkMs: 0
    };
  }

  // Greenest Fields mapinfo: unit ambient 0.66, diffuse ~0.99; ground ambient 0.55, diffuse 0.96
  const ambient = new AmbientLight(0xe9ecff, 1.9);
  const sun = new DirectionalLight(0xfff4dc, 2.9);
  sun.position.set(SUN_DIR.x * 1500, SUN_DIR.y * 1500, SUN_DIR.z * 1500);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1000, right: 1000, top: 1000, bottom: -1000, near: 10, far: 4000 });
  sun.shadow.bias = -0.0006;
  scene.add(ambient, sun, sun.target);

  const camera = new PerspectiveCamera(CAMERA.fovDeg, 16 / 10, 10, 4000);
  camera.position.set(CAMERA.position.x, CAMERA.position.y, CAMERA.position.z);
  camera.lookAt(CAMERA.target.x, CAMERA.target.y, CAMERA.target.z);

  const lut = samplePath3d(1200);
  const fx = new FxPoints();
  scene.add(fx.object);

  return {
    scene,
    camera,
    update(faction, ms, still) {
      for (const f of ['armada', 'cortex'] as const) {
        turbines[f].root.visible = f === faction;
        // the active unit's visibility comes from its walk or its death (hidden once it has exploded)
        if (f !== faction) runners[f].model.root.visible = false;
      }
      const t = TURBINE[faction];
      turbines[faction].pieces.get(t.rotor)!.rotation.z = still ? 0 : -((ms / 1000) * ROTOR_SPEED_DEG * DEG);

      const runner = runners[faction];
      if (ms < runner.lastMs) {
        // the faction was switched or the scene restarted
        runner.death.reset();
        runner.spawnMs = 0;
      }
      runner.lastMs = ms;
      runner.death.update(ms);
      fx.update(runner.death.particles());
      if (runner.death.dying) {
        runner.place = null;
        runner.model.root.visible = !runner.death.exploded;
        const back = runner.death.respawnAt;
        if (back === null || ms < back) return;
        runner.death.revive();
        runner.spawnMs = ms;
      }

      const speed = runner.speed * TIME_SCALE;
      const passMs = (lut.length / speed) * 1000;
      const cycle = still ? 0 : Math.max(0, ms - runner.spawnMs) % (passMs + PASS_PAUSE_MS);
      const at = still ? 0.42 : cycle / passMs;
      runner.model.root.visible = at <= 1;
      if (at > 1) {
        runner.place = null;
        return;
      }
      const p = lut.points[Math.min(lut.points.length - 1, Math.round(at * (lut.points.length - 1)))]!;
      runner.model.root.position.set(p.x, 0, p.z);
      runner.model.root.rotation.y = p.heading;
      runner.walkMs = still ? 0 : cycle * TIME_SCALE;
      runner.place = still ? null : { x: p.x, z: p.z, heading: p.heading };
      applyPose(runner.model, runner.walk, runner.walkMs);
    },
    runnerScreen(faction) {
      const runner = runners[faction];
      if (!runner.place || runner.death.dying) return null;
      const c = new Vector3(runner.place.x, runner.model.height / 2, runner.place.z).project(camera);
      return { x: c.x, y: c.y };
    },
    hitRunner(faction, ndcX, ndcY) {
      const runner = runners[faction];
      if (!runner.place || runner.death.dying) return false;
      const centre = new Vector3(runner.place.x, runner.model.height / 2, runner.place.z).project(camera);
      const edge = new Vector3(runner.place.x, runner.model.height, runner.place.z).project(camera);
      // generous: at least the unit's height on screen, so the moving unit is easy to hit
      const reach = Math.max(0.05, Math.abs(edge.y - centre.y) * 1.6);
      return Math.hypot((ndcX - centre.x) * camera.aspect, ndcY - centre.y) <= reach;
    },
    kill(faction, ms) {
      const runner = runners[faction];
      if (!runner.place || runner.death.dying) return false;
      runner.death.kill(ms, runner.place, walkPose(runner.walk, runner.walkMs));
      return true;
    },
    setTargetHeight(height) {
      fx.setPixelScale(height, camera.projectionMatrix.elements[5]!);
    },
    dispose() {
      scene.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      [armTex, corTex, treeTex, groundTex, armWreckTex, corWreckTex].forEach((tex) => tex!.dispose());
      fx.dispose();
      ramp.dispose();
    }
  };
}
