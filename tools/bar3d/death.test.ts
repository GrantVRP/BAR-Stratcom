import { describe, expect, it } from 'vitest';
import { readLuaTable } from './lua-table';
import { cegNum, cegToFx, colormap, withTypeLayers } from './ceg';
import { parseDeathAnim, parseKilled } from './bos-anim';
import { explosionGenerator, fireCounts, fxLibrary, unitDeath, unitDeathFacts } from './death-assets';

// Synthetic files shaped like BAR's effects/*.lua, units/*.lua, weapons/Unit_Explosions.lua and *.bos.
const GENERIC = `local root = "genericunitexplosion"
local definitions = {
	[root .. "-tiny"] = {
		groundflash = {
			class = [[CSimpleGroundFlash]],
			count = 1,
			ground = true,
			properties = { colormap = [[1 0.7 0.3 0.2   0 0 0 0.01]], size = 58, sizegrowth = -0.5, ttl = 20 },
		},
		smoke = {
			class = [[CSimpleParticleSystem]],
			count = 1,
			ground = 1, -- numbers count as true
			properties = { numparticles = [[1 r1]], particlelife = 16, emitvector = [[0, 1, 0]], gravity = [[0, -0.3, 0]], texture = [[bigexplosmoke]] },
		},
		water_only = { class = [[CSimpleParticleSystem]], ground = false, properties = {} },
	},
}
local types = {
	fire = {
		groundfire = { class = [[CExpGenSpawner]], count = 5, ground = true, properties = { delay = [[1 r6]], explosiongenerator = [[custom:burnblack]], pos = [[-9 r18, 2, -9 r18]] } },
	},
}
for t, effects in pairs(types) do
	if size == "tiny" then
		definitions[root .. "-" .. size .. "-" .. t].groundfire.count = 2
		definitions[root .. "-" .. size .. "-" .. t].groundfire.properties.delay = [[1 r3]]
		definitions[root .. "-" .. size .. "-" .. t].groundfire.properties.pos = [[-3 r6, 2, -3 r6]]
	elseif size == "small" then
	end
end`;
const BURN = `return {
	burnblack = { flame = { class = [[CSimpleParticleSystem]], ground = true, properties = { numparticles = 1, texture = [[BARFlame02]],
		color = { [1] = 0.8, [2] = 0.1, [3] = 0 } } } },
}`;
const UNIT = `return {
	testbot = {
		corpse = "DEAD",
		explodeas = "tinyExplosionGeneric",
		featuredefs = {
			dead = { object = "Units/testbot_dead.s3o", featuredead = "HEAP" },
			heap = { object = "Units/arm2X2E.s3o" },
		},
	},
}`;
const EXPLOSIONS = `local impulsefactor = 0.123
local unitDeaths = {
	tinyExplosionGeneric = { impulsefactor = impulsefactor, explosiongenerator = "custom:genericunitexplosion-tiny" },
}
return lowerkeys(unitDeaths)`;
const BOS = `piece pelvis, torso, lleg;
DeathAnim() {// Created by Skeletor
	call-script StopWalking();
		if (TRUE) { //Frame:10
		sleep 296;
		}
		if (TRUE) { //Frame:12
			turn torso to x-axis <-14.7> speed <220.5> ;
			turn torso to x-axis <-18.2> speed <273.7> ;
			move pelvis to y-axis [1.7] speed [26.1] ;
			explode lleg type FALL|SMOKE|FIRE|NOHEATCLOUD;
			hide lleg;
		sleep 65;
		}
}
Killed(severity, corpsetype)
{
	if( severity <= 25 )
	{
		call-script DeathAnim();
		corpsetype = 1;
		return (corpsetype);
	}
	if( severity <= 50 )
	{
		corpsetype = 2 ;
		explode torso type FIRE | SMOKE | FALL | NOHEATCLOUD;
		return(corpsetype);
	}
	corpsetype = 3 ;
		explode pelvis type EXPLODE_ON_HIT | FIRE | SMOKE | FALL | NOHEATCLOUD;
	return corpsetype;
}`;

describe('Lua data tables', () => {
  it('reads nested tables, string forms, numbers, booleans, concatenated and numeric keys', () => {
    const t = readLuaTable(GENERIC, 'local definitions =', { root: 'genericunitexplosion' });
    const tiny = t['genericunitexplosion-tiny'] as Record<string, Record<string, unknown>>;
    expect(Object.keys(tiny)).toEqual(['groundflash', 'smoke', 'water_only']);
    expect(tiny.groundflash!.count).toBe(1);
    expect((tiny.groundflash!.properties as Record<string, unknown>).sizegrowth).toBe(-0.5);
    const burn = readLuaTable(BURN, 'return');
    expect(((burn.burnblack as Record<string, Record<string, Record<string, unknown>>>).flame!.properties!.color as Record<string, number>)['2']).toBe(0.1);
    // unknown variables read as nil
    expect(readLuaTable(EXPLOSIONS, 'local unitDeaths =').tinyExplosionGeneric).toMatchObject({ impulsefactor: null });
    expect(() => readLuaTable('x = 1', 'local nothing =')).toThrow('not found');
  });
});

