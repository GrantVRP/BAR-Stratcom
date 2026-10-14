import path from 'node:path';
import { app } from 'electron';
import { handle } from '../ipc/register';
import { IntelCache } from '../intel/cache';
import { fakeIntelEnabled, fixtureFetch } from '../intel/fake';
import { loadMapNotes } from './loader';
import { MinimapService } from './minimap';

function defaultService(): MinimapService {
  // e2e: recorded answers from the repo (the app runs from the project root there)
  if (fakeIntelEnabled()) return new MinimapService(new IntelCache({ dir: null }), fixtureFetch(path.join(process.cwd(), 'src/main/intel/__fixtures__')));
  let dir: string | null = null;
  try {
    dir = path.join(app.getPath('userData'), 'cache');
  } catch {
    // Outside the Electron lifecycle (tests): memory only
  }
  return new MinimapService(new IntelCache({ dir }));
}

/** Maps view IPC: the minimap of a map and its curated notes. */
export function registerMapHandlers(service: MinimapService = defaultService()): void {
  handle('maps:minimap', (req) => service.minimap(req.scriptName));
  handle('maps:notes', (req) => loadMapNotes(req.fileName));
}
