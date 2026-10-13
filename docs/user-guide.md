# BAR StratCom user guide

BAR StratCom coaches your opening build order in Beyond All Reason while you play. It shows the next
step of a plan in a small in-game panel and in the app, warns you when your economy stalls or your
builders stand idle, and gives you a report after the game.

BAR StratCom is an unofficial community tool. It is not affiliated with the Beyond All Reason team.

- [Install and first run](#install-and-first-run)
- [The in-game widget](#the-in-game-widget)
- [Build plans](#build-plans)
- [Coaching modes](#coaching-modes)
- [Alerts and skill profiles](#alerts-and-skill-profiles)
- [In-game assist](#in-game-assist)
- [After the game: review](#after-the-game-review)
- [AI drafting](#ai-drafting)
- [Units, maps and intel](#units-maps-and-intel)
- [When a lobby disables user widgets](#when-a-lobby-disables-user-widgets)
- [Troubleshooting by health state](#troubleshooting-by-health-state)

## Install and first run

1. Download `BAR StratCom-<version>-win-x64.zip` from the
   [releases page](https://github.com/GrantVRP/BAR-Stratcom/releases) and unzip it into any folder.
   There is no installer.
2. Run `BAR StratCom.exe`. The app is not code-signed, so Windows may say it protected your PC. Choose
   **More info → Run anyway**.
3. The title screen opens. Press any key.

The first time, a short setup wizard walks you through these steps. You can skip it and run it again
later from Settings → App → **RE-RUN SETUP WIZARD**.

| Step | What you do |
| --- | --- |
| **Locate Beyond All Reason** | The app finds BAR's data folder by itself: from the Windows registry, from a running game, or in `%LOCALAPPDATA%\Programs\Beyond-All-Reason\data`. If it can't, press **BROWSE FOLDER** and pick the folder that contains `engine` and `LuaUI`. |
| **Install companion widget** | Press **INSTALL COMPANION WIDGET**. It copies `gui_stratcom.lua` into BAR's `LuaUI\Widgets` folder. If an old BAR Theory widget is there, **REMOVE LEGACY WIDGET** removes it. |
| **Choose skill profile** | Beginner, Intermediate (recommended) or Advanced. See [Alerts and skill profiles](#alerts-and-skill-profiles). |
| **Pick a plan or a demo** | Pick one of the suggested plans for your profile, or press **TRY DEMO (4× SPEED)** to watch the coach work on a recorded real game. |
| **Done** | The three things to do in game, below. |

Then, in game:

1. Enable the widget once: press **F11**, find **BAR StratCom** and tick it.
2. Start any match. Coaching starts with it.
3. Press **Ctrl+Alt+S** to show or hide the coach window.

No BAR on this PC? Everything except coaching and recording a real game works without it. Press
**DEMO 4×** on Home.

## The in-game widget

The widget draws the coach's panel in your game and tells the app what happens in your game. It
changes nothing in the game and never gives orders by itself (except the optional
[assist](#in-game-assist) keys).

The panel has up to four parts, top to bottom:

- **BUILDINGS**: what your commander and constructors should build next, with the plan's progress
  (`3/12`) and whether you are ahead or behind. `CDR` marks the commander and `CON` a constructor.
  A late step shows how late it is (`+0:23`).
- **FACTORY**: what your factories should produce next, so you can queue units while your commander
  builds.
- **RADAR**: a scope around your commander with the enemies your team can see or has on radar, and a
  list of the latest contacts.
- **Alerts**: the one or two most urgent warnings.

Move the panel by dragging its top strip with the left mouse button; it keeps its place between games.
Turn the parts on and off in the Coach view (**IN-GAME HUD** switches) and the whole panel in
Settings → Coach → **Widget HUD Display**. To hide it with a key, bind the toggle once in BAR's chat:

```text
/bind Ctrl+Shift+H stratcom_hud_toggle
```

When the app is not running the panel shows `STRATCOM OFFLINE`.

After the app updates the widget (Settings → Game → **REINSTALL / UPDATE WIDGET**), type
`/luaui reload` in BAR's chat or restart the game to load the new version.

## Build plans

A plan is an ordered list of steps: who builds (commander, a constructor, or a factory), what, how
many, and when. The **LIBRARY** holds them.

**Curated plans** come from real high-level games: each says which replay and player it was taken
from, and how it was changed (for example "the first 12 steps … re-timed for a calmer start"). Filter
by faction, mode, opening, energy style, skill and source, or search by title, tag, map or author.

**Open a plan** to see its steps, an economy graph from the simulator, and its provenance. The buttons:

- **ACTIVATE** makes it the plan Home coaches.
- **EDIT PLAN** opens the editor: add, change, reorder or remove steps, then **SAVE PLAN**. The app
  checks every plan against your game's unit data and simulates it before you can coach it.
- **SHARE**: copy a share code (`BSC1…`), copy a Discord-ready text, or **SAVE AS .JSON**.
- **ADAPT TO THIS MAP**: pick a map and the app adapts the plan to it, for example swapping wind
  turbines for solar collectors on a low-wind map. The graph shows the result. Maps → **ADAPT A PLAN
  FOR THIS MAP** does the same from a map's briefing.

**IMPORT** in the Library takes a share code, pasted JSON, or a file (**OPEN FILE...**).
**+ NEW PLAN** starts an empty plan in the editor. Settings → Data → **EXPORT ALL PLANS (.ZIP)**
backs up every plan at once.

More ways to get a plan: [save your own opening or capture another player's](#after-the-game-review)
from a recorded game, or [draft one with AI](#ai-drafting).

## Coaching modes

Home starts every mode. Its card shows the active plan.

| Mode | Button | Needs | What you get |
| --- | --- | --- | --- |
| **Live** | **START COACHING (LIVE)** | BAR and the widget | The full coach: steps tick off as your buildings and units finish, alerts read your real economy, the in-game panel shows the plan, and the game is recorded for review. |
| **Radar** | **RADAR (NO PLAN)** | BAR and the widget | No plan. The in-game panel shows only the radar, and the Coach view lists the enemy contacts. |
| **Manual Clock** | **MANUAL CLOCK** | Nothing | For lobbies that disable user widgets. A clock you start yourself runs the plan by its planned times. |
| **Demo** | **DEMO 4×** | Nothing | Plays a recorded real game at 4× speed through the coach, with alerts, sounds and the in-game panel preview, and ends with a report. |

**The Coach view** shows:

- the **NEXT** step in large type: who builds it, and its countdown or how late it is;
- the active alerts;
- **TELEMETRY**: metal and energy (stored, income and spending) and how much of your build power is
  in use;
- **UP NEXT**: the following steps, with their planned times;
- the **IN-GAME HUD** switches and a preview of what the widget draws.

A step stays checked even if the unit later dies.

**A second screen or an overlay.** **DETACH WINDOW** opens the coach in its own window. Settings → App:

- **ALWAYS ON TOP** keeps that window above the game.
- **OVERLAY MODE (TRANSPARENT HUD)** draws it as a transparent overlay. This needs BAR in borderless
  windowed mode.
- **GLOBAL SHORTCUT (IN-GAME HOTKEY)** shows or hides the coach window from anywhere (default
  **Ctrl+Alt+S**). It must use Ctrl, Alt or the Windows key plus one other key.

**STOP** ends coaching.

## Alerts and skill profiles

The coach watches your game twice a second and raises these alerts:

| Alert | Fires when |
| --- | --- |
| Energy Stall Soon | your energy will run out within a few seconds at the current spending |
| Energy Stalling | your energy is empty and you are spending more than you make |
| Metal Stall Soon | your metal will run out within a few seconds (Advanced only) |
| Metal Stalling | your metal is empty and you are spending more than you make |
| Metal Float | your metal storage stays full |
| Energy Float | your energy storage stays full |
| Factory Idle | a factory has nothing queued |
| Constructors Idle | constructors stand idle |
| Commander Idle | your commander stands idle (first 10 minutes) |
| Behind Build Plan Schedule | you fall behind the plan |
| Benchmark Low | your income is low compared with high-level games at this time |
| Scout Reminder | a few minutes into a 1v1 or small-team game you still have no radar or scout |
| Enemy Air Without Anti-Air Defense | enemy aircraft are around and you have no anti-air |

An alert stays on screen for at least 5 seconds so it does not flicker.

**Skill profiles** set how early and how strictly the coach speaks up. Choose one in Settings → Coach
→ **SKILL PROFILE**:

| | Beginner | Intermediate | Advanced |
| --- | --- | --- | --- |
| Idle commander warning after | 8 s | 8 s | 3 s |
| Idle constructors warning after | 10 s | 10 s | 4 s |
| Behind-plan warning after | 20 s | 15 s | 10 s |
| A step counts as on time within | 30 s | 20 s | 12 s |
| Metal Stall Soon | off | off | on |
| Energy Float, Benchmark Low | off | on | on |
| Wording | plain | standard | terse |

**ALERT DETECTORS** in the same tab switch single alerts on or off on top of the profile. An alert the
profile has no threshold for shows **Not in this profile**.

After three games on the same profile the app may suggest a change: up when all three went very well,
down when all three went badly. It never switches by itself.

**How alerts reach you:**

- **On screen**: in the Coach view and in the in-game panel.
- **Sound**: short beeps, a different one per severity (**PROCEDURAL AUDIO CUES**, with a volume
  slider and a test button for each sound). At most one sound every 8 seconds.
- **Chat echo** (off by default): danger alerts and due steps are printed in your own game chat, at
  most one every 10 seconds. Only you see them.

## In-game assist

Two optional helpers, both **off by default** (Settings → Assist). Each acts only when you press its
key in BAR. Bind the keys once in BAR's chat:

```text
/bind Ctrl+Shift+N stratcom_arm_next
/bind Ctrl+Shift+J stratcom_load_queue
```

- **ARM NEXT BUILD**: with a constructor or your commander selected, press the key. The next planned
  building is picked as if you had clicked its build button; you click on the map to place it. It never
  gives orders, so it works in every game. The panel shows `ARMED: <name>` for 2 seconds.
- **LOAD FACTORY QUEUE**: with the planned factory selected, press the key to queue its planned units
  (at most 20). It works only in lobbies that allow unit-control widgets; elsewhere BAR shows
  `ASSIST BLOCKED BY LOBBY` and nothing happens.

## After the game: review

When a coached or recorded game ends, **MATCH REPORT READY** pops up; **REVIEW** keeps every game.
Filter the list by **PLAYER**, **SPECTATOR**, **REPLAY** or **DEMO**.

A report shows:

- an **EXECUTION GRADE** and how much of the plan you followed on time;
- the **top three tips**, ordered by how much they would have helped;
- **MATCH METRICS**: seconds of energy and metal stall, metal float, idle factory, idle constructor
  and idle commander time, and build power use;
- the **step timeline**: each step's planned and actual time;
- economy graphs and, where pro games of the same faction and mode exist, how your income compares.

Turn a game into a plan:

- **SAVE MY OPENING AS PLAN** (your own games) saves what you built as a new plan.
- **CAPTURE PLAN** (games you spectated or watched as a replay) saves any player's opening. Start BAR,
  watch the replay with the widget on, then pick the player here. You can add the bar-rts.com replay
  link so the plan records where it came from.

Settings → Data → **CLEAR SAVED SESSIONS** deletes recorded games and reports. Plans and settings stay.

## AI drafting

The app can ask an AI model to draft a plan. You bring the model: a key for a cloud provider, or a
model running on your own PC. Drafting is off until you set it up in Settings → AI.

| Provider | Needs |
| --- | --- |
| Anthropic (Claude) | an API key from console.anthropic.com |
| Google Gemini | an API key from aistudio.google.com |
| OpenAI | an API key from platform.openai.com |
| OpenRouter | an API key from openrouter.ai |
| Ollama (local) | Ollama running on your PC (server URL `http://localhost:11434/v1`) and a downloaded model |
| LM Studio (local) | LM Studio's server running (server URL `http://localhost:1234/v1`) and a loaded model |

1. Settings → AI: pick the **Provider**, paste the **API key** (or check the **Server URL** for a
   local one), pick the **Model**, and press **TEST CONNECTION**.
2. Library → **DRAFT WITH AI** (or **DRAFT VARIANT WITH AI** on a plan): choose faction, mode, role,
   opening, skill and map, add a note if you like, and press **DRAFT**.
3. The app checks the draft against your game's unit data and simulates it. When something is wrong it
   asks the model to fix it, up to three rounds. You then see the checked plan and save or discard it.

For Anthropic, **Refusal fallback** lets Anthropic retry on a fallback model when Claude declines a
request.

You pay your provider directly. Your key is encrypted on this PC and sent only to that provider.
[What is sent](privacy.md#ai-drafting).

## Units, maps and intel

- **UNITS**: every unit of the playable factions, from your own game's data: costs, build work,
  health, speed, range, sight, build power, economy, and the plans that use it.
- **MAPS**: map briefings with size, wind (and how often it is low), tides, metal, water, start spots
  and how often the map is played, the map's picture, and **ADAPT A PLAN FOR THIS MAP**.
- **INTEL**: live **BATTLES**, the **LEADERBOARD**, **REPLAYS** search and **BALANCE** changes, from
  BAR's public servers. These are the only screens that go online
  ([privacy](privacy.md#when-the-app-goes-online)).

## When a lobby disables user widgets

Some lobbies do not allow user widgets. The widget then cannot run, and the top bar shows
**WIDGETS DISABLED**. Use **MANUAL CLOCK** on Home instead:

1. Start the clock (**START CLOCK**, or **Space** in the Coach view) when the game starts.
2. Steps become current at their planned times. Press **✓ MARK DONE** when you finish one, or let it
   pass.
3. **PAUSE CLOCK** and **RESET** when needed.

Manual Clock has no live data: no economy alerts, no in-game panel, no recording. It warns you before
the plan's own energy or metal dips ("Plan dips energy at 2:10").

## Troubleshooting by health state

The chip at the top left shows the connection to the game. Hover it for the message.

| Chip | Meaning | What to do |
| --- | --- | --- |
| **NO BAR** | The app has not found Beyond All Reason. | Settings → Game → **AUTO-DETECT** or **BROWSE FOLDER** to BAR's data folder (the one with `engine` and `LuaUI`). Or try Demo. |
| **WIDGET MISSING** | The widget is not in BAR's `LuaUI\Widgets` folder. | Settings → Game → **INSTALL WIDGET**, then enable it in game (F11). |
| **WIDGET UPDATE** | The installed widget is older than the app's. | Settings → Game → **REINSTALL / UPDATE WIDGET**, then `/luaui reload` in BAR's chat. |
| **PROTOCOL ERROR** | The widget and the app do not understand each other. | Reinstall the widget, then `/luaui reload`. |
| **BAR IDLE** | No message from the widget. | Start BAR. If BAR is running, press F11 and check that **BAR StratCom** is ticked. |
| **PREGAME** | In the lobby or loading. | Nothing: coaching starts with the match. |
| **LIVE** | You are playing and the widget is talking to the app. | – |
| **SPECTATING** / **REPLAY** | You are watching; every team is recorded. | After the game, use **CAPTURE PLAN** in Review. |
| **WIDGETS DISABLED** | This lobby does not allow user widgets. | Use [Manual Clock](#when-a-lobby-disables-user-widgets). |
| **WIDGET STALLED** | The widget stopped answering during a game. | Press F11: BAR turns a widget off after an error. Tick it again, or type `/luaui reload`. |

**Other problems**

- **The in-game panel does not appear.** Check that the chip says **LIVE**, that Settings → Coach →
  **Widget HUD Display** is on, and that you have not hidden it with `stratcom_hud_toggle`.
- **No sound.** Settings → Coach → **PROCEDURAL AUDIO CUES** must be on; try a test sound there.
- **The overlay is black or hidden behind the game.** Run BAR in borderless windowed mode.
- **Ctrl+Alt+S does nothing.** Another program may own that shortcut. Settings → App →
  **GLOBAL SHORTCUT (IN-GAME HOTKEY)** shows whether it is registered and lets you choose another.
