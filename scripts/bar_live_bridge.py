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
                "lobbyName": "Chobby Battle Lobby",
                "mapName": "Supreme Isthmus",
                "faction": "Armada",
                "gameTimeSeconds": 0,
            }
        else:
            game_seconds = cycle - 25
            return {
                "isRunning": True,
                "gameStatus": "IN_GAME",
                "lobbyName": "Live Match [Supreme Isthmus v2.1]",
                "mapName": "Supreme Isthmus",
                "faction": "Armada",
                "gameTimeSeconds": game_seconds * 15,
            }

    def _find_processes(self) -> Dict[str, Any]:
        """Scans process tree with minimal CPU footprint."""
        engine_found = False
        lobby_found = False
        launcher_found = False
        engine_proc = None
        lobby_proc = None
        launcher_proc = None

        if not psutil:
            return {
                "engine": False,
                "lobby": False,
                "launcher": False,
                "engine_proc": None,
                "lobby_proc": None,
                "launcher_proc": None,
            }

        for proc in psutil.process_iter(["pid", "name", "create_time"]):
            try:
                name = (proc.info.get("name") or "").lower()
                if name in TARGET_ENGINE:
                    # Check cmdline to differentiate Chobby (battle lobby) from an active game match
                    try:
                        cmdline = [arg.lower() for arg in proc.cmdline()]
                    except (psutil.AccessDenied, psutil.NoSuchProcess):
                        cmdline = []

                    is_menu = any("--menu" in arg or "luamenu" in arg for arg in cmdline)
                    if is_menu:
                        lobby_found = True
                        lobby_proc = proc
                    else:
                        engine_found = True
                        engine_proc = proc

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
        }

    def _inspect_bar_data(self, proc: Optional[Any] = None, is_lobby: bool = False) -> Dict[str, str]:
        """Inspects _script.txt and infolog.txt for active map and faction."""
        extracted: Dict[str, str] = {}
        search_paths = list(BAR_DATA_PATHS)

        # If a process handle is passed, dynamically extract its write directory and cwd
        if proc:
            try:
                cmdline = proc.cmdline()
                for i, arg in enumerate(cmdline):
                    if arg.lower() == "--write-dir" and i + 1 < len(cmdline):
                        wdir = cmdline[i + 1].strip('"\'')
                        if os.path.isdir(wdir) and wdir not in search_paths:
                            search_paths.insert(0, wdir)
            except Exception:
                pass

            try:
                cwd = proc.cwd()
                if os.path.isdir(cwd) and cwd not in search_paths:
                    search_paths.insert(0, cwd)
            except Exception:
                pass

            try:
                exe = proc.exe()
                # Walk up from .../data/engine/recoil_.../spring.exe to .../data
                curr = os.path.dirname(exe)
                for _ in range(4):
                    curr = os.path.dirname(curr)
                    if os.path.isdir(curr) and curr not in search_paths:
                        search_paths.append(curr)
            except Exception:
                pass

        for base_path in search_paths:
            # 1. First check _script.txt (generated directly for the running match)
            script_file = os.path.join(base_path, "_script.txt")
            if os.path.isfile(script_file):
                # If we are in lobby mode, verify _script.txt was modified after this lobby started
                is_stale = False
                if is_lobby and proc:
                    try:
                        script_mtime = os.path.getmtime(script_file)
                        proc_start = proc.info.get("create_time", proc.create_time())
                        if script_mtime < (proc_start - 2.0):
                            is_stale = True
                    except Exception:
                        pass

                if not is_stale:
                    try:
                        with open(script_file, "r", encoding="utf-8", errors="ignore") as f:
                            script_content = f.read()
                            map_m = re.search(r"mapname\s*=\s*([^;\r\n]+)", script_content, re.IGNORECASE)
                            if map_m:
                                raw_map = map_m.group(1).strip()
                                clean_map = re.sub(r"\s+v?\d+(\.\d+)*.*$", "", raw_map, flags=re.IGNORECASE)
                                extracted["mapName"] = clean_map
                                extracted["rawMapName"] = raw_map

                            player_m = re.search(r"myplayername\s*=\s*([^;\r\n]+)", script_content, re.IGNORECASE)
                            my_player = player_m.group(1).strip() if player_m else None
                            
                            team_num = None
                            if my_player:
                                p_block = re.search(
                                    r"\[player\d*\]\s*\{[^}]*name=" + re.escape(my_player) + r";[^}]*team=(\d+);",
                                    script_content,
                                    re.IGNORECASE | re.DOTALL,
                                )
                                if p_block:
                                    team_num = p_block.group(1)

                            if team_num is not None:
                                t_block = re.search(
                                    r"\[team" + re.escape(team_num) + r"\]\s*\{[^}]*side=([a-zA-Z]+);",
                                    script_content,
                                    re.IGNORECASE,
                                )
                                if t_block:
                                    side_val = t_block.group(1).capitalize()
                                    if side_val in ("Armada", "Cortex"):
                                        extracted["faction"] = side_val

                            if "faction" not in extracted:
                                all_sides = re.findall(r"side\s*=\s*(armada|cortex)", script_content, re.IGNORECASE)
                                if all_sides:
                                    extracted["faction"] = all_sides[0].capitalize()
                    except Exception:
                        pass

            # 2. Also inspect infolog.txt if needed (only for active matches)
            if not is_lobby:
                log_file = os.path.join(base_path, "infolog.txt")
                if os.path.isfile(log_file) and ("mapName" not in extracted or "faction" not in extracted):
                    try:
                        with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                            lines = f.readlines()[-300:]
                            for line in lines:
                                if "mapName" not in extracted:
                                    map_match = re.search(r"Map:\s*([^\r\n]+)", line, re.IGNORECASE)
                                    if map_match:
                                        raw_map = map_match.group(1).strip()
                                        clean_map = re.sub(r"\s+v?\d+(\.\d+)*.*$", "", raw_map, flags=re.IGNORECASE)
                                        extracted["mapName"] = clean_map
                                        extracted["rawMapName"] = raw_map

                                if "faction" not in extracted:
                                    faction_match = re.search(r"side:\s*(armada|cortex)", line, re.IGNORECASE)
                                    if faction_match:
                                        extracted["faction"] = faction_match.group(1).capitalize()
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
            bar_data = self._inspect_bar_data(proc=procs["engine_proc"], is_lobby=False)
            game_time = 0
            if procs["engine_proc"]:
                try:
                    game_time = int(time.time() - procs["engine_proc"].info["create_time"])
                except Exception:
                    pass

            active_map = bar_data.get("mapName", "")
            raw_map = bar_data.get("rawMapName", active_map)
            lobby_label = f"Live Match [{raw_map}]" if raw_map else "Live Match"

            state = {
                "isRunning": True,
                "gameStatus": "IN_GAME",
                "lobbyName": lobby_label,
                "mapName": active_map,
                "faction": bar_data.get("faction", "Spectator"),
                "gameTimeSeconds": max(0, game_time),
            }
        elif lobby_alive:
            # Chobby battle lobby client is open
            bar_data = self._inspect_bar_data(proc=procs["lobby_proc"], is_lobby=True)
            state = {
                "isRunning": True,
                "gameStatus": "IN_LOBBY",
                "lobbyName": "Chobby Battle Lobby",
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
