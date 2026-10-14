# Changelog

All notable changes to BAR StratCom. Versions follow [semantic versioning](https://semver.org/).

## 3.0.0 (2026-10-13)

A rebuild. Version 2 was a web console for planning; version 3 is a Windows desktop app with an in-game
widget that coaches you while you play. Version 2's plans and settings are not imported; the setup
wizard offers to remove its old widget.

### Live coaching

- An in-game widget, `gui_stratcom.lua`, installed and updated by the app. It reads your game once a
  second, records it for review, and draws the coach's panel: **BUILDINGS** (the commander's and
  constructors' next steps), **FACTORY** (what to produce next), **RADAR** (enemies your team sees or
  has on radar) and the top alerts. Each part can be switched off; the panel can be dragged and hidden.
- The coach checks steps off from real completions, keeps them checked when units die, and tracks
  whether you are ahead of or behind the plan.
- Thirteen alerts: energy and metal stalls (coming and happening), floats, idle factories,
  constructors and commander, behind plan, low income against pro games, scouting, and enemy air
  without anti-air. They show in the app and in game, with optional sounds (at most one every
  8 seconds) and an optional chat echo that only you see.
- Beginner, Intermediate and Advanced skill profiles, per-alert switches, and a suggestion to change
  profile after three games.
- Coaching modes: Live, Radar (no plan), Manual Clock for lobbies that disable user widgets, and Demo,
  which coaches a recorded real game without BAR.
- A detachable coach window, always on top or as a transparent overlay, shown and hidden with a global
  shortcut (Ctrl+Alt+S by default).
- Two opt-in assist keys: arm the next planned building, and load the planned factory queue in lobbies
  that allow unit-control widgets.

### Plans

- A curated library of 16 openings (9 Armada, 7 Cortex) taken from real high-level games, each naming
  its replay, player and game version, plus a beginner version of each and sample plans from recorded
  games.
- A simulator that runs every plan against your game's real unit data and the chosen map, with an
  economy graph; plans that fail validation cannot be coached.
- Adapt a plan to a map's wind and tides, edit plans, share them as `BSC1` codes, Discord text or JSON
  files, and import them back.
- AI drafting with your own key or model: Anthropic, Google Gemini, OpenAI, OpenRouter, Ollama and LM
  Studio. Drafts are checked and simulated, and repaired up to three times, before you can save them.
- Save your own opening, or capture any player's from a spectated game or replay, as a plan.

### Review

- A report after every game: grade, plan adherence, the top three tips, stall and idle times, build
  power use, each step's timing, economy graphs and a comparison with pro benchmarks.
- A history of recorded games, filtered by player, spectator, replay and demo.

### Around the game

- Setup wizard: finds BAR, installs the widget, picks a profile and a first plan or a demo.
- A health chip that always shows the connection to the game, with a fix for each state.
- A unit catalog from your game's data with 32-bit unit art, map briefings with measured wind and
  metal, and an Intel hub with live battles, the leaderboard, replays and balance changes.
- An animated title screen.

### Privacy, security and release

- No accounts, no analytics, no telemetry. The app goes online only for the release check (which can
  be turned off), the Intel hub and map pictures, and the AI provider you choose.
  See [docs/privacy.md](docs/privacy.md).
- The interface runs sandboxed without Node access, every message between its parts is validated, and
  there is no local server. API keys are encrypted with Windows' data protection.
- A portable Windows zip with no installer, and a banner when a newer release is out.
- A user guide, a privacy page and third-party notices.
