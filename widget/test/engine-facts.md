# Engine Facts — Real Recoil / BAR Data Shapes

This document defines the ground-truth data shapes returned by the Recoil engine and BAR Lua environment, as observed in real H1 match captures (`data/raw/h1/`) and verified against the Recoil Lua API documentation and BAR source.

Per **Standing Order S-7**, test doubles, harnesses, and scenario builders **must mirror these real shapes**. Never invent mock data types.

---

## 1. Engine & Game API Shapes

| Function / Global | Return Type / Shape | Real Example / Notes | Source |
|---|---|---|---|
| `Spring.GetTeamRulesParam(teamID, "startUnit")` | `number` (numeric `unitDefID`), or `nil` | `303` (representing `corcom` in `test-31479-433a460`) | H1 state captures (`state-20261001-221316-e92e.ndjson:1`); BAR game rules params. |
| `UnitDefs[unitDefID].name` | `string` | `UnitDefs[303].name == "corcom"`, `UnitDefs[232].name == "armcom"` | Recoil `UnitDefs` table; H1 unitdefs export. |
| `common/wind_functions.averageWindLookup` | `table<number, table<number, string>>` | `lookup[0][1] == "0.8"`, `lookup[5][20] == "12.5"` (numeric keys, **string** values) | BAR `common/wind_functions.lua`; verified in BAR repo. |
| `Spring.GetTeamInfo(teamID)` | `(teamID, leader, isDead, isAI, side, allyTeam, incomeMultiplier, customTeamKeys)` | Team 0: `(0, 0, false, false, "arm", 0, 1, {})`<br>AI Team 1: `(1, 0, false, true, "cortex", 1, 1, {})` | Recoil Lua API (`Spring.GetTeamInfo`). In AI skirmishes, `leader` points to the host `playerID`. |
| `Spring.GetAIInfo(teamID)` | `(aiID, name, hostingPlayerID, shortName, version, options)` or `nil` | Team 1: `(0, "BARbarian", 0, "BARb", "1.0", {})` | Recoil Lua API (`Spring.GetAIInfo`). Second return value is the AI name. |
| `Spring.GetPlayerInfo(playerID)` | `(name, active, spectator, teamID, allyTeamID, pingTime, cpuUsage, country, rank, customPlayerKeys)` | Host: `("Grant_P", true, false, 0, 0, ...)` | Recoil Lua API (`Spring.GetPlayerInfo`). First return value is player name. |
| `Spring.GetFactoryCommands(unitID, [count])` | `table` or `number` | In engine 2026.07+, `GetFactoryCommands(u, 0)` may return a number (count) rather than a table | Recoil Lua API deprecation observed during H1. |
| `Spring.GetWind()` | `(dirX, dirY, dirZ, strength, normDirX, normDirY, normDirZ)` | `select(4, Spring.GetWind())` returns float strength | Recoil Lua API (`Spring.GetWind`). |
| `common/wind_functions.getWindRisk()` | `string` (percent of time wind < 6) | `"11.8"` for wind 0–15, `"100"`/`"0"` as the fallback when the pair is not in the table | BAR `common/wind_functions.lua` (`windRiskLookup`, string values; checked 2026-10-05). Read with `tonumber()` (T09.1). |
| `UnitDefs[unitDefID].id` | `number` | `UnitDefs[232].id == 232` | Recoil `LuaUnitDefs`. |
| `UnitDefs[unitDefID].buildOptions` | `table<number, number>` (array of **unitDefIDs**, not names; unknown names skipped) | `{ 45, 51, 60, … }` | Recoil `rts/Lua/LuaUnitDefs.cpp` `BuildOptions()` pushes `unitDefIDsMap[name]` (checked 2026-10-05). |
| `Spring.GetSelectedUnits()` | `table<number, number>` (array of unitIDs) | `{ 1201, 1305 }` | Recoil Lua API; BAR `gui_gridmenu.lua`. |
| `Spring.GetActiveCmdDescs()` | table of command descriptions keyed by **index** (`i + CMD_INDEX_OFFSET`, i.e. from 1), each with `id`, `name`, `action`, `type`, `hidden`, `disabled`, `params` | build commands have `id == -unitDefID`; the list follows the current selection | Recoil `LuaUnsyncedRead::GetActiveCmdDescs` (checked 2026-10-05). |
| `Spring.SetActiveCommand(index)` | `boolean` | takes the same key as `GetActiveCmdDescs` (subtracts `CMD_INDEX_OFFSET`); BAR's own build menu calls `SetActiveCommand(Spring.GetCmdDescIndex(-unitDefID))` | Recoil `LuaUnsyncedCtrl::SetActiveCommandByIndex`; BAR `gui_gridmenu.lua`. |
| `Spring.GiveOrder*` in a lobby without `allowunitcontrolwidgets` | **raises** `"User 'unit control' widgets disallowed on this game"` | `widget.canControlUnits == false`; an error in a call-in makes BAR remove the widget | BAR `luaui/barwidgets.lua` `CreateSandboxedSystem` (checked 2026-10-05). |
| `Spring.DiffTimers(endTimer, startTimer[, returnMs[, fromMicroSecs]])` | `number`, **seconds** unless `returnMs` is true | `DiffTimers(t1, t0, true)` → milliseconds | Recoil `LuaUnsyncedRead::DiffTimers` (checked 2026-10-05). Widgets before 3.0.3 reported seconds as `drawMs` / `snapshotMs` and never measured `frameMs` (T11.3). |
| Gaia team | `Spring.GetGaiaTeamID()`; Gaia is its own ally team | critters such as `critter_gull` (Seagull) belong to Gaia and are visible | H1b Armada capture (Seagull recorded as an enemy for 199 s). |

