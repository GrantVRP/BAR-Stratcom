import { app } from 'electron';

const isPackaged = (): boolean => {
  try {
    return app.isPackaged;
  } catch {
    return true; // outside Electron: treat as packaged
  }
};

/**
 * electron-vite's dev server URL, honoured only in a non-packaged build and only on this machine
 * (windows never load remote content, a packaged app always loads its own files).
 */
export function devRendererUrl(env: NodeJS.ProcessEnv = process.env, packaged: boolean = isPackaged()): string | null {
  const url = env.ELECTRON_RENDERER_URL;
  if (!url || packaged) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1') ? url : null;
  } catch {
    return null;
  }
}
