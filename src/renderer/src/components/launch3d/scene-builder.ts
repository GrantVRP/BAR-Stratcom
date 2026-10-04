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
import { loadJson, loadTexture } from './assets3d';
import { buildModel, type Model3D, type ModelJson } from './model3d';

export type Faction3D = 'armada' | 'cortex';

const DEG = Math.PI / 180;
/** BAR script angle signs in three.js space (y and z turn the other way). */
export const AXIS_SIGN = { x: 1, y: -1, z: -1 } as const;
const RUNNER: Record<Faction3D, 'armfast' | 'corpyro'> = { armada: 'armfast', cortex: 'corpyro' };
const TURBINE: Record<Faction3D, { model: string; yaw: string; rotor: string; tex: string }> = {
  armada: { model: 'armwin', yaw: 'turbine', rotor: 'blades', tex: 'tex-arm' },
  cortex: { model: 'corwin', yaw: 'cradle', rotor: 'fan', tex: 'tex-cor' }
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
}

export interface LaunchWorld {
  scene: Scene;
  camera: PerspectiveCamera;
  /** Advance to `ms` since the faction was shown; `still` freezes the runner by the turbine. */
  update(faction: Faction3D, ms: number, still: boolean): void;
  dispose(): void;
}

function applyPose(model: Model3D, walk: WalkData, ms: number): void {
  const pose = walkPose(walk, ms);
  for (const [name, group] of model.pieces) {
    const turn = pose.turn[name];
    group.rotation.set((turn?.x ?? 0) * DEG * AXIS_SIGN.x, (turn?.y ?? 0) * DEG * AXIS_SIGN.y, (turn?.z ?? 0) * DEG * AXIS_SIGN.z);
    const rest = model.rest.get(name)!;
    const move = pose.move[name];
    group.position.set(rest[0] + (move?.x ?? 0) * -1, rest[1] + (move?.y ?? 0), rest[2] + (move?.z ?? 0));
  }
}

export async function buildLaunchWorld(): Promise<LaunchWorld> {
  const ramp = toonRamp();
  const [armTex, corTex, treeTex, groundTex] = await Promise.all(
    ['tex-arm', 'tex-cor', 'tex-tree', 'tex-ground'].map((n) => loadTexture(n))
  );
  const textures: Record<string, Texture> = { 'tex-arm': armTex!, 'tex-cor': corTex! };
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
    runners[faction] = { model, walk: await loadJson<WalkData>(`walk-${unit}`), speed: UNIT_SPEED[unit] };
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

  return {
    scene,
    camera,
    update(faction, ms, still) {
      for (const f of ['armada', 'cortex'] as const) {
        turbines[f].root.visible = f === faction;
        runners[f].model.root.visible = f === faction;
      }
      const t = TURBINE[faction];
      turbines[faction].pieces.get(t.rotor)!.rotation.z = still ? 0 : -((ms / 1000) * ROTOR_SPEED_DEG * DEG);

      const runner = runners[faction];
      const speed = runner.speed * TIME_SCALE;
      const passMs = (lut.length / speed) * 1000;
      const cycle = still ? 0 : Math.max(0, ms) % (passMs + PASS_PAUSE_MS);
      const at = still ? 0.42 : cycle / passMs;
      runner.model.root.visible = at <= 1;
      if (at > 1) return;
      const p = lut.points[Math.min(lut.points.length - 1, Math.round(at * (lut.points.length - 1)))]!;
      runner.model.root.position.set(p.x, 0, p.z);
      runner.model.root.rotation.y = p.heading;
      applyPose(runner.model, runner.walk, still ? 0 : cycle * TIME_SCALE);
    },
    dispose() {
      scene.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      [armTex, corTex, treeTex, groundTex].forEach((tex) => tex!.dispose());
      ramp.dispose();
    }
  };
}
