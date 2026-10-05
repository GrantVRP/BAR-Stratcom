/**
 * Turns BAR CEG (custom explosion generator) definitions into the launch scene's particle specs
 * (src/core/launch/fx.ts). Spring units are kept: elmos, frames (30 per second).
 */
import type { CegNum, FxLayer, FxSpec } from '../../src/core/launch/fx';
import type { LuaTable, LuaValue } from './lua-table';

/** "a rB c rD" → base a + c, random terms B and D (each 0..term). Other CEG operators count as 0. */
export function cegNum(v: LuaValue | undefined, fallback = 0): CegNum {
  if (typeof v === 'number') return { base: v, rand: [] };
  if (typeof v !== 'string') return { base: fallback, rand: [] };
  const out: CegNum = { base: 0, rand: [] };
  for (const tok of v.trim().split(/\s+/)) {
    if (/^-?[\d.]+$/.test(tok)) out.base += Number(tok);
    else if (/^r-?[\d.]+$/.test(tok)) out.rand.push(Number(tok.slice(1)));
  }
  return out;
}

/** "x, y, z" (each a CEG number expression). */
export function cegVec(v: LuaValue | undefined): [CegNum, CegNum, CegNum] {
  const parts = typeof v === 'string' ? v.split(',') : [];
  return [cegNum(parts[0]), cegNum(parts[1]), cegNum(parts[2])];
}

/** A colormap string: RGBA quadruples spread evenly over the particle's life. */
export function colormap(v: LuaValue | undefined): number[][] {
  const nums = typeof v === 'string' ? v.trim().split(/\s+/).map(Number) : [];
  const out: number[][] = [];
  for (let i = 0; i + 3 < nums.length; i += 4) out.push(nums.slice(i, i + 4));
  return out.length > 0 ? out : [[1, 1, 1, 0]];
}

const on = (v: LuaValue | undefined): boolean => v === true || (typeof v === 'number' && v !== 0);

function shapeOf(name: string, props: LuaTable): FxLayer['shape'] {
  const tex = String(props.texture ?? props.fronttexture ?? '');
  if (/shard/.test(tex)) return 'shard';
  if (/explosionwave/.test(tex)) return 'ring';
  return /spark|gunshot/.test(`${name} ${tex}`) ? 'spark' : 'blob';
}

/** The layers of one CEG that show on ground impacts (BAR deaths on land). */
export function cegToFx(name: string, def: LuaTable): FxSpec {
  const layers: FxLayer[] = [];
  for (const [layerName, raw] of Object.entries(def)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const layer = raw as LuaTable;
    if (!on(layer.ground)) continue;
    const p = (layer.properties ?? {}) as LuaTable;
    const count = typeof layer.count === 'number' ? layer.count : 1;
    const common = { name: layerName, count, colormap: colormap(p.colormap), pos: cegVec(p.pos) };
    switch (layer.class) {
      case 'CSimpleParticleSystem':
        layers.push({
          ...common,
          kind: 'particles',
          shape: shapeOf(layerName, p),
          numParticles: cegNum(p.numparticles, 1),
          life: cegNum(p.particlelife, 10),
          lifeSpread: cegNum(p.particlelifespread),
          size: cegNum(p.particlesize, 1),
          sizeSpread: cegNum(p.particlesizespread),
          sizeGrowth: cegNum(p.sizegrowth),
          sizeMod: typeof p.sizemod === 'number' ? p.sizemod : 1,
          speed: cegNum(p.particlespeed),
          speedSpread: cegNum(p.particlespeedspread),
          emitRot: cegNum(p.emitrot),
          emitRotSpread: cegNum(p.emitrotspread),
          emitVector: cegVec(p.emitvector ?? '0, 1, 0'),
          gravity: cegVec(p.gravity),
          airDrag: typeof p.airdrag === 'number' ? p.airdrag : 1
        });
        break;
      case 'CSimpleGroundFlash':
        layers.push({ ...common, kind: 'groundflash', shape: 'blob', size: cegNum(p.size, 10), sizeGrowth: cegNum(p.sizegrowth), ttl: cegNum(p.ttl, 10) });
        break;
      case 'CBitmapMuzzleFlame':
        layers.push({
          ...common,
          kind: 'flame',
          shape: shapeOf(layerName, p),
          size: cegNum(p.size, 1),
          sizeGrowth: cegNum(p.sizegrowth),
          ttl: cegNum(p.ttl, 10),
          length: cegNum(p.length, 10),
          emitVector: cegVec(p.dir ?? '0, 1, 0')
        });
        break;
      case 'CHeatCloudProjectile':
        layers.push({
          ...common,
          kind: 'heatcloud',
          shape: 'blob',
          size: cegNum(p.size, 1),
          sizeGrowth: cegNum(p.sizegrowth),
          heat: cegNum(p.heat, 10),
          maxHeat: cegNum(p.maxheat, 10),
          heatFalloff: cegNum(p.heatfalloff, 1)
        });
        break;
      case 'CExpGenSpawner':
        layers.push({
          ...common,
          kind: 'spawn',
          shape: 'blob',
          delay: cegNum(p.delay),
          effect: String(p.explosiongenerator ?? '').replace(/^custom:/, '')
        });
        break;
      default:
        break; // other classes are not used by these deaths
    }
  }
  return { name, layers };
}

/** genericunitexplosion "<size>-<type>" variants are the size def merged with the type's layers. */
export function withTypeLayers(sizeDef: LuaTable, typeLayers: LuaTable, counts: Record<string, { count: number; delay: string; pos: string }>): LuaTable {
  const merged: LuaTable = { ...sizeDef };
  for (const [name, layer] of Object.entries(typeLayers)) {
    if (typeof layer !== 'object' || layer === null) continue;
    const l = structuredClone(layer) as LuaTable;
    const c = counts[name];
    if (c) {
      l.count = c.count;
      const props = (l.properties ?? {}) as LuaTable;
      props.delay = c.delay;
      props.pos = c.pos;
      l.properties = props;
    }
    merged[name] = l;
  }
  return merged;
}
