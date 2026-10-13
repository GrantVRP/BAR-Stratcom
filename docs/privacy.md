# Privacy

**BAR StratCom collects nothing about you.** It has no accounts, no analytics, no crash reporting and
no telemetry. Everything it records stays on your PC. It goes online only for the few things listed
below, and only to fetch public information or to reach the AI provider you chose.

## What stays on your PC

**The app's data folder**, `%APPDATA%\bar-stratcom` (Settings → Data → **OPEN APP DATA FOLDER**):

| What | Where |
| --- | --- |
| Your settings | `settings.json` |
| AI API keys, encrypted with Windows' data protection for your user account | `keys.json` |
| Plans you saved, imported, adapted, captured or drafted | `plans\` |
| Recorded games and their reports. Spectated games and replays include the other players' names and armies. | `sessions\` |
| Copies of the public data the Intel hub and the map pictures fetched | `cache\` |

The app writes no log files.

**In Beyond All Reason's data folder** the app writes only two things:

- the widget file, `LuaUI\Widgets\gui_stratcom.lua` (Settings → Game → **UNINSTALL WIDGET** removes it);
- the `stratcom\` folder, where the widget and the app exchange files: the widget's heartbeat, the
  current game state, the game's events and unit data, and the `coach.json` the in-game HUD shows.
  When a game ends the app moves its files into its own `sessions\` folder.

**To find the game** the app reads BAR's install location from the Windows registry and asks Windows
where a running `spring` process lives. These are the only two programs it ever runs, both read-only.
It also reads the end of BAR's `infolog.txt` to notice when a lobby turns user widgets off.

**Settings → Data** exports all plans as one zip, or deletes all recorded games and reports.

## When the app goes online

| When | To | What is sent |
| --- | --- | --- |
| At start, in the downloaded app, while Settings → App → **CHECK FOR UPDATES ON LAUNCH** is on (on by default) | `api.github.com` | A request for the latest BAR StratCom release. Nothing about you or your games. |
| You open the Intel hub's tabs | `api.bar-rts.com`, `server4.beyondallreason.info` | Requests for public battles, leaderboards, replays and balance changes, including the map and player names you type into the replay search. |
| A map briefing shows its picture | `maps-metadata.beyondallreason.dev` | Requests for BAR's public map list and the map's picture. |
| You draft a plan with AI, or test the AI connection | The provider you picked in Settings → AI | See [AI drafting](#ai-drafting). |
| You click a link to a website | Your web browser opens it | The app opens only links to beyondallreason.info, bar-rts.com, github.com and the AI providers' sites. |

Like any web request, these show the server your IP address. The app sends no cookies and no
identifier of its own.

## AI drafting

AI drafting is **off** until you pick a provider in Settings → AI. When you draft a plan, the app
sends the provider:

- your choices: faction, game mode, role, opening, skill level, map, and the optional note you type
  (up to 300 characters);
- the map's facts: name, size, wind, tidal strength, water and metal per extractor;
- the unit table from your game's data, and up to two example plans from your library.

It sends no personal data, no files and no recorded games. **TEST CONNECTION** asks the provider for
its list of models. Your key is stored encrypted on this PC and is sent only to that provider; the
app's own screens never see it. You pay the provider directly, and its own privacy terms cover what it
receives. With **Ollama** or **LM Studio** the request goes to the server URL you set, which is on your
own PC by default (`localhost`).

## The in-game widget

- It runs inside BAR, reads your game, and exchanges files with the app in the `stratcom\` folder. It
  makes no network requests.
- It records what you can see: your own team, and enemies inside your team's sight or radar. As a
  spectator or in a replay it records what a spectator sees.
- **Chat echo** prints alerts in your own chat window only. Nothing is sent to other players.
- The assist helpers act only when you press their key, and only after you turn them on in
  Settings → Assist ([user guide](user-guide.md#in-game-assist)).

## Removing everything

1. In Settings → Game, press **UNINSTALL WIDGET** (or delete `LuaUI\Widgets\gui_stratcom.lua` in
   BAR's data folder), and delete the `stratcom` folder there.
2. Delete `%APPDATA%\bar-stratcom`.
3. Delete the folder you unzipped the app into.