describe('CEG to particle specs', () => {
  it('evaluates CEG number strings and colormaps', () => {
    expect(cegNum('-3 r6')).toEqual({ base: -3, rand: [6] });
    expect(cegNum('1.2 d+0.8 r2.99')).toEqual({ base: 1.2, rand: [2.99] });
    expect(cegNum(5)).toEqual({ base: 5, rand: [] });
    expect(colormap('1 0.7 0.3 0.2   0 0 0 0.01')).toEqual([
      [1, 0.7, 0.3, 0.2],
      [0, 0, 0, 0.01]
    ]);
  });

  it('keeps the ground layers with their class, and merges the fire type with its counts', () => {
    const t = readLuaTable(GENERIC, 'local definitions =', { root: 'genericunitexplosion' });
    const fx = cegToFx('tiny', t['genericunitexplosion-tiny'] as never);
    expect(fx.layers.map((l) => [l.name, l.kind])).toEqual([
      ['groundflash', 'groundflash'],
      ['smoke', 'particles']
    ]);
    const types = readLuaTable(GENERIC, 'local types =');
    const counts = fireCounts(GENERIC, 'tiny');
    expect(counts).toEqual({ groundfire: { count: 2, delay: '1 r3', pos: '-3 r6, 2, -3 r6' } });
    const merged = cegToFx('tiny-fire', withTypeLayers(t['genericunitexplosion-tiny'] as never, types.fire as never, counts));
    expect(merged.layers.find((l) => l.kind === 'spawn')).toMatchObject({ count: 2, effect: 'burnblack', delay: { base: 1, rand: [3] } });
  });

  it('builds a library with the effects a death spawns', () => {
    const lib = fxLibrary(['genericunitexplosion-tiny-fire'], GENERIC, BURN);
    expect(Object.keys(lib).sort()).toEqual(['burnblack', 'genericunitexplosion-tiny-fire']);
    expect(() => fxLibrary(['nope'], GENERIC, BURN)).toThrow('not found');
  });
});

describe('death scripts and unit defs', () => {
  it('reads DeathAnim blocks with timings, last-wins targets, explodes and hides', () => {
    const blocks = parseDeathAnim(BOS)!;
    expect(blocks.map((b) => [b.frame, b.ms])).toEqual([
      [10, 296],
      [12, 65]
    ]);
    expect(blocks[1]).toMatchObject({
      turn: { torso: { x: -18.2 } },
      move: { pelvis: { y: 1.7 } },
      explode: [{ piece: 'lleg', flags: ['FALL', 'SMOKE', 'FIRE', 'NOHEATCLOUD'] }],
      hide: ['lleg']
    });
    expect(parseDeathAnim('piece a;')).toBeNull();
  });

  it('reads Killed() branches by severity', () => {
    expect(parseKilled(BOS).map((b) => [b.maxSeverity, b.corpseType, b.deathAnim, b.explodes.map((e) => e.piece)])).toEqual([
      [25, 1, true, []],
      [50, 2, false, ['torso']],
      [Number.POSITIVE_INFINITY, 3, false, ['pelvis']]
    ]);
  });

  it('follows the unit def to the death explosion and the wreck model', () => {
    expect(unitDeathFacts('testbot', UNIT, 1)).toEqual({ explodeAs: 'tinyExplosionGeneric', wreckModel: 'testbot_dead' });
    expect(unitDeathFacts('testbot', UNIT, 2).wreckModel).toBe('arm2X2E');
    expect(unitDeathFacts('testbot', UNIT, 3).wreckModel).toBeNull();
    expect(explosionGenerator('TINYEXPLOSIONGENERIC', EXPLOSIONS)).toBe('genericunitexplosion-tiny');
    const { death, wreckModel } = unitDeath('testbot', { bos: BOS, unitDefLua: UNIT, unitExplosionsLua: EXPLOSIONS });
    expect(wreckModel).toBe('testbot_dead');
    expect(death).toMatchObject({ corpse: 'model-testbot_dead', fx: 'genericunitexplosion-tiny', explodes: [] });
    expect(death.anim).toHaveLength(2);
  });
});
