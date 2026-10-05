import { MeshBasicMaterial, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import type { UnitDeath } from '../../../../core/launch/death3d';
import type { FxLibrary } from '../../../../core/launch/fx';
import { buildModel, type ModelJson } from './model3d';
import { UnitDeathPlayer } from './runner-death';

function b64(arr: Float32Array | Uint16Array): string {
  let s = '';
  for (const b of new Uint8Array(arr.buffer)) s += String.fromCharCode(b);
  return btoa(s);
}
const tri = b64(new Float32Array([0, 0, 0, 0, 1, 0, 0.5, 0.5, 10, 0, 0, 0, 1, 0, 1, 0, 0, 10, 0, 0, 1, 0, 0, 1]));
const idx = b64(new Uint16Array([0, 1, 2]));
// Synthetic unit (test-only): a pelvis with a leg; and a one-piece wreck
const unitJson: ModelJson = {
  height: 30,
  radius: 15,
  pieces: [
    { name: 'pelvis', parent: null, offset: [0, 15, 0], v: tri, i: idx, i32: false },
    { name: 'lleg', parent: 'pelvis', offset: [3, -5, 0], v: tri, i: idx, i32: false }
  ]
};
const wreckJson: ModelJson = { height: 7, radius: 20, pieces: [{ name: 'root', parent: null, offset: [0, 0, 0], v: tri, i: idx, i32: false }] };
const fx: FxLibrary = {
  boom: { name: 'boom', layers: [{ name: 'flash', kind: 'groundflash', shape: 'blob', count: 1, colormap: [[1, 0.7, 0.3, 0.2]], pos: [{ base: 0, rand: [] }, { base: 0, rand: [] }, { base: 0, rand: [] }], size: { base: 40, rand: [] }, sizeGrowth: { base: 0, rand: [] }, ttl: { base: 30, rand: [] } }] }
};
const death: UnitDeath = {
  anim: [
    { ms: 300, turn: {}, move: {}, explode: [], hide: [] },
    { ms: 200, turn: { pelvis: { x: -30 } }, move: {}, explode: [{ piece: 'lleg', flags: ['FALL', 'FIRE'] }], hide: ['lleg'] }
  ],
  explodes: [],
  corpse: 'model-wreck',
  corpseTexture: 'tex-wreck',
  fx: 'boom'
};

function setup(): { scene: Scene; player: UnitDeathPlayer; unit: ReturnType<typeof buildModel>; wreck: ReturnType<typeof buildModel> } {
  const scene = new Scene();
  const unit = buildModel(unitJson, new MeshBasicMaterial());
  const wreck = buildModel(wreckJson, new MeshBasicMaterial());
  scene.add(unit.root);
  return { scene, player: new UnitDeathPlayer(scene, unit, death, wreck, fx), unit, wreck };
}

describe('launch scene unit death (owner request)', () => {
  it('starts the collapse on the click (idle lead-in skipped), breaks the leg off, then explodes into the wreck', () => {
    const { scene, player, unit, wreck } = setup();
    expect(wreck.root.visible).toBe(false);
    player.kill(1000, { x: 50, z: -20, heading: 1 }, { turn: {}, move: {} });
    expect(player.dying).toBe(true);
    // the 300 ms idle block is skipped: 200 ms of animation, then 3 s until the next unit
    expect(player.respawnAt).toBe(1000 + 200 + 3000);

    player.update(1050);
    expect(unit.pieces.get('lleg')!.visible).toBe(false);
    expect(unit.pieces.get('pelvis')!.rotation.x).toBeLessThan(0);
    expect(scene.children.length).toBeGreaterThan(2); // the leg flies as a separate object
    expect(player.exploded).toBe(false);

    player.update(1220);
    expect(player.exploded).toBe(true);
    expect(unit.root.visible).toBe(false);
    expect(wreck.root.visible).toBe(true);
    expect([wreck.root.position.x, wreck.root.position.z, wreck.root.rotation.y]).toEqual([50, -20, 1]);
    expect(player.particles().some((p) => p.flat)).toBe(true);
  });

  it('a second click while dying changes nothing; revive brings the unit back, reset clears the wreck', () => {
    const { player, unit, wreck } = setup();
    player.kill(0, { x: 0, z: 0, heading: 0 }, { turn: {}, move: {} });
    player.kill(100, { x: 9, z: 9, heading: 0 }, { turn: {}, move: {} });
    expect(player.respawnAt).toBe(3200);
    player.update(600);
    player.revive();
    expect(player.dying).toBe(false);
    expect(unit.pieces.get('lleg')!.visible).toBe(true);
    expect(wreck.root.visible).toBe(true); // the wreck stays where it fell
    player.reset();
    expect(wreck.root.visible).toBe(false);
  });
});
