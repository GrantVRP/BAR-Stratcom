const { contextBridge, ipcRenderer } = require("electron");

// Securely expose native desktop window controls to the overlay web frontend
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  close: () => ipcRenderer.send("overlay-close"),
  hide: () => ipcRenderer.send("overlay-hide"),
  minimize: () => ipcRenderer.send("overlay-minimize"),
  toggle: () => ipcRenderer.send("overlay-toggle"),
  setClickThrough: (enable) => ipcRenderer.send("overlay-set-click-through", enable),
  toggleClickThrough: () => ipcRenderer.send("overlay-toggle-click-through"),
  on: (channel, callback) => {
    const validChannels = ["click-through-changed", "overlay-state-changed"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  off: (channel, callback) => {
    const validChannels = ["click-through-changed", "overlay-state-changed"];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
});
