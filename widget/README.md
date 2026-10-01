# BAR StratCom Lua Widget (`gui_stratcom.lua`)

**Version:** 3.0.0  
**Protocol:** 1  
**License:** GPL-2.0-or-later  

The in-game companion widget for **BAR StratCom**, a tactical live coach and replay analysis companion for [Beyond All Reason](https://www.beyondallreason.info/).

---

## 1. What It Does

- **Telemetry Sensor:** Measures economy (metal & energy stored, income, pull), active & idle builders, active & idle factories, commander status, visible identified enemy units, and wind speed.
- **Match Recorder:** Records game events (`created`, `finished`, `destroyed`, `given`, `taken`, `gamestart`, `gameover`) to append-only NDJSON event logs for post-match analysis and build plan extraction.
- **Mini-HUD Display:** Shows a tactical heads-up display overlay in-game with real-time build step tracking, adherence warnings, energy/metal stall alerts, and local chat echo cues.
- **Spec / Replay Mode:** Records multi-team matches and replay captures for pro opening library building and benchmarking.
- **Safe Architecture:** Pure local file-based IPC. No background network servers, no external telemetry or tracking SDKs, no keystroke injection.

---

## 2. Files Written to `<BAR data>/stratcom/`

All communication between the widget and the desktop application occurs via files in `<BAR data>/stratcom/`:

| File | Cadence | Description | Schema |
|------|---------|-------------|--------|
| `widget.json` | 1 Hz / 30 frames | Widget heartbeat (game status, map details, performance timing `perf: { frameMs, drawMs, snapshotMs }`). | `WidgetHeartbeat` |
| `probe.json` | On Initialize | API capability check reporting availability of Spring engine functions and mod options. | `ApiProbeDoc` |
| `unitdefs-<gameVersion>.json` | Once per game version | Raw engine unit definitions and combat/economy stats. | `RawUnitdefsExport` |
| `wind-lookup.json` | Once per game version | BAR engine wind distribution table extracted from `common/wind_functions`. | `RawWindLookup` |
| `state.json` | 1 Hz / 30 frames | Overwritten snapshot of current game state, resources, unit counts, and enemy sightings. | `StateDoc` |
| `session-<sessionId>.json` | At GameStart & Frame 0 | Session metadata including map script name, wind parameters, teams, and starting resources. | `SessionFileDoc` |
| `events-<sessionId>.ndjson` | Every 30 frames | Append-only NDJSON log of unit lifecycle and match events. | `WidgetEvent` |
| `state-<sessionId>.ndjson` | Every 30 frames | Debug state history (written only when `stratcom/record_state.flag` exists). | `StateDoc` (per line) |

### Files Read by the Widget

| File | Source | Description |
|------|--------|-------------|
| `coach.json` | StratCom App (2 Hz) | Display model containing Mini-HUD lines, tones, progress, chat echos, and opt-in assist cues (`protocol == 1`). |
| `record_state.flag` | User / Tooling | When present, enables appending state snapshots to `state-<sessionId>.ndjson`. |

---

## 3. Manual Installation

The StratCom desktop app can install and update the widget automatically (**Settings → Game → Install**). To install manually:

1. **Locate your BAR data directory (`<BAR data>`):**
   - **Windows:** `D:\BAR\Beyond-All-Reason\data` or `%LOCALAPPDATA%\Programs\Beyond-All-Reason\data`
   - **Linux:** `~/.config/Beyond-All-Reason/data`
2. **Remove legacy widgets:**
   - If present, remove or back up `gui_bar_theory_live_telemetry.lua` from `<BAR data>/LuaUI/Widgets/` to prevent conflicting telemetry writes.
3. **Copy widget:**
   - Copy `widget/gui_stratcom.lua` into `<BAR data>/LuaUI/Widgets/gui_stratcom.lua`.
4. **Enable in-game:**
   - In Beyond All Reason, press **F11** to open the widget manager, search for **BAR StratCom**, and tick the checkbox (or type `/luaui reload` in chat).
   - If the desktop app is not running, the HUD will display `STRATCOM OFFLINE`. This is normal.

---

## 4. Keybindings & Actions

The widget registers actions with the BAR action handler. You can bind them in BAR's chat or in `uikeys.txt`:

| Action | Recommended Key | Description |
|--------|-----------------|-------------|
| `stratcom_hud_toggle` | `Ctrl+Shift+N` | Toggle visibility of the in-game Mini-HUD. Position and visibility persist across games. |
| `stratcom_arm_next` | `Ctrl+Shift+A` | (Assist) Selects the build command for the next planned unit when a builder/commander is active. |
| `stratcom_load_queue` | `Ctrl+Shift+Q` | (Assist) Queues the planned unit order on a selected factory. |

### Binding Example:
```text
/bind Ctrl+Shift+N stratcom_hud_toggle
```

---

## 5. Privacy & Security Note

- **100% Local Communication:** All widget communication is strictly local via standard JSON files inside `<BAR data>/stratcom/`.
- **No Network Requests:** The widget does not make HTTP requests, does not contact remote servers, and includes no analytics or telemetry SDKs.
- **Local Console Chat Only:** Audio cues and alerts published via `echo` are printed locally to your private console via `Spring.Echo`. Nothing is sent to other players or lobby chat.
- **Fair Play Compliant:** Build orders are never issued automatically for combat or movement units; the widget only inspects unit definitions and own-team/visible-enemy state.

---

## 6. API Probe Results

This table documents engine API availability across BAR engine releases. To be populated after checkpoint **H1**:

| Engine API / Global | Type | Engine Version | Status / Notes |
|---------------------|------|----------------|----------------|
| `Spring.GetTeamRulesParam` | `function` | Pending H1 | Used for `startUnit` faction detection |
| `Spring.GetTeamUnitsCounts` | `function` | Pending H1 | One-pass unit defID count lookup |
| `Spring.GetUnitIsBeingBuilt` | `function` | Pending H1 | Differentiates in-construction vs finished units |
| `Spring.GetUnitIsBuilding` | `function` | Pending H1 | Detects active constructor build power |
| `Spring.GetUnitCurrentBuildPower` | `function` | Pending H1 | Measures active build power utilization |
| `Spring.GetUnitCommandCount` | `function` | Pending H1 | Identifies idle builders and commanders |
| `Spring.GetFactoryCommands` | `function` | Pending H1 | Inspects factory queues |
| `Spring.GetVisibleUnits` | `function` | Pending H1 | Identifies LOS-visible enemy units |
| `Spring.SetActiveCommand` | `function` | Pending H1 | Arms next build command |
| `Spring.GetActiveCmdDescs` | `function` | Pending H1 | Inspects builder command descriptions |
| `widgetHandler.actionHandler:AddAction` | `function` | Pending H1 | Registers `/bind` actions |
| `WG['fonts']` | `table / nil` | Pending H1 | BAR engine shared font provider |

---

## 7. License

This widget is free software released under the **GNU General Public License v2.0 or later** ([GPL-2.0-or-later](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)).
