const { app, BrowserWindow, globalShortcut, screen, ipcMain, Tray, Menu, nativeImage } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Disable hardware acceleration to eliminate GPU process crashes with transparent windows
app.disableHardwareAcceleration();

console.log("[Electron] Starting BAR StratCom Tactical Overlay...");
app.name = "bar-stratcom-overlay";
const customUserData = path.join(app.getPath("appData"), "bar-stratcom-overlay");
try {
  if (!fs.existsSync(customUserData)) {
    fs.mkdirSync(customUserData, { recursive: true });
  }
  app.setPath("userData", customUserData);
  console.log("[Electron] Custom userData set to:", customUserData);
} catch (err) {
  console.warn("Could not set custom userData directory:", err);
}

let overlayWindow = null;
let isClickThrough = false;
let tray = null;
let hotkeyProcess = null;

function startHardwareHotkeyDaemon() {
  try {
    const daemonScript = path.join(__dirname, "..", "scripts", "hotkey_daemon.py");
    if (fs.existsSync(daemonScript)) {
      console.log("[Electron] Spawning hardware hotkey daemon via python:", daemonScript);
      hotkeyProcess = spawn("py", [daemonScript], {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      hotkeyProcess.stdout.on("data", (data) => {
        console.log(data.toString().trim());
      });
      hotkeyProcess.stderr.on("data", (data) => {
        console.warn("[HotkeyDaemon Err]", data.toString().trim());
      });
      hotkeyProcess.on("close", (code) => {
        console.log("[Electron] Hotkey daemon process exited with code:", code);
      });
    }
  } catch (err) {
    console.warn("[Electron] Could not spawn hotkey daemon:", err);
  }
}

function toggleOverlay() {
  console.log("[Electron] toggleOverlay called");
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow();
    return;
  }
  if (overlayWindow.isVisible()) {
    console.log("[Electron] Window is visible -> hiding");
    overlayWindow.hide();
  } else {
    console.log("[Electron] Window is hidden -> showing and focusing");
    overlayWindow.show();
    overlayWindow.setAlwaysOnTop(true, "screen-saver");
    overlayWindow.focus();
  }
}

function toggleClickThrough() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  isClickThrough = !isClickThrough;
  console.log("[Electron] Toggled click-through to:", isClickThrough);
  overlayWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
  overlayWindow.webContents.send("click-through-changed", isClickThrough);
}

// External Command Signal Poller: Checks for overlay_cmd.txt every 150ms
const candidateCmdPaths = [
  "D:\\BAR\\Beyond-All-Reason\\data\\overlay_cmd.txt",
  path.join(customUserData, "overlay_cmd.txt"),
];

function checkCommandSignals() {
  for (const p of candidateCmdPaths) {
    try {
      if (fs.existsSync(p)) {
        const cmd = fs.readFileSync(p, "utf8").trim().toLowerCase();
        try { fs.unlinkSync(p); } catch (e) { fs.writeFileSync(p, "", "utf8"); }
        if (cmd === "toggle") {
          console.log("[Electron] File signal 'toggle' detected from:", p);
          toggleOverlay();
          break;
        } else if (cmd === "hide") {
          console.log("[Electron] File signal 'hide' detected from:", p);
          if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
          break;
        } else if (cmd === "show") {
          console.log("[Electron] File signal 'show' detected from:", p);
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.show();
            overlayWindow.setAlwaysOnTop(true, "screen-saver");
            overlayWindow.focus();
          }
          break;
        }
      }
    } catch (e) {
      // Ignore transient file lock races
    }
  }
}
setInterval(checkCommandSignals, 30);

// Ensure single instance with focus transfer
const gotTheLock = app.requestSingleInstanceLock();
console.log("[Electron] Single instance lock acquired:", gotTheLock);
if (!gotTheLock) {
  console.log("BAR StratCom Overlay is already running. Transferred focus to existing instance.");
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  console.log("[Electron] Second instance launched - bringing active overlay to front.");
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (overlayWindow.isMinimized()) overlayWindow.restore();
    overlayWindow.show();
    overlayWindow.setAlwaysOnTop(true, "screen-saver");
    overlayWindow.focus();
  }
});

