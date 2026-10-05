import path from 'node:path';
import { app } from 'electron';
import { handle } from '../ipc/register';
import { IntelCache } from './cache';
import { IntelService } from './service';
import { fakeIntelEnabled, fixtureFetch } from './fake';

function defaultService(): IntelService {
  // e2e: recorded answers from the repo (the app runs from the project root there)
  if (fakeIntelEnabled()) return new IntelService(new IntelCache({ dir: null }), fixtureFetch(path.join(process.cwd(), 'src/main/intel/__fixtures__')));
  let dir: string | null = null;
  try {
    dir = path.join(app.getPath('userData'), 'cache');
  } catch {
    // Outside the Electron lifecycle (tests): memory only
  }
  return new IntelService(new IntelCache({ dir }));
}

export function registerIntelHandlers(service: IntelService = defaultService()): void {
  handle('intel:battles', () => service.battles());
  handle('intel:leaderboard', () => service.leaderboard());
  handle('intel:replays', (req) => service.replays(req ?? {}));
  handle('intel:replay', (req) => service.replay(req.id));
  handle('intel:balance', (req) => service.balanceChanges(req?.page ?? 1));
}
