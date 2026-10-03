import type { Platform } from './types';
import { windowsPlatform } from './windows';

export * from './types';
export * from './windows';

export function getPlatform(): Platform {
  if (process.platform === 'win32') {
    return windowsPlatform;
  }
  return {
    candidateDataDirs: () => [],
    registeredInstallDataDir: async () => null,
    runningEngineDataDir: async () => null
  };
}
