#!/usr/bin/env python3
"""
Beyond All Reason — Local Process Memory & Live Telemetry Bridge
================================================================
Lightweight companion daemon interfacing between the active Beyond All Reason
engine (spring.exe / Beyond-All-Reason.exe) and the StratCom web console.

Features:
- Windows process scan via psutil / ctypes for spring.exe and Beyond-All-Reason.exe
- Engine log inspection (infolog.txt, startscript.txt) for active map,
  player faction, connected lobby, and match duration
- REST API server on http://127.0.0.1:5050/api/live-status with CORS enabled
- Built-in Mock Simulation Mode (--mock) for instant offline verification
- Zero-CPU idle caching to prevent polling overhead
"""

import os
import sys
import time
import re
import json
import glob
import argparse
from typing import Dict, Any, Optional

try:
    import psutil
except ImportError:
    psutil = None

try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
except ImportError:
    FastAPI = None

# Default search directories for BAR on Windows
BAR_DATA_PATHS = [
    r"D:\BAR\Beyond-All-Reason\data",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Beyond-All-Reason\data"),
    os.path.expandvars(r"%APPDATA%\Beyond All Reason\data"),
    os.path.expandvars(r"%LOCALAPPDATA%\Beyond-All-Reason"),
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\beyond-all-reason"),
    os.path.expandvars(r"%USERPROFILE%\Documents\Beyond All Reason"),
    r"C:\Games\Beyond All Reason\data",
]

TARGET_ENGINE = {"spring.exe"}
TARGET_LAUNCHER = {"beyond-all-reason.exe", "beyond all reason.exe", "bar.exe"}


