import { handle } from '../ipc/register';
import { defaultSessionStore, SessionStore } from './store';

export function registerSessionHandlers(sessionStore: SessionStore = defaultSessionStore): void {
  handle('sessions:list', () => {
    return sessionStore.list();
  });

  handle('sessions:get', (req) => {
    return sessionStore.get(req.sessionId, { includeSeries: req.includeSeries });
  });

  handle('sessions:delete', (req) => {
    const success = sessionStore.delete(req.sessionId);
    return { success };
  });
}
