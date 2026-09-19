#!/usr/bin/env python3
import ctypes
import os
import sys
import time

def get_candidate_cmd_paths():
    paths = []
    bar_dir = r"D:\BAR\Beyond-All-Reason\data"
    if os.path.exists(bar_dir):
        paths.append(os.path.join(bar_dir, "overlay_cmd.txt"))
    appdata = os.environ.get("APPDATA", "")
    if appdata:
        p = os.path.join(appdata, "bar-stratcom-overlay", "overlay_cmd.txt")
        paths.append(p)
    return paths

def send_toggle_signal(cmd="toggle"):
    for p in get_candidate_cmd_paths():
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                f.write(cmd)
            print(f"[HotkeyDaemon] Dispatched '{cmd}' signal to: {p}", flush=True)
            break
        except Exception:
            pass

def main():
    print("[HotkeyDaemon] Hardware keypress detector starting...", flush=True)
    user32 = ctypes.windll.user32
    
    KEYS = {
        0x77: "F8",
        0x76: "F7",
        0x75: "F6",
        0x2D: "Insert",
        0x24: "Home",
        0x23: "End",
        0x91: "ScrollLock",
        0xC0: "Grave (~)",
        0xB3: "MediaPlayPause (Laptop F8)",
        0xB0: "MediaNextTrack",
        0xB1: "MediaPreviousTrack",
    }
    
    last_toggle = 0.0
    
    while True:
        try:
            now = time.time()
            if now - last_toggle > 0.35:
                for vk, name in KEYS.items():
                    if user32.GetAsyncKeyState(vk) & 0x8000:
                        last_toggle = now
                        print(f"[HotkeyDaemon] Physical hardware key '{name}' (0x{vk:02X}) pressed!", flush=True)
                        send_toggle_signal("toggle")
                        break
        except Exception:
            pass
        time.sleep(0.03)

if __name__ == "__main__":
    main()
