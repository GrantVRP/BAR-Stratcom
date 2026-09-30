export interface ElectronAPI {
  isElectron: boolean;
  close: () => void;
  hide: () => void;
  minimize: () => void;
  toggle: () => void;
  setClickThrough: (enable: boolean) => void;
  toggleClickThrough: () => void;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off?: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