// Bounds persistence file
function getBoundsFile() {
  return path.join(customUserData, "overlay-bounds.json");
}

function loadSavedBounds() {
  try {
    const file = getBoundsFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      return data;
    }
  } catch (e) {
    console.warn("Could not read saved bounds:", e);
  }
  return null;
}

function saveCurrentBounds() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  try {
    const bounds = overlayWindow.getBounds();
    fs.writeFileSync(getBoundsFile(), JSON.stringify(bounds), "utf8");
  } catch (e) {
    console.warn("Could not save bounds:", e);
  }
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const saved = loadSavedBounds();
  const defaultWidth = 390;
  const defaultHeight = 640;

  const x = saved && typeof saved.x === "number" ? saved.x : Math.max(20, screenWidth - defaultWidth - 30);
  const y = saved && typeof saved.y === "number" ? saved.y : 60;
  const width = saved && typeof saved.width === "number" ? saved.width : defaultWidth;
  const height = saved && typeof saved.height === "number" ? saved.height : defaultHeight;

  console.log("Creating BrowserWindow...");
  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 320,
    minHeight: 380,
    maxWidth: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    skipTaskbar: false,
    show: true, // Show immediately
    backgroundColor: "#00000000",
    title: "BAR StratCom Tactical Overlay",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Maintain live telemetry in background
    },
  });

  console.log("BrowserWindow created successfully. Window ID:", overlayWindow.id);

  // OS-Level Highest Topmost Window Level:
  // 'screen-saver' outranks DirectX and OpenGL game surfaces (Beyond All Reason / Spring RTS)
  // so clicking anywhere in the game will NOT hide or minimize the overlay!
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Escape & single-key dismiss/toggle interceptor directly inside the Electron window
  overlayWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown") {
      const k = input.key ? input.key.toLowerCase() : "";
      if (
        k === "escape" ||
        k === "f8" ||
        k === "f7" ||
        k === "insert" ||
        k === "scrolllock" ||
        k === "pause" ||
        k === "`" ||
        (k === "o" && (input.shift || input.alt || input.control))
      ) {
        console.log(`[Electron] In-window dismiss key '${input.key}' pressed: hiding window`);
        overlayWindow.hide();
        event.preventDefault();
      }
    }
  });

  const targetUrl = process.env.OVERLAY_URL || "http://localhost:3000/overlay";
  console.log("Loading URL:", targetUrl);
  overlayWindow.loadURL(targetUrl);

  overlayWindow.webContents.on("did-finish-load", async () => {
    console.log("Overlay WebContents loaded successfully.");
    try {
      setTimeout(async () => {
        if (!overlayWindow || overlayWindow.isDestroyed()) return;
        const image = await overlayWindow.webContents.capturePage();
        const screenshotPath = "C:\\Users\\grant\\AppData\\Local\\Temp\\electron_overlay_render.png";
        fs.writeFileSync(screenshotPath, image.toPNG());
        console.log("Captured overlay screenshot to:", screenshotPath);
      }, 1000);
    } catch (e) {
      console.warn("Could not capture screenshot:", e);
    }
  });

  overlayWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Overlay failed to load:", errorCode, errorDescription, validatedURL);
  });

  overlayWindow.on("ready-to-show", () => {
    console.log("Overlay window ready-to-show event fired.");
    overlayWindow.show();
    overlayWindow.setAlwaysOnTop(true, "screen-saver");
  });

  // Re-assert topmost every 3 seconds to guarantee it stays above BAR fullscreen hooks
  const topmostInterval = setInterval(() => {
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
      overlayWindow.setAlwaysOnTop(true, "screen-saver");
    }
  }, 3000);

  // Save bounds on move or resize
  overlayWindow.on("moved", saveCurrentBounds);
  overlayWindow.on("resized", saveCurrentBounds);

  overlayWindow.on("closed", () => {
    console.log("Overlay window closed.");
    clearInterval(topmostInterval);
    overlayWindow = null;
  });
}

