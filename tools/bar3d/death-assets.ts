/**
 * Launch-scene death assets from BAR's files: for the Sprinter and the
 * Fiend, the Killed() branch of a light hit (severity ≤ 25: what a unit usually leaves, a wreck), the
 * Sprinter's keyframed DeathAnim(), the death explosion named by the unit def (explodeas → weapon →
 * CEG) and the wreck model named by its corpse feature.
 */
import type { FxLibrary } from '../../src/core/launch/fx';
import type { UnitDeath } from '../../src/core/launch/death3d';
import { parseDeathAnim, parseKilled } from './bos-anim';
import { cegToFx, withTypeLayers } from './ceg';
import { readLuaTable, type LuaTable } from './lua-table';

/** The severity the launch scene kills with: BAR's lightest death branch (≤ 25). */
export const LAUNCH_DEATH_SEVERITY = 20;
const CORPSE_FEATURE: Record<number, string> = { 1: 'dead', 2: 'heap' };

export interface DeathSources {
  bos: string;
  unitDefLua: string;
  unitExplosionsLua: string;
}

/** Unit def facts: the death explosion weapon and the wreck model file. */
export function unitDeathFacts(unit: string, unitDefLua: string, corpseType: number): { explodeAs: string; wreckModel: string | null } {
  const def = readLuaTable(unitDefLua, 'return')[unit] as LuaTable;
  const feature = CORPSE_FEATURE[corpseType];
  const featureDefs = (def.featuredefs ?? {}) as Record<string, LuaTable>;
  const object = feature ? featureDefs[feature]?.object : undefined;
  return {
    explodeAs: String(def.explodeas),
    wreckModel: typeof object === 'string' ? object.replace(/^Units\//i, '').replace(/\.s3o$/i, '') : null
  };
}

/** explodeas weapon → its CEG name (Unit_Explosions.lua keys are lower-cased by the game). */
export function explosionGenerator(weapon: string, unitExplosionsLua: string): string {
  const deaths = readLuaTable(unitExplosionsLua, 'local unitDeaths =', { impulsefactor: '0' });
  const entry = Object.entries(deaths).find(([k]) => k.toLowerCase() === weapon.toLowerCase())?.[1] as LuaTable | undefined;
  if (!entry) throw new Error(`No unit explosion "${weapon}"`);
  return String(entry.explosiongenerator).replace(/^custom:/, '');
}

export function unitDeath(unit: string, src: DeathSources): { death: UnitDeath; wreckModel: string | null } {
  const branch = parseKilled(src.bos).find((b) => LAUNCH_DEATH_SEVERITY <= b.maxSeverity);
  if (!branch) throw new Error(`${unit}: no Killed() branch for severity ${LAUNCH_DEATH_SEVERITY}`);
  const facts = unitDeathFacts(unit, src.unitDefLua, branch.corpseType);
  const anim = branch.deathAnim ? parseDeathAnim(src.bos) : null;
  return {
    death: {
      anim: anim?.map((b) => ({ ms: b.ms, turn: b.turn, move: b.move, explode: b.explode, hide: b.hide })) ?? null,
      explodes: branch.explodes,
      corpse: facts.wreckModel ? `model-${facts.wreckModel}` : null,
      corpseTexture: null, // set by the build from the wreck model's texture
      fx: explosionGenerator(facts.explodeAs, src.unitExplosionsLua)
    },
    wreckModel: facts.wreckModel
  };
}

/** "<size>-fire" counts are set in a Lua loop: read them for one size from the loop body. */
export function fireCounts(genericLua: string, size: string): Record<string, { count: number; delay: string; pos: string }> {
  const start = genericLua.indexOf(`size == "${size}" then`);
  if (start < 0) return {};
  const next = genericLua.indexOf('elseif', start + 10);
  const block = genericLua.slice(start, next < 0 ? undefined : next);
  const out: Record<string, { count: number; delay: string; pos: string }> = {};
  for (const m of block.matchAll(/\]\.(\w+)\.count = (\d+)/g)) out[m[1]!] = { count: Number(m[2]), delay: '', pos: '' };
  for (const m of block.matchAll(/\]\.(\w+)\.properties\.delay = \[\[(.*?)\]\]/g)) if (out[m[1]!]) out[m[1]!]!.delay = m[2]!;
  for (const m of block.matchAll(/\]\.(\w+)\.properties\.pos = \[\[(.*?)\]\]/g)) if (out[m[1]!]) out[m[1]!]!.pos = m[2]!;
  return out;
}

/** The CEGs the deaths need, as particle specs (spawned sub-effects such as burnblack included). */
export function fxLibrary(names: string[], genericLua: string, burnLua: string): FxLibrary {
  const generic = readLuaTable(genericLua, 'local definitions =', { root: 'genericunitexplosion' });
  const types = readLuaTable(genericLua, 'local types =');
  const burn = readLuaTable(burnLua, 'return');
  const lib: FxLibrary = {};
  const add = (name: string): void => {
    if (lib[name]) return;
    let def: LuaTable | undefined;
    const m = /^genericunitexplosion-(\w+?)(?:-(\w+))?$/.exec(name);
    if (m) {
      const size = generic[`genericunitexplosion-${m[1]}`] as LuaTable | undefined;
      const type = m[2] ? (types[m[2]] as LuaTable | undefined) : undefined;
      def = size && type ? withTypeLayers(size, type, fireCounts(genericLua, m[1]!)) : size;
    } else def = burn[name] as LuaTable | undefined;
    if (!def) throw new Error(`Effect "${name}" not found`);
    lib[name] = cegToFx(name, def);
    for (const l of lib[name]!.layers) if (l.kind === 'spawn' && l.effect) add(l.effect);
  };
  names.forEach(add);
  return lib;
}