---

## 2. Widget Invariant Rules (Derived from Engine Facts)

1. **Faction Resolution (`resolveFaction`)**:
   - `spGetTeamRulesParam(teamId, "startUnit")` yields a **number** (unitDefID), not a unit name string.
   - The def name MUST be looked up via `UnitDefs[defId].name`.
   - The returned `startUnitId` must always be the string def name (e.g. `"corcom"`) or `nil`, never a raw number.
   - `factionId` is derived from the prefix (`"arm"` -> `"armada"`, `"cor"` -> `"cortex"`, `"leg"` -> `"legion"`).

2. **Wind Lookup Export (`exportWindLookup`) & Resolution (`resolveWindInfo`)**:
   - Lookup values in BAR's table are stored as strings (e.g. `"0.8"`).
   - Exporter and reader MUST convert values with `tonumber(val)` so they export and resolve as numeric values.

3. **Player & AI Naming (`getTeamInfoDetails`)**:
   - For human teams (`isAI == false`): use `spGetPlayerInfo(leaderId)`.
   - For AI teams (`isAI == true`): MUST use `spGetAIInfo(teamId)` to format `"<name> (AI)"` or fallback to `"AI <teamId>"`. NEVER use `leaderId`, because in skirmish games `leaderId` references the host human player.

4. **Replay Auto-Start**:
   - In replays or mid-game loads, `Spring.GetGameFrame()` can be `> 0` at `Initialize`.
   - Widget must trigger session initialization immediately when `frame > 0`.

5. **JSON Serialization of Empty Tables (`Json.encode`)**:
   - Empty Lua tables (`{}`) have no keys, and the Recoil engine's `Json.encode({})` encodes them as `[]` (empty JSON array), never `{}`.
   - Any record/map field (`counts`, `enemies`, `teams[].counts`) that may be empty in Lua will appear as `[]` in raw JSON exports.
   - Domain schemas accept `[]` via Zod preprocess and normalize it to `{}`.


6. **Wind Risk (`resolveWindInfo`)**:
   - `getWindRisk()` returns a **string** (like the average wind lookup). Convert with `tonumber()`;
     a `type(r) == "number"` check drops every real value (the heartbeat's `windRisk` was always
     `null` before widget 3.0.2).

7. **Assist Actions (`assistArmNext`, `assistLoadQueue`, T09.1)**:
   - `buildOptions` holds unitDefIDs; compare with `UnitDefNames[name].id`, never with names.
   - Find the build command by iterating `GetActiveCmdDescs()` with `pairs` and matching
     `desc.id == -unitDefID`; pass that key to `SetActiveCommand`.
   - Never call `Spring.GiveOrder*` unless `widget.canControlUnits == true`, and wrap the call in
     `pcall`: in the sandbox it raises, and an error in a call-in unloads the widget.

8. **Enemies (`writeSensorState`)**:
   - Units of the Gaia team (`Spring.GetGaiaTeamID()`) are neutral: exclude them from `enemies`
     even though their ally team differs from ours.
