#!/usr/bin/env python3
"""
Beyond All Reason — Local Live Game & Memory Telemetry Bridge
============================================================
Lightweight companion daemon interfacing between the active Beyond All Reason
engine (spring.exe / beyond-all-reason.exe) and the StratCom web console.

Features:
- Windows process scan via psutil / ctypes for spring.exe and beyond-all-reason.exe
- Engine log inspection (infolog.txt, startscript.txt, demos) for active map,
  player faction, and connected lobby room
- Window title enumeration fallback via Windows User32 API
- REST API server on http://localhost:5050/api/live-status with CORS enabled
- Built-in Mock Simulation Mode (--mock) for instant offline testing and verification
"""

import os
import sys
import time
import json
import re
import glob
import argparse
from typing import Dict, Any, Optional

try:
    import psutil
except ImportError:
    psutil = None

try:
    import ctypes
    from ctypes import wintypes
except ImportError:
    ctypes = None

# Default search directories for BAR on Windows
BAR_DATA_PATHS = [
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Beyond-All-Reason\data"),
    os.path.expandvars(r"%APPDATA%\Beyond All Reason\data"),
    os.path.expandvars(r"%LOCALAPPDATA%\Beyond-All-Reason"),
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\beyond-all-reason"),
    os.path.expandvars(r"%USERPROFILE%\Documents\Beyond All Reason"),
    r"C:\Games\Beyond All Reason\data",
]

TARGET_PROCESSES = {
    "spring.exe",
    "beyond-all-reason.exe",
    "beyond-all-reason",
    "bar.exe",
}