// IPC Handlers for Frontend Window & Click-Through Controls
ipcMain.on("overlay-close", () => {
  console.log("[Electron] overlay-close received");
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
});

ipcMain.on("overlay-hide", () => {
  console.log("[Electron] overlay-hide received");
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
});

ipcMain.on("overlay-minimize", () => {
  console.log("[Electron] overlay-minimize received");
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.minimize();
  }
});

ipcMain.on("overlay-toggle", () => {
  console.log("[Electron] overlay-toggle received via IPC");
  toggleOverlay();
});

ipcMain.on("overlay-set-click-through", (event, enable) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  isClickThrough = Boolean(enable);
  console.log("[Electron] Set click-through:", isClickThrough);
  overlayWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
  overlayWindow.webContents.send("click-through-changed", isClickThrough);
});

ipcMain.on("overlay-toggle-click-through", () => {
  toggleClickThrough();
});

function createSystemTray() {
  try {
    const iconCandidates = [
      path.join(__dirname, "..", "public", "bar-metal.png"),
      path.join(__dirname, "..", "public", "metal.png"),
    ];
    let iconFile = iconCandidates.find((f) => fs.existsSync(f));
    if (iconFile) {
      tray = new Tray(iconFile);
      tray.setToolTip("BAR Tactical Overlay (Press F8 or Click to Toggle)");
      const contextMenu = Menu.buildFromTemplate([
        { label: "Toggle Overlay [F8 / Insert]", click: () => toggleOverlay() },
        { label: "Toggle Ghost Pass-Through [Ctrl+Shift+T]", click: () => toggleClickThrough() },
        { type: "separator" },
        { label: "Show Overlay", click: () => { if (overlayWindow) { overlayWindow.show(); overlayWindow.setAlwaysOnTop(true, "screen-saver"); } } },
        { label: "Hide Overlay", click: () => { if (overlayWindow) overlayWindow.hide(); } },
        { type: "separator" },
        { label: "Quit", click: () => app.quit() },
      ]);
      tray.setContextMenu(contextMenu);
      tray.on("click", () => {
        console.log("[Electron] Tray clicked -> toggling overlay");
        toggleOverlay();
      });
    }
  } catch (err) {
    console.warn("[Electron] Tray creation note:", err);
  }
}

app.whenReady().then(() => {
  console.log("app.whenReady fired.");
  createOverlayWindow();
  createSystemTray();
  startHardwareHotkeyDaemon();

  // Register Single-Key and Multi-Key Global In-Game Hotkeys:
  const overlayHotkeys = [
    "F8",
    "F7",
    "Insert",
    "ScrollLock",
    "`",
    "Alt+O",
    "CommandOrControl+Shift+O",
    "Shift+F8",
  ];
  overlayHotkeys.forEach((hk) => {
    try {
      const reg = globalShortcut.register(hk, () => {
        console.log(`[Electron] Global hotkey '${hk}' pressed -> toggling overlay`);
        toggleOverlay();
      });
      console.log(`[Electron] Registered global hotkey '${hk}': ${reg ? "OK" : "BUSY"}`);
    } catch (e) {
      console.warn(`[Electron] Failed to register hotkey '${hk}':`, e);
    }
  });

  const clickThroughHotkeys = ["CommandOrControl+Shift+T", "Alt+T"];
  clickThroughHotkeys.forEach((hk) => {
    try {
      const reg = globalShortcut.register(hk, () => {
        console.log(`[Electron] Global hotkey '${hk}' pressed -> toggling click-through`);
        toggleClickThrough();
      });
      console.log(`[Electron] Registered click-through hotkey '${hk}': ${reg ? "OK" : "BUSY"}`);
    } catch (e) {
      console.warn(`[Electron] Failed to register hotkey '${hk}':`, e);
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
    }
  });
});

app.on("will-quit", () => {
  if (hotkeyProcess) {
    try {
      hotkeyProcess.kill();
      console.log("[Electron] Killed hardware hotkey daemon process");
    } catch (e) {}
  }
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