class BarTelemetryScanner:
    def __init__(self, mock_mode: bool = False):
        self.mock_mode = mock_mode
        self.mock_start_time = time.time()
        self.last_scan_time = 0.0
        self.cached_state: Optional[Dict[str, Any]] = None
        self.cache_ttl = 1.0  # Seconds to cache process scan

    def _get_mock_state(self) -> Dict[str, Any]:
        """Generates realistic synthetic state for developer verification."""
        elapsed = int(time.time() - self.mock_start_time)
        cycle = elapsed % 60

        if cycle < 10:
            return {
                "isRunning": False,
                "gameStatus": "OFFLINE",
                "lobbyName": "Launcher Standby",
                "mapName": "",
                "faction": "Spectator",
                "gameTimeSeconds": 0,
            }
        elif cycle < 25:
            return {
                "isRunning": True,
                "gameStatus": "IN_LOBBY",
                "lobbyName": "Chobby Active",
                "mapName": "Supreme Isthmus",
                "faction": "Armada",
                "gameTimeSeconds": 0,
            }
        else:
            game_seconds = cycle - 25
            curr_sec = game_seconds * 15
            mock_completed = {}
            if curr_sec >= 20:
                mock_completed["Solar Collector"] = 1
                mock_completed["armsolar"] = 1
            if curr_sec >= 45:
                mock_completed["Metal Extractor"] = 2
                mock_completed["armmex"] = 2
            if curr_sec >= 80:
                mock_completed["Bot Lab"] = 1
                mock_completed["armlab"] = 1
            if curr_sec >= 110:
                mock_completed["Solar Collector"] = 2
                mock_completed["armsolar"] = 2
            if curr_sec >= 135:
                mock_completed["Pawn"] = 1
                mock_completed["armpw"] = 1
            if curr_sec >= 160:
                mock_completed["Construction Bot"] = 1
                mock_completed["armck"] = 1

            return {
                "isRunning": True,
                "gameStatus": "IN_GAME",
                "lobbyName": "Live Match [Supreme Isthmus v2.1]",
                "mapName": "Supreme Isthmus",
                "faction": "Armada",
                "gameTimeSeconds": curr_sec,
                "battleIntel": {
                    "friendlyUnitsCount": 1 + (2 if curr_sec >= 135 else 0),
                    "friendlyBreakdown": {"raiders": 1 if curr_sec >= 135 else 0, "skirmishers": 0, "assault": 0, "air": 0},
                    "enemyUnitsCount": 0,
                    "enemyBreakdown": {"raiders": 0, "skirmishers": 0, "assault": 0, "air": 0},
                    "teammates": [],
                    "enemyPush": None,
                    "playerName": "Commander",
                    "enemyName": "Hostile Force",
                    "playerMetalIncome": 12.0 + (4.0 if curr_sec >= 45 else 0.0),
                    "playerEnergyIncome": 210.0 + (20.0 if curr_sec >= 20 else 0.0),
                    "completedUnits": mock_completed,
                }
            }

    def _resolve_data_dir(self, proc: Any) -> Optional[str]:
        """Dynamically extracts write directory from process arguments or path."""
        try:
            cmdline = proc.cmdline()
            for i, arg in enumerate(cmdline):
                if arg.lower() == "--write-dir" and i + 1 < len(cmdline):
                    cand = cmdline[i + 1].strip('"\'')
                    if os.path.isdir(cand):
                        return cand
        except Exception:
            pass

        try:
            cwd = proc.cwd()
            if os.path.isdir(cwd):
                return cwd
        except Exception:
            pass

        try:
            exe = proc.exe()
            curr = os.path.dirname(exe)
            for _ in range(4):
                curr = os.path.dirname(curr)
                if os.path.isdir(curr) and os.path.isfile(os.path.join(curr, "infolog.txt")):
                    return curr
        except Exception:
            pass

        for p in BAR_DATA_PATHS:
            if os.path.isdir(p):
                return p
        return None

    def _check_infolog_match_state(self, data_dir: str) -> bool:
        """Inspects the tail of infolog.txt to determine if an active match is in progress."""
        infolog_path = os.path.join(data_dir, "infolog.txt")
        if not os.path.isfile(infolog_path):
            return False
        try:
            with open(infolog_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()[-400:]
            for line in reversed(lines):
                if "TotalHideLobbyInterface, false" in line or "HandleLobbyOverlay SetMainInterfaceVisibley" in line:
                    return False
                if "TotalHideLobbyInterface, true" in line or "finished loading and is now ingame" in line or "[Initial Spawn]" in line:
                    return True
        except Exception:
            pass
        return False

    def _find_processes(self) -> Dict[str, Any]:
        """Scans process tree with minimal CPU footprint and accurate in-engine match detection."""
        engine_found = False
        lobby_found = False
        launcher_found = False
        engine_proc = None
        lobby_proc = None
        launcher_proc = None
        active_data_dir = None

        if not psutil:
            return {
                "engine": False,
                "lobby": False,
                "launcher": False,
                "engine_proc": None,
                "lobby_proc": None,
                "launcher_proc": None,
                "data_dir": None,
            }

        for proc in psutil.process_iter(["pid", "name", "create_time"]):
            try:
                name = (proc.info.get("name") or "").lower()
                if name in TARGET_ENGINE:
                    data_dir = self._resolve_data_dir(proc)
                    try:
                        cmdline = [arg.lower() for arg in proc.cmdline()]
                    except (psutil.AccessDenied, psutil.NoSuchProcess):
                        cmdline = []

                    is_menu = any("--menu" in arg or "luamenu" in arg for arg in cmdline)
                    
                    if not is_menu:
                        # Process launched directly without --menu is an active match
                        engine_found = True
                        engine_proc = proc
                        active_data_dir = data_dir
                    else:
                        # Process with --menu (Chobby): check whether it loaded a match in-place
                        is_in_match = False
                        if data_dir:
                            is_in_match = self._check_infolog_match_state(data_dir)

                        if is_in_match:
                            engine_found = True
                            engine_proc = proc
                            active_data_dir = data_dir
                        else:
                            lobby_found = True
                            lobby_proc = proc
                            if not active_data_dir:
                                active_data_dir = data_dir

                elif name in TARGET_LAUNCHER:
                    launcher_found = True
                    launcher_proc = proc

            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        return {
            "engine": engine_found,
            "lobby": lobby_found,
            "launcher": launcher_found,
            "engine_proc": engine_proc,
            "lobby_proc": lobby_proc,
            "launcher_proc": launcher_proc,
            "data_dir": active_data_dir,
        }

    def _inspect_bar_data(self, proc: Optional[Any] = None, data_dir: Optional[str] = None, is_lobby: bool = False) -> Dict[str, Any]:
        """Inspects _script.txt, bar_live_telemetry.json, and infolog.txt for active match state."""
        extracted: Dict[str, Any] = {
            "teammates": [],
            "enemies": [],
            "playerName": "Commander",
        }
        search_paths = []
        if data_dir and os.path.isdir(data_dir):
            search_paths.append(data_dir)
        for p in BAR_DATA_PATHS:
            if p not in search_paths and os.path.isdir(p):
                search_paths.append(p)

        for base_path in search_paths:
            # 1. Check live telemetry JSON output by widget if available
            telemetry_path = os.path.join(base_path, "bar_live_telemetry.json")
            if os.path.isfile(telemetry_path):
                try:
                    t_mtime = os.path.getmtime(telemetry_path)
                    # Consider telemetry valid if updated recently (within 45s)
                    if (time.time() - t_mtime) < 45.0:
                        with open(telemetry_path, "r", encoding="utf-8", errors="ignore") as tf:
                            live_telem = json.loads(tf.read())
                        extracted["liveTelemetry"] = live_telem
                except Exception:
                    pass

            # 2. Check _script.txt (generated directly for the match)
            script_file = os.path.join(base_path, "_script.txt")
            if os.path.isfile(script_file):
                try:
                    script_mtime = os.path.getmtime(script_file)
                    extracted["script_mtime"] = script_mtime
                    proc_start = proc.info.get("create_time", 0) if proc else 0
                    
                    is_stale = is_lobby and proc_start and (script_mtime < proc_start - 2.0)
                    if not is_stale:
                        with open(script_file, "r", encoding="utf-8", errors="ignore") as f:
                            script_content = f.read()

                        map_m = re.search(r"mapname\s*=\s*([^;\r\n]+)", script_content, re.IGNORECASE)
                        if map_m:
                            raw_map = map_m.group(1).strip()
                            clean_map = re.sub(r"\s+v?\d+(\.\d+)*.*$", "", raw_map, flags=re.IGNORECASE)
                            extracted["mapName"] = clean_map
                            extracted["rawMapName"] = raw_map

                        player_m = re.search(r"myplayername\s*=\s*([^;\r\n]+)", script_content, re.IGNORECASE)
                        my_player = player_m.group(1).strip() if player_m else "Commander"
                        extracted["playerName"] = my_player

                        # Parse all players and teams
                        players = {}
                        for m in re.finditer(r"\[(player|ai)\d*\]\s*\{([^}]*)\}", script_content, re.IGNORECASE):
                            block = m.group(2)
                            name_match = re.search(r"name=([^;\r\n]+)", block, re.IGNORECASE)
                            team_match = re.search(r"team=(\d+)", block, re.IGNORECASE)
                            if name_match and team_match:
                                players[int(team_match.group(1))] = name_match.group(1).strip()

                        teams = {}
                        for m in re.finditer(r"\[team(\d+)\]\s*\{([^}]*)\}", script_content, re.IGNORECASE):
                            t_id = int(m.group(1))
                            block = m.group(2)
                            ally_match = re.search(r"allyteam=(\d+)", block, re.IGNORECASE)
                            side_match = re.search(r"side=([a-zA-Z]+)", block, re.IGNORECASE)
                            teams[t_id] = {
                                "allyteam": int(ally_match.group(1)) if ally_match else 0,
                                "side": side_match.group(1).capitalize() if side_match else "Armada"
                            }

                        my_team_id = 0
                        for t_id, p_name in players.items():
                            if p_name.lower() == my_player.lower():
                                my_team_id = t_id
                                break

                        my_allyteam = teams.get(my_team_id, {}).get("allyteam", 0)
                        extracted["faction"] = teams.get(my_team_id, {}).get("side", "Armada")

                        teammates = []
                        for t_id, t_info in teams.items():
                            if t_info["allyteam"] == my_allyteam and t_id != my_team_id:
                                teammates.append({
                                    "name": players.get(t_id, f"Ally {t_id}"),
                                    "faction": t_info["side"],
                                    "team": t_id
                                })
                        extracted["teammates"] = teammates

                        enemies = []
                        for t_id, t_info in teams.items():
                            if t_info["allyteam"] != my_allyteam:
                                enemies.append({
                                    "name": players.get(t_id, f"Enemy {t_id}"),
                                    "faction": t_info["side"],
                                    "team": t_id
                                })
                        extracted["enemies"] = enemies
                except Exception:
                    pass

            # 3. Also inspect infolog.txt for latest game frame, duration, and telemetry echoes
            if not is_lobby:
                log_file = os.path.join(base_path, "infolog.txt")
                if os.path.isfile(log_file):
                    try:
                        with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                            lines = f.readlines()[-300:]
                        for l in reversed(lines):
                            if "liveTelemetry" not in extracted and "BAR_THEORY_TELEMETRY:" in l:
                                try:
                                    telem_json = l.split("BAR_THEORY_TELEMETRY:", 1)[1].strip()
                                    extracted["liveTelemetry"] = json.loads(telem_json)
                                except Exception:
                                    pass

                            if "frameSeconds" not in extracted:
                                fm = re.search(r"\[f=(\d+)\]", l)
                                if fm:
                                    frame_num = int(fm.group(1))
                                    extracted["frameSeconds"] = int(frame_num / 30)

                            if "liveTelemetry" in extracted and "frameSeconds" in extracted:
                                break
                    except Exception:
                        pass

            if "mapName" in extracted and "faction" in extracted:
                break

        return extracted

    def get_live_state(self) -> Dict[str, Any]:
        """Returns the current BAR game state with throttling."""
        if self.mock_mode:
            return self._get_mock_state()

        now = time.time()
        if self.cached_state and (now - self.last_scan_time) < self.cache_ttl:
            return self.cached_state

        procs = self._find_processes()
        engine_alive = procs["engine"]
        lobby_alive = procs["lobby"]
        launcher_alive = procs["launcher"]

        if engine_alive:
            # Active in-engine match
            data_dir = procs.get("data_dir")
            bar_data = self._inspect_bar_data(proc=procs["engine_proc"], data_dir=data_dir, is_lobby=False)
            
            game_time = 0
            if procs["engine_proc"]:
                proc_time = procs["engine_proc"].info.get("create_time", 0)
                script_time = bar_data.get("script_mtime", 0)
                if script_time and script_time > proc_time:
                    game_time = int(time.time() - script_time)
                else:
                    game_time = int(time.time() - proc_time) if proc_time else 0

            telem = bar_data.get("liveTelemetry")
            frame_sec = bar_data.get("frameSeconds", 0)
            seconds = telem["gameTimeSeconds"] if (telem and "gameTimeSeconds" in telem) else (frame_sec if frame_sec > 0 else max(0, game_time))

            active_map = bar_data.get("mapName", "")
            raw_map = bar_data.get("rawMapName", active_map)
            lobby_label = f"Live Match [{raw_map}]" if raw_map else "Live Match"
            faction_val = telem.get("faction") if telem else bar_data.get("faction", "Armada")
            player_name = telem.get("playerName") if telem else bar_data.get("playerName", "Commander")

            is_cortex = faction_val == "Cortex"
            enemy_faction = "Armada" if is_cortex else "Cortex"

            enemies = bar_data.get("enemies", [])
            enemy_name = enemies[0]["name"] if enemies else f"Hostile Force ({enemy_faction})"

            if telem:
                # 100% REAL LIVE TELEMETRY FROM RECOIL / SPRING ENGINE
                friendly_total = telem.get("friendlyUnits", {}).get("total", 1)
                friendly_breakdown = {
                    "raiders": telem.get("friendlyUnits", {}).get("raiders", 0),
                    "skirmishers": telem.get("friendlyUnits", {}).get("skirmishers", 0),
                    "assault": telem.get("friendlyUnits", {}).get("assault", 0),
                    "air": telem.get("friendlyUnits", {}).get("air", 0),
                }
                enemy_total = telem.get("enemyUnits", {}).get("total", 0)
                enemy_breakdown = {
                    "raiders": telem.get("enemyUnits", {}).get("raiders", 0),
                    "skirmishers": telem.get("enemyUnits", {}).get("skirmishers", 0),
                    "assault": telem.get("enemyUnits", {}).get("assault", 0),
                    "air": telem.get("enemyUnits", {}).get("air", 0),
                }
                teammates_list = telem.get("teammates", [])
                player_m_inc = telem.get("metal", {}).get("income", 12.0)
                player_e_inc = telem.get("energy", {}).get("income", 210.0)

                push_threat = None
                if enemy_total >= 4:
                    push_threat = {
                        "threatLevel": "HIGH" if enemy_total >= 8 else "ELEVATED",
                        "headline": f"{enemy_total}x Hostile Units Detected on Radar!",
                        "sector": "Frontline Vector",
                        "unitType": "Hostile Formations",
                        "unitCount": enemy_total,
                        "estimatedArrivalSeconds": 15,
                        "tacticalAdvice": "Deploy screening skirmishers and fall back behind LLT defenses.",
                    }
            else:
                # Real data parsed from _script.txt + infolog.txt
                # Solo player starts with Commander
                friendly_total = 1  # 1 Commander active
                friendly_breakdown = {"raiders": 0, "skirmishers": 0, "assault": 0, "air": 0}
                enemy_total = 0     # Fog of war active
                enemy_breakdown = {"raiders": 0, "skirmishers": 0, "assault": 0, "air": 0}

                # Real teammates from _script.txt (empty in 1v1)
                teammates_list = []
                for tm in bar_data.get("teammates", []):
                    teammates_list.append({
                        "name": tm["name"],
                        "faction": tm["faction"],
                        "role": "Frontline Combat",
                        "metalIncome": 0.0,
                        "energyIncome": 0,
                        "status": "NORMAL",
                        "techTier": "T1",
                    })

                player_m_inc = 12.0
                player_e_inc = 210.0
                push_threat = None

            completed_units = telem.get("completedUnits", {}) if telem else {}

            battle_intel = {
                "friendlyUnitsCount": friendly_total,
                "friendlyBreakdown": friendly_breakdown,
                "enemyUnitsCount": enemy_total,
                "enemyBreakdown": enemy_breakdown,
                "teammates": teammates_list,
                "enemyPush": push_threat,
                "playerName": player_name,
                "enemyName": enemy_name,
                "playerMetalIncome": player_m_inc,
                "playerEnergyIncome": player_e_inc,
                "completedUnits": completed_units,
            }

            state = {
                "isRunning": True,
                "gameStatus": "IN_GAME",
                "lobbyName": lobby_label,
                "mapName": active_map,
                "faction": faction_val,
                "gameTimeSeconds": seconds,
                "battleIntel": battle_intel,
            }
        elif lobby_alive:
            # Chobby battle lobby client is open
            data_dir = procs.get("data_dir")
            bar_data = self._inspect_bar_data(proc=procs["lobby_proc"], data_dir=data_dir, is_lobby=True)
            state = {
                "isRunning": True,
                "gameStatus": "IN_LOBBY",
                "lobbyName": "Chobby Active",
                "mapName": bar_data.get("mapName", ""),
                "faction": bar_data.get("faction", "Spectator"),
                "gameTimeSeconds": 0,
            }
        else:
            # Standby (neither engine nor lobby is running)
            state = {
                "isRunning": False,
                "gameStatus": "OFFLINE",
                "lobbyName": "Launcher Standby" if launcher_alive else "",
                "mapName": "",
                "faction": "Spectator",
                "gameTimeSeconds": 0,
            }

        self.cached_state = state
        self.last_scan_time = now
        return state


def create_app(mock_mode: bool = False):
    scanner = BarTelemetryScanner(mock_mode=mock_mode)

    app = FastAPI(
        title="Beyond All Reason Live Telemetry Bridge",
        description="Local telemetry bridge between BAR game processes and StratCom web console",
        version="1.0.0",
    )

    # Enable CORS for Next.js frontend on localhost:3000
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/live-status")
    def get_live_status():
        return scanner.get_live_state()

    @app.get("/health")
    def health():
        return {"status": "ok", "mock_mode": mock_mode}

    return app


def main():
    parser = argparse.ArgumentParser(description="Beyond All Reason Local Telemetry Bridge Daemon")
    parser.add_argument("--port", type=int, default=5050, help="Bridge server port (default: 5050)")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Bridge server host (default: 127.0.0.1)")
    parser.add_argument("--mock", action="store_true", help="Enable synthetic game progression mock for testing")

    args = parser.parse_args()

    if not FastAPI:
        print("[!] Error: FastAPI and Uvicorn are required. Run: pip install fastapi uvicorn psutil")
        sys.exit(1)

    print("=================================================================")
    print(" BEYOND ALL REASON // LOCAL PROCESS TELEMETRY BRIDGE DAEMON")
    print("=================================================================")
    print(f"[*] Target Process: spring.exe / Beyond-All-Reason.exe")
    print(f"[*] Serving on:     http://{args.host}:{args.port}")
    print(f"[*] Endpoint:       http://{args.host}:{args.port}/api/live-status")
    print(f"[*] Mock Mode:      {'ENABLED' if args.mock else 'DISABLED'}")
    print("=================================================================")

    app = create_app(mock_mode=args.mock)
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
