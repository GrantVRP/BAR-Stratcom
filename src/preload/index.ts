import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('stratcom', {
  getInfo: () => ipcRenderer.invoke('app:getInfo')
});
