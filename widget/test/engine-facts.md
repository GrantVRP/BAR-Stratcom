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
