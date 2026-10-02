import fs from 'node:fs';
import path from 'node:path';
import { LuaFactory, type LuaEngine } from 'wasmoon';
import { InMemoryFs } from './fs';
import { LUA_IO_OS_BOOTSTRAP, LUA_JSON_BOOTSTRAP, LUA_SPRING_BOOTSTRAP } from './lua-bootstrap';
import { createScenario, type Scenario } from './scenario';

export { InMemoryFs };

export interface DrawCall {
  name: string;
  args: unknown[];
}

export interface WidgetHarness {
  engine: LuaEngine;
  scenario: Scenario;
  fs: InMemoryFs;
  callin: (name: string, ...args: unknown[]) => unknown;
  setFrame: (frame: number) => void;
  setTime: (sec: number) => void;
  clearDrawCalls: () => void;
  clearEchoMessages: () => void;
  drawCalls: () => DrawCall[];
  echoMessages: () => string[];
  actions: () => Map<string, unknown>;
  close: () => void;
}

export async function createWidgetHarness(
  scenario: Scenario = createScenario(),
  widgetSource?: string
): Promise<WidgetHarness> {
  const factory = new LuaFactory();
  const engine = await factory.createEngine();

  const inMemFs = new InMemoryFs();
  const recordedDrawCalls: DrawCall[] = [];
  const recordedEchoMessages: string[] = [];
  const recordedActions = new Map<string, unknown>();

  // 1. Shims for Lua 5.1
  engine.doStringSync(`
    unpack = table.unpack
    loadstring = load
    WG = {}
  `);

  // 2. Pure Lua JSON
  engine.doStringSync(LUA_JSON_BOOTSTRAP);

  // 3. Mount in-memory IO and OS
  engine.global.set('__fs_write', (p: string, c: string) => inMemFs.write(p, c));
  engine.global.set('__fs_read', (p: string) => inMemFs.read(p) ?? undefined);
  engine.global.set('__fs_exists', (p: string) => inMemFs.exists(p));
  engine.global.set('__fs_remove', (p: string) => inMemFs.delete(p));
  engine.global.set('__fs_rename', (o: string, n: string) => inMemFs.rename(o, n));
  engine.global.set('__fs_create_dir', (d: string) => inMemFs.createDir(d));

  engine.doStringSync(LUA_IO_OS_BOOTSTRAP);

  // 4. Spring mock with multi-return wrappers
  engine.global.set('__sp_create_dir', (dir: string) => inMemFs.createDir(dir));
  engine.global.set('__sp_get_game_frame', () => scenario.currentFrame);
  engine.global.set('__sp_get_game_seconds', () => scenario.currentFrame / 30);
  engine.global.set('__sp_is_replay', () => scenario.isReplay);
  engine.global.set('__sp_get_spectating_state', () => scenario.isSpectating);
  engine.global.set('__sp_get_my_team_id', () => scenario.myTeamId);
  engine.global.set('__sp_get_my_ally_team_id', () => scenario.myAllyTeamId);
  engine.global.set('__sp_get_my_player_id', () => 0);
  engine.global.set('__sp_get_player_info', (playerId?: number) => {
    const t =
      (playerId !== undefined ? scenario.teams.get(playerId) : undefined) ??
      scenario.teams.get(scenario.myTeamId);
    return [
      t?.playerName ?? scenario.myPlayerName,
      true,
      false,
      t?.teamId ?? scenario.myTeamId,
      t?.allyTeamId ?? scenario.myAllyTeamId
    ];
  });
  engine.global.set('__sp_get_team_resources', (teamId: number, type: string) => {
    const t = scenario.teams.get(teamId);
    if (type === 'metal') {
      return [t?.metal ?? 1000, t?.metalStorage ?? 1000, 0, t?.metalIncome ?? 0, 0, 0, 0, 0];
    }
    return [t?.energy ?? 1000, t?.energyStorage ?? 1000, 0, t?.energyIncome ?? 0, 0, 0, 0, 0];
  });
  engine.global.set('__sp_get_team_rules_param', (teamId: number, param: string) => {
    const t = scenario.teams.get(teamId);
    if (param === 'startUnit') {
      if (t?.startUnit === null) return undefined;
      if (typeof t?.startUnit === 'number') return t.startUnit;
      if (typeof t?.startUnit === 'string') {
        const found = scenario.unitDefsByName.get(t.startUnit.toLowerCase());
        if (found) return found.defId;
      }
      const defaultCom = t?.factionId === 'cortex' ? 'corcom' : 'armcom';
      return scenario.unitDefsByName.get(defaultCom)?.defId ?? 1;
    }
    return undefined;
  });
  engine.global.set('__sp_get_team_units', (teamId: number) => {
    const ids: number[] = [];
    for (const u of scenario.units.values()) {
      if (u.teamId === teamId) ids.push(u.id);
    }
    return ids;
  });
  engine.global.set('__sp_get_team_units_counts_json', (teamId: number) => {
    const counts: Record<number, number> = {};
    for (const u of scenario.units.values()) {
      if (u.teamId === teamId) {
        counts[u.defId] = (counts[u.defId] ?? 0) + 1;
      }
    }
    return JSON.stringify(counts);
  });
  engine.global.set('__sp_get_unit_def_id', (unitId: number) => {
    const defId = scenario.units.get(unitId)?.defId;
    return defId && defId > 0 ? defId : undefined;
  });
  engine.global.set('__sp_get_unit_health', (unitId: number) => {
    const u = scenario.units.get(unitId);
    if (!u) return [0, 0, 0, 0, 0];
    return [u.health, u.maxHealth, 0, 0, u.buildProgress];
  });
  engine.global.set('__sp_get_unit_position', (unitId: number) => {
    const u = scenario.units.get(unitId);
    return u ? [u.position.x, u.position.y, u.position.z] : [0, 0, 0];
  });
  engine.global.set('__sp_get_unit_is_being_built', (unitId: number) => {
    return scenario.units.get(unitId)?.isBeingBuilt ?? false;
  });
  engine.global.set('__sp_get_unit_is_building', (unitId: number) => {
    return scenario.units.get(unitId)?.isUnitBuilding ? 1 : undefined;
  });
  engine.global.set('__sp_get_unit_command_count', (unitId: number) => {
    return scenario.units.get(unitId)?.commandCount ?? 0;
  });
  engine.global.set('__sp_get_factory_commands', (unitId: number) => {
    return scenario.units.get(unitId)?.factoryCommands ?? [];
  });
  engine.global.set('__sp_get_unit_team', (unitId: number) => {
    return scenario.units.get(unitId)?.teamId ?? 0;
  });
  engine.global.set('__sp_get_unit_ally_team', (unitId: number) => {
    const u = scenario.units.get(unitId);
    if (!u) return 0;
    return scenario.teams.get(u.teamId)?.allyTeamId ?? 0;
  });
  engine.global.set('__sp_get_team_list', () => Array.from(scenario.teams.keys()));
  engine.global.set('__sp_get_team_info', (teamId: number) => {
    const t = scenario.teams.get(teamId);
    const leader = t?.isAI ? 0 : teamId;
    return [teamId, leader, false, t?.isAI ?? false, t?.factionId ?? 'armada', t?.allyTeamId ?? 0];
  });
  engine.global.set('__sp_get_ai_info', (teamId: number) => {
    const t = scenario.teams.get(teamId);
    if (!t?.isAI) return undefined;
    const name = t.aiName ?? (t.playerName && t.playerName !== scenario.myPlayerName ? t.playerName : 'BARbarian');
    return [0, name, 0, 'BARb', '1.0', {}];
  });
  engine.global.set('__sp_get_gaia_team_id', () => 999);
  engine.global.set('__sp_get_visible_units', () => Array.from(scenario.units.keys()));
  engine.global.set('__sp_get_unit_current_build_power', (unitId: number) => {
    return scenario.units.get(unitId)?.currentBuildPower ?? 0;
  });
  let currentNowSec = Math.floor(Date.now() / 1000);
  engine.global.set('__os_time', () => currentNowSec);
  engine.global.set('__sp_echo', (text: string) => recordedEchoMessages.push(text));
  engine.global.set('__sp_get_wind', () => [1, 0, 0, (scenario.windMin + scenario.windMax) / 2]);

  engine.doStringSync(LUA_SPRING_BOOTSTRAP);

  // 5. UnitDefs & UnitDefNames pure Lua tables
  const unitDefsMap: Record<string, unknown> = {};

  scenario.unitDefsById.forEach((record, defId) => {
    unitDefsMap[String(defId)] = {
      name: record.id,
      translatedHumanName: record.name,
      translatedTooltip: record.tooltip,
      metalCost: record.metalCost,
      energyCost: record.energyCost,
      buildTime: record.buildTime,
      buildSpeed: record.buildSpeed,
      isBuilder: record.isBuilder,
      isFactory: record.isFactory,
      isBuilding: record.isBuilding,
      canFly: record.canFly,
      canMove: record.canMove,
      speed: record.combat.speed,
      health: record.combat.health,
      maxWeaponRange: record.combat.maxWeaponRange,
      sightDistance: record.combat.sightDistance,
      radarDistance: record.combat.radarDistance,
      energyMake: record.economy.energyMake,
      metalMake: record.economy.metalMake,
      energyUpkeep: record.economy.energyUpkeep,
      metalUpkeep: record.economy.metalUpkeep,
      extractsMetal: record.economy.extractsMetal,
      windGenerator: record.economy.windGenerator,
      tidalGenerator: record.economy.tidalGenerator,
      energyStorage: record.economy.energyStorage,
      metalStorage: record.economy.metalStorage,
      buildOptions: record.buildOptions,
      customParams: {
        techlevel: String(record.techLevel ?? 1),
        unitgroup: record.unitGroup ?? 'other',
        iscommander: record.isCommander ? '1' : '0'
      }
    };
  });

  engine.global.set('__unitdefs_json', JSON.stringify(unitDefsMap));
  engine.doStringSync(`
    UnitDefs = {}
    UnitDefNames = {}
    local rawDefs = Json.decode(__unitdefs_json)
    for defIdStr, def in pairs(rawDefs) do
      local defId = tonumber(defIdStr)
      UnitDefs[defId] = def
      UnitDefNames[def.name:lower()] = def
    end
  `);

  // 6. Game & Engine mocks (native Lua tables)
  engine.global.set(
    '__game_json',
    JSON.stringify({
      mapName: scenario.mapName,
      gameVersion: scenario.gameVersion,
      windMin: scenario.windMin,
      windMax: scenario.windMax,
      tidal: scenario.tidal
    })
  );
  engine.global.set(
    '__engine_json',
    JSON.stringify({
      version: scenario.engineVersion
    })
  );
  engine.doStringSync(`
    Game = Json.decode(__game_json)
    Engine = Json.decode(__engine_json)
  `);

  // 7. gl mock
  engine.global.set('__record_draw_call', (name: string, args: unknown[]) => {
    recordedDrawCalls.push({ name, args });
  });

  engine.doStringSync(`
    gl = {}
    local glMethods = {
      "Color", "Text", "Rect", "BeginText", "EndText",
      "PushMatrix", "PopMatrix", "Translate", "Scale", "LineWidth", "Shape"
    }
    for _, name in ipairs(glMethods) do
      gl[name] = function(...)
        __record_draw_call(name, { ... })
      end
    end
  `);

  // 8. widgetHandler mock
  engine.global.set('__record_action', (name: string, fn: unknown) => {
    recordedActions.set(name, fn);
  });

  engine.doStringSync(`
    widgetHandler = {
      AddAction = function(self, name, fn)
        __record_action(name, fn)
      end,
      RemoveAction = function(self, name)
      end,
      actionHandler = {
        AddAction = function(self, arg1, arg2, arg3)
          if type(arg1) == "string" then
            __record_action(arg1, arg2)
          else
            __record_action(arg2, arg3)
          end
        end,
        RemoveAction = function(self, arg1, arg2)
        end
      }
    }
  `);

  // 9. require mock (common/wind_functions as native Lua table with real BAR shape: numeric keys, string values)
  const windFuncsData = scenario.windFunctions?.averageWindLookup ?? { '0': { '15': '7.5' } };
  engine.global.set('__wind_lookup_json', JSON.stringify(windFuncsData));
  engine.doStringSync(`
    local rawWind = Json.decode(__wind_lookup_json)
    local realWindLookup = {}
    for minK, maxMap in pairs(rawWind) do
      local nMin = tonumber(minK) or minK
      realWindLookup[nMin] = {}
      for maxK, v in pairs(maxMap) do
        local nMax = tonumber(maxK) or maxK
        realWindLookup[nMin][nMax] = tostring(v)
      end
    end
    __common_wind_functions = {
      averageWindLookup = realWindLookup,
      getWindRisk = function() return 1 end,
      isNoWind = function() return false end
    }
  `);

  const originalRequire = engine.global.get('require');
  engine.global.set('__custom_require', (mod: string) => {
    if (typeof originalRequire === 'function') {
      return originalRequire(mod);
    }
    throw new Error(`Module not found: ${mod}`);
  });

  engine.doStringSync(`
    require = function(mod)
      if mod == "common/wind_functions" then
        return __common_wind_functions
      end
      return __custom_require(mod)
    end
  `);

  // 10. widget table initialization
  engine.doStringSync(`
    widget = {
      canControlUnits = true
    }
  `);

  // 11. Load widget source
  const src =
    widgetSource ?? fs.readFileSync(path.resolve(process.cwd(), 'widget/gui_stratcom.lua'), 'utf-8');

  engine.doStringSync(src);

  return {
    engine,
    scenario,
    fs: inMemFs,
    callin: (name: string, ...args: unknown[]) => {
      const widget = engine.global.get('widget');
      if (!widget || typeof widget[name] !== 'function') {
        return undefined;
      }
      return widget[name](widget, ...args);
    },
    setFrame: (frame: number) => {
      scenario.setFrame(frame);
    },
    setTime: (sec: number) => {
      currentNowSec = sec;
    },
    clearDrawCalls: () => {
      recordedDrawCalls.length = 0;
    },
    clearEchoMessages: () => {
      recordedEchoMessages.length = 0;
    },
    drawCalls: () => [...recordedDrawCalls],
    echoMessages: () => [...recordedEchoMessages],
    actions: () => new Map(recordedActions),
    close: () => {
      engine.global.close();
    }
  };
}
