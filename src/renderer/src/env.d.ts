/// <reference types="vite/client" />

export interface StratcomInfo {
  version: string;
  platform: string;
}

export interface StratcomAPI {
  getInfo: () => Promise<StratcomInfo>;
}

declare global {
  interface Window {
    stratcom: StratcomAPI;
  }
}
