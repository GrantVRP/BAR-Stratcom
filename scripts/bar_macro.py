import ctypes
from ctypes import wintypes
import time
import os
import sys

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

OpenDesktopW = user32.OpenDesktopW
SetThreadDesktop = user32.SetThreadDesktop
EnumDesktopWindows = user32.EnumDesktopWindows
GetWindowTextW = user32.GetWindowTextW
GetWindowTextLengthW = user32.GetWindowTextLengthW
IsWindowVisible = user32.IsWindowVisible
IsIconic = user32.IsIconic
ShowWindow = user32.ShowWindow
BringWindowToTop = user32.BringWindowToTop
SetForegroundWindow = user32.SetForegroundWindow
SwitchToThisWindow = user32.SwitchToThisWindow
keybd_event = user32.keybd_event
VkKeyScanW = user32.VkKeyScanW
MapVirtualKeyW = user32.MapVirtualKeyW

GENERIC_ALL = 0x10000000
KEYEVENTF_KEYUP = 0x0002
VK_RETURN = 0x0D
SCAN_RETURN = 0x1C
VK_SHIFT = 0x10
SCAN_SHIFT = 0x2A
VK_MENU = 0x12  # Alt

def attach_to_desktop():
    hdesk = OpenDesktopW("default", 0, False, GENERIC_ALL)
    if not hdesk:
        hdesk = user32.OpenInputDesktop(0, False, GENERIC_ALL)
    if hdesk:
        SetThreadDesktop(hdesk)
    return hdesk

def find_bar_window():
    attach_to_desktop()
    results = []
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_int, wintypes.HWND, wintypes.LPARAM)

    def callback(hwnd, lparam):
        length = GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            GetWindowTextW(hwnd, buff, length + 1)
            results.append((hwnd, buff.value))
        return 1

    user32.EnumWindows(WNDENUMPROC(callback), 0)

    # 1. Prefer Spring 3D engine window
    for hwnd, title in results:
        t_low = title.lower()
        if "beyond all reason (spring" in t_low or "recoil" in t_low:
            return hwnd, title, True

    # 2. Fallback to general BAR launcher window (ignoring browsers)
    browser_names = ["chrome", "edge", "firefox", "brave", "opera", "code", "theory-app", "stratcom"]
    for hwnd, title in results:
        t_low = title.lower()
        if "beyond all reason" in t_low and not any(b in t_low for b in browser_names):
            return hwnd, title, False

    return None, None, False

def activate_window(hwnd):
    attach_to_desktop()
    
    # Restore if minimized
    if IsIconic(hwnd):
        ShowWindow(hwnd, 9)  # SW_RESTORE
    else:
        ShowWindow(hwnd, 5)  # SW_SHOW
        
    BringWindowToTop(hwnd)
    
    # Force foreground switch via SwitchToThisWindow
    SwitchToThisWindow(hwnd, True)
    
    # Alt-key trick to bypass Windows SetForegroundWindow lock
    keybd_event(VK_MENU, 0x38, 0, 0)
    time.sleep(0.02)
    keybd_event(VK_MENU, 0x38, KEYEVENTF_KEYUP, 0)
    
    SetForegroundWindow(hwnd)
    time.sleep(0.35)

def press_hardware_key(vk, scan, hold_sec=0.06):
    keybd_event(vk, scan, 0, 0)
    time.sleep(hold_sec)
    keybd_event(vk, scan, KEYEVENTF_KEYUP, 0)
    time.sleep(0.04)

def type_char_hardware(ch):
    vks = VkKeyScanW(ord(ch))
    vk = vks & 0xFF
    shift = bool((vks >> 8) & 1)
    scan = MapVirtualKeyW(vk, 0)
    
    if shift:
        keybd_event(VK_SHIFT, SCAN_SHIFT, 0, 0)
        time.sleep(0.02)
        
    keybd_event(vk, scan, 0, 0)
    time.sleep(0.04)
    keybd_event(vk, scan, KEYEVENTF_KEYUP, 0)
    time.sleep(0.02)
    
    if shift:
        keybd_event(VK_SHIFT, SCAN_SHIFT, KEYEVENTF_KEYUP, 0)
        time.sleep(0.02)

def type_string_hardware(s):
    for ch in s:
        type_char_hardware(ch)

def trigger_bar_reload():
    # 1. Also write a file-based trigger directly into BAR data dir
    bar_paths = [
        r"D:\BAR\Beyond-All-Reason\data",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Beyond-All-Reason\data"),
        os.path.expandvars(r"%APPDATA%\Beyond All Reason\data"),
    ]
    for bp in bar_paths:
        if os.path.exists(bp):
            try:
                tf = os.path.join(bp, "bar_reload_trigger.txt")
                with open(tf, "w") as f:
                    f.write(str(time.time()))
            except Exception as e:
                pass

    # 2. Find BAR window
    hwnd, title, is_spring = find_bar_window()
    if not hwnd:
        print("ERROR: Beyond All Reason window not found.")
        return False

    print(f"Targeting: HWND {hwnd} ('{title}') [isSpring: {is_spring}]")
    
    # 3. Bring window to front
    activate_window(hwnd)

    # 4. If this is the active 3D match, inject the commands
    if is_spring:
        time.sleep(0.2)
        
        # Step A: Send /clear to wipe old text
        press_hardware_key(VK_RETURN, SCAN_RETURN, 0.08)
        time.sleep(0.08)
        type_string_hardware("/clear")
        time.sleep(0.08)
        press_hardware_key(VK_RETURN, SCAN_RETURN, 0.08)
        time.sleep(0.18)

        # Step B: Send /luaui reload to activate & reload the HUD
        press_hardware_key(VK_RETURN, SCAN_RETURN, 0.08)
        time.sleep(0.08)
        type_string_hardware("/luaui reload")
        time.sleep(0.08)
        press_hardware_key(VK_RETURN, SCAN_RETURN, 0.08)
        time.sleep(0.18)

    print("SUCCESS: Reload macro executed.")
    return True

if __name__ == "__main__":
    success = trigger_bar_reload()
    sys.exit(0 if success else 1)
