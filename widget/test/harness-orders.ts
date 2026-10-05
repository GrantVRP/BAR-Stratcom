import type { LuaEngine } from 'wasmoon';
import type { Scenario } from './scenario';

export interface OrderRecorders {
  /** Indexes passed to Spring.SetActiveCommand. */
  activeCommands: number[];
  /** Orders that reached Spring.GiveOrderToUnit (none in the sandbox). */
  orders: Array<{ unitId: number; cmdId: number }>;
}

/**
 * Selection, command panel and orders (T09.1), shaped like the engine (verified in Recoil's
 * LuaUnsyncedRead/LuaUnsyncedCtrl and BAR's barwidgets.lua): GetActiveCmdDescs is the selection's
 * command list keyed from 1 (CMD_INDEX_OFFSET), build commands have id = -unitDefID,
 * SetActiveCommand takes that key, and in BAR's sandbox every Spring.GiveOrder* raises
 * "User 'unit control' widgets disallowed on this game". Must run after the Spring bootstrap and
 * before the widget source is loaded (the widget keeps local aliases).
 */
export function installOrderMocks(engine: LuaEngine, scenario: Scenario): OrderRecorders {
  const recorders: OrderRecorders = { activeCommands: [], orders: [] };
  engine.global.set('__sp_get_selected_units', () => [...scenario.selectedUnits]);
  engine.global.set('__sp_get_active_cmd_descs_json', () => {
    const descs: Array<Record<string, unknown>> = [{ id: 0, name: 'Stop', action: 'stop', type: 0, hidden: false, disabled: false, params: [] }];
    const seen = new Set<number>();
    for (const unitId of scenario.selectedUnits) {
      const def = scenario.unitDefsById.get(scenario.units.get(unitId)?.defId ?? -1);
      for (const option of def?.buildOptions ?? []) {
        const built = scenario.unitDefsByName.get(option.toLowerCase());
        if (!built || seen.has(built.defId)) continue;
        seen.add(built.defId);
        descs.push({ id: -built.defId, name: built.def.id, action: `buildunit_${built.def.id}`, type: 20, hidden: false, disabled: false, params: [] });
      }
    }
    return JSON.stringify(descs);
  });
  engine.global.set('__sp_set_active_command', (index: number) => recorders.activeCommands.push(index));
  engine.global.set('__sp_give_order_to_unit', (unitId: number, cmdId: number) => recorders.orders.push({ unitId, cmdId }));
  engine.global.set('__sp_sandboxed', () => !scenario.canControlUnits);
  engine.doStringSync(`
    Spring.GetSelectedUnits = function() return __sp_get_selected_units() end
    Spring.GetActiveCmdDescs = function() return Json.decode(__sp_get_active_cmd_descs_json()) end
    Spring.SetActiveCommand = function(index)
      __sp_set_active_command(index)
      return true
    end
    Spring.GiveOrderToUnit = function(unitID, cmdID, params, options)
      if __sp_sandboxed() then
        error("User 'unit control' widgets disallowed on this game", 2)
      end
      __sp_give_order_to_unit(unitID, cmdID)
      return true
    end
  `);
  return recorders;
}
