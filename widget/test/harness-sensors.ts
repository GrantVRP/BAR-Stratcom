import type { LuaEngine } from 'wasmoon';
import type { Scenario, ScenarioUnit } from './scenario';

/**
 * The gl drawing mock (every call recorded in order) with the engine's return values
 * (engine-facts.md): Texture is true when bound ('#'.. a known unitDefID, or false to unbind);
 * GetTextWidth answers for size 1 (stand-in metric: 0.5 per character); CreateList runs its function
 * while "recording" and returns a list index (> 0); CallList and DeleteList only record.
 */
export function installGlMocks(engine: LuaEngine, record: (name: string, args: unknown[]) => void): void {
  engine.global.set('__record_draw_call', record);
  engine.doStringSync(`
    gl = {}
    local glMethods = {
      "Color", "Text", "Rect", "BeginText", "EndText", "TexRect", "CallList", "DeleteList",
      "PushMatrix", "PopMatrix", "Translate", "Scale", "LineWidth", "Shape"
    }
    for _, name in ipairs(glMethods) do
      gl[name] = function(...)
        __record_draw_call(name, { ... })
      end
    end
    gl.Texture = function(arg)
      __record_draw_call("Texture", { arg })
      local id = type(arg) == "string" and arg:sub(1, 1) == "#" and tonumber(arg:sub(2))
      return type(arg) == "boolean" or (id and UnitDefs[id] ~= nil) or false
    end
    gl.GetTextWidth = function(text) return #tostring(text) * 0.5 end
    local nextList = 0
    gl.CreateList = function(fn, ...)
      nextList = nextList + 1
      __record_draw_call("CreateList", { nextList })
      fn(...)
      return nextList
    end
  `);
}

const isEnemy = (scenario: Scenario, u: ScenarioUnit): boolean =>
  (scenario.teams.get(u.teamId)?.allyTeamId ?? u.teamId) !== scenario.myAllyTeamId;

/** What the local player knows about a unit: allies always; enemies by their scenario `sensor`. */
function sensorOf(scenario: Scenario, u: ScenarioUnit): NonNullable<ScenarioUnit['sensor']> {
  return isEnemy(scenario, u) ? (u.sensor ?? 'los') : 'los';
}

/**
 * Line of sight and radar, shaped like the engine for a player (Recoil LuaSyncedRead/LuaUtils,
 * engine-facts.md): GetAllUnits lists own and allied units plus enemies in LOS or radar;
 * GetUnitLosState answers { los, radar, typed }; GetUnitDefID is nil for an unidentified radar blip;
 * a hidden enemy has no position (radar error is left out: positions are exact here);
 * GetTeamStartPosition answers for allied teams. Must run after the Spring bootstrap and before the
 * widget source is loaded (the widget keeps local aliases).
 */
export function installSensorMocks(engine: LuaEngine, scenario: Scenario): void {
  engine.global.set('__sp_get_all_units', () =>
    Array.from(scenario.units.values())
      .filter((u) => sensorOf(scenario, u) !== 'hidden')
      .map((u) => u.id)
  );
  engine.global.set('__sp_get_unit_los_state', (unitId: number) => {
    const u = scenario.units.get(unitId);
    const sensor = u ? sensorOf(scenario, u) : 'hidden';
    if (sensor === 'hidden') return undefined;
    // [los, radar, typed]; the Lua side builds the engine's table
    if (sensor === 'los') return [true, false, true];
    return sensor === 'radar-typed' ? [false, true, true] : [false, true, false];
  });
  engine.global.set('__sp_get_unit_def_id', (unitId: number) => {
    const u = scenario.units.get(unitId);
    if (!u || u.defId <= 0) return undefined;
    const sensor = sensorOf(scenario, u);
    return sensor === 'hidden' || sensor === 'radar' ? undefined : u.defId;
  });
  engine.global.set('__sp_get_unit_position', (unitId: number) => {
    const u = scenario.units.get(unitId);
    return u && sensorOf(scenario, u) !== 'hidden' ? [u.position.x, u.position.y, u.position.z] : [];
  });
  engine.global.set('__sp_get_team_start_position', (teamId: number) => {
    const team = scenario.teams.get(teamId);
    const pos = team?.startPos;
    if (!team || !pos || team.allyTeamId !== scenario.myAllyTeamId) return [];
    return [pos.x, pos.y, pos.z, true];
  });
  engine.doStringSync(`
    Spring.GetAllUnits = function() return __sp_get_all_units() end
    Spring.GetUnitLosState = function(unitId)
      local r = __sp_get_unit_los_state(unitId)
      if not r then return nil end
      local t = {}
      if r[1] then t.los = true end
      if r[2] then t.radar = true end
      if r[3] then t.typed = true end
      return t
    end
    Spring.GetTeamStartPosition = function(teamId)
      local r = __sp_get_team_start_position(teamId)
      return r[1], r[2], r[3], r[4]
    end
  `);
}