class BarLiveBridge:
    def __init__(self, mock_mode: bool = False):
        self.mock_mode = mock_mode
        self.mock_start_time = time.time()
        self.mock_cycle = 0
        self.last_detected_map = "Supreme Isthmus"
        self.last_detected_faction = "Armada"
        self.last_detected_lobby = "NA Competitive 8v8 #1"
        self.game_start_timestamp: Optional[float] = None

    def find_bar_process(self) -> Optional[Dict[str, Any]]:
        """Finds any running BAR game or engine process."""
        if not psutil:
            return self._fallback_process_scan()

        for proc in psutil.process_iter(["pid", "name", "create_time", "cmdline"]):
            try:
                name = (proc.info.get("name") or "").lower()
                if name in TARGET_PROCESSES:
                    return {
                        "pid": proc.info["pid"],
                        "name": name,
                        "create_time": proc.info.get("create_time", time.time()),
                        "cmdline": proc.info.get("cmdline") or [],
                    }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return None

    def _fallback_process_scan(self) -> Optional[Dict[str, Any]]:
        """Fallback process scan using Windows tasklist."""
        try:
            import subprocess
            output = subprocess.check_output("tasklist /FO CSV /NH", shell=True, text=True)
            for line in output.splitlines():
                for target in TARGET_PROCESSES:
                    if target in line.lower():
                        return {"pid": 0, "name": target, "create_time": time.time(), "cmdline": []}
        except Exception:
            pass
        return None

    def inspect_engine_files(self) -> Dict[str, Any]:
        """Inspects infolog.txt, startscript.txt, and config directories."""
        details = {
            "map": self.last_detected_map,
            "faction": self.last_detected_faction,
            "lobbyName": self.last_detected_lobby,
        }

        found_dirs = [p for p in BAR_DATA_PATHS if os.path.exists(p)]
        if not found_dirs:
            # Look in current user drive for any recently modified infolog.txt
            alt_glob = glob.glob(os.path.expandvars(r"%LOCALAPPDATA%\**\infolog.txt"), recursive=True)
            if alt_glob:
                found_dirs.append(os.path.dirname(alt_glob[0]))

        for base_dir in found_dirs:
            # 1. Inspect startscript.txt (generated for every live battle)
            script_path = os.path.join(base_dir, "startscript.txt")
            if os.path.exists(script_path):
                try:
                    with open(script_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        map_match = re.search(r"mapname\s*=\s*([^;\r\n]+)", content, re.IGNORECASE)
                        if map_match:
                            raw_map = map_match.group(1).replace("_", " ").strip()
                            details["map"] = raw_map

                        side_match = re.search(r"side\s*=\s*([01]|armada|cortex)", content, re.IGNORECASE)
                        if side_match:
                            val = side_match.group(1).lower()
                            details["faction"] = "Cortex" if (val == "1" or "cor" in val) else "Armada"

                        game_match = re.search(r"gamename\s*=\s*([^;\r\n]+)", content, re.IGNORECASE)
                        if game_match:
                            details["lobbyName"] = game_match.group(1).strip()
                except Exception:
                    pass

            # 2. Inspect infolog.txt for recent map loads
            infolog_path = os.path.join(base_dir, "infolog.txt")
            if os.path.exists(infolog_path):
                try:
                    # Read last 300 lines of infolog
                    with open(infolog_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()[-300:]
                        for line in reversed(lines):
                            map_m = re.search(r"(?:Loading map|Map:)\s*([^\r\n]+)", line, re.IGNORECASE)
                            if map_m and not details.get("map_override"):
                                details["map"] = map_m.group(1).replace("_", " ").strip()
                                details["map_override"] = True

                            faction_m = re.search(r"(?:Faction|side):\s*(Armada|Cortex)", line, re.IGNORECASE)
                            if faction_m:
                                details["faction"] = faction_m.group(1).capitalize()
                except Exception:
                    pass

        return details

    def inspect_window_title(self) -> Optional[Dict[str, Any]]:
        """Windows API enumeration to detect live game window title."""
        if not ctypes or os.name != "nt":
            return None

        result = {"found": False, "title": ""}

        def enum_windows_callback(hwnd, extra):
            if ctypes.windll.user32.IsWindowVisible(hwnd):
                length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buff = ctypes.create_unicode_buffer(length + 1)
                    ctypes.windll.user32.GetWindowTextW(hwnd, buff, length + 1)
                    title = buff.value
                    if any(token in title.lower() for token in ["beyond all reason", "spring", "stratcom"]):
                        result["found"] = True
                        result["title"] = title
                        return False # stop enum
            return True

        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
        try:
            ctypes.windll.user32.EnumWindows(WNDENUMPROC(enum_windows_callback), 0)
        except Exception:
            pass

        return result if result["found"] else None

    def get_live_status(self, force_mock: bool = False) -> Dict[str, Any]:
        """Calculates current match state from OS process or mock simulation."""
        is_mock = self.mock_mode or force_mock

        if is_mock:
            elapsed = int(time.time() - self.mock_start_time)
            # Cycle through realistic maps every 45 seconds in mock mode
            mock_maps = [
                ("Supreme Isthmus", "Armada", "Gladiator Ranked 8v8 [Lobby #04]"),
                ("All That Glitters", "Cortex", "EU Tournament Semifinal #2"),
                ("Comet Catcher", "Armada", "1v1 Ladder Division A"),
                ("Tears of the Emperor", "Cortex", "Amphibious Warfare Casual 8v8"),
            ]
            cycle_idx = (elapsed // 60) % len(mock_maps)
            cur_map, cur_faction, cur_lobby = mock_maps[cycle_idx]
            match_seconds = elapsed % 60 + 45 # simulate game progressing from 00:45 upwards

            return {
                "isRunning": True,
                "lobbyName": cur_lobby,
                "map": cur_map,
                "faction": cur_faction,
                "gameTimeSeconds": match_seconds,
                "isMock": True,
                "bridgeStatus": "active_simulation",
            }

        # Real OS detection
        proc_info = self.find_bar_process()
        if not proc_info:
            self.game_start_timestamp = None
            return {
                "isRunning": False,
                "lobbyName": "Lobby Offline // Standby",
                "map": self.last_detected_map,
                "faction": self.last_detected_faction,
                "gameTimeSeconds": 0,
                "isMock": False,
                "bridgeStatus": "process_not_found",
            }

        # Track match duration
        if not self.game_start_timestamp:
            self.game_start_timestamp = proc_info["create_time"]

        game_duration = max(0, int(time.time() - self.game_start_timestamp))
        file_details = self.inspect_engine_files()

        # Update cached values
        if file_details.get("map"):
            self.last_detected_map = file_details["map"]
        if file_details.get("faction"):
            self.last_detected_faction = file_details["faction"]
        if file_details.get("lobbyName"):
            self.last_detected_lobby = file_details["lobbyName"]

        # Check window title for extra telemetry
        win_info = self.inspect_window_title()
        if win_info and win_info["title"]:
            title = win_info["title"]
            if "[" in title and "]" in title:
                title_map = title.split("[")[-1].split("]")[0]
                if len(title_map) > 2:
                    self.last_detected_map = title_map

        return {
            "isRunning": True,
            "lobbyName": self.last_detected_lobby,
            "map": self.last_detected_map,
            "faction": self.last_detected_faction,
            "gameTimeSeconds": game_duration,
            "isMock": False,
            "bridgeStatus": "linked_to_engine",
            "processPid": proc_info["pid"],
        }


def run_server(port: int = 5050, mock_mode: bool = False):
    """Starts the Flask or standard library HTTP daemon."""
    bridge = BarLiveBridge(mock_mode=mock_mode)

    print("=" * 65)
    print("  BEYOND ALL REASON — LOCAL LIVE GAME & TELEMETRY BRIDGE")
    print("=" * 65)
    print(f"[*] Bridge Host:    http://127.0.0.1:{port}")
    print(f"[*] Telemetry URI:  http://127.0.0.1:{port}/api/live-status")
    print(f"[*] Mock Mode:      {'ENABLED (--mock)' if mock_mode else 'STANDBY (Real Process Mode)'}")
    print(f"[*] Allowed Origin: http://localhost:3000")
    print("=" * 65)

    try:
        from flask import Flask, jsonify, request
        from flask_cors import CORS

        app = Flask("BarLiveBridge")
        # Allow requests from localhost:3000 and 127.0.0.1:3000
        CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

        @app.route("/api/live-status", methods=["GET"])
        def get_status():
            req_mock = request.args.get("mock", "").lower() in ("true", "1", "yes")
            status = bridge.get_live_status(force_mock=req_mock)
            return jsonify(status)

        @app.route("/api/mock/toggle", methods=["POST", "GET"])
        def toggle_mock():
            bridge.mock_mode = not bridge.mock_mode
            bridge.mock_start_time = time.time()
            return jsonify({"mockMode": bridge.mock_mode, "status": "toggled"})

        @app.route("/health", methods=["GET"])
        def health():
            return jsonify({"status": "ok", "time": time.time()})

        # Run Flask server quietly
        import logging
        log = logging.getLogger("werkzeug")
        log.setLevel(logging.ERROR)
        app.run(host="127.0.0.1", port=port, debug=False)

    except ImportError:
        # Fallback to Python standard library http.server if Flask is not available
        print("[!] Flask not detected; starting built-in Python http.server fallback...")
        from http.server import HTTPServer, BaseHTTPRequestHandler
        from urllib.parse import urlparse, parse_qs

        class BridgeHandler(BaseHTTPRequestHandler):
            def do_OPTIONS(self):
                self.send_response(200)
                self.send_header("Access-Control-Allow-Origin", "http://localhost:3000")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.end_headers()

            def do_GET(self):
                parsed = urlparse(self.path)
                if parsed.path == "/api/live-status":
                    qs = parse_qs(parsed.query)
                    req_mock = "mock" in qs and qs["mock"][0].lower() in ("true", "1")
                    data = bridge.get_live_status(force_mock=req_mock)
                    body = json.dumps(data).encode("utf-8")

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "http://localhost:3000")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                else:
                    self.send_response(404)
                    self.end_headers()

            def log_message(self, format, *args):
                pass # suppress noisy logs

        httpd = HTTPServer(("127.0.0.1", port), BridgeHandler)
        httpd.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Beyond All Reason Local Telemetry Bridge")
    parser.add_argument("--port", type=int, default=5050, help="Port to bind daemon (default: 5050)")
    parser.add_argument("--mock", action="store_true", help="Launch in mock simulation mode for testing")
    parser.add_argument("--test", action="store_true", help="Perform one-shot scan and exit with status code")
    args = parser.parse_args()

    if args.test:
        bridge = BarLiveBridge(mock_mode=args.mock)
        status = bridge.get_live_status()
        print(json.dumps(status, indent=2))
        sys.exit(0)

    run_server(port=args.port, mock_mode=args.mock)
