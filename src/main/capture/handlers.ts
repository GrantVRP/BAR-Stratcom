import { handle } from '../ipc/register';
import { defaultSessionStore, type SessionStore } from '../sessions/store';
import { loadRegistry } from '../registry/loader';
import { capturePlan, listCapturePlayers } from '../../core/plans/capture';
import { parseReplayIdOrUrl, type SessionDetail } from '../../core/schemas';
import type { WidgetEvent } from '../../core/schemas/protocol';
import type { Registry } from '../../core/registry';

interface LoadedSession {
  session: SessionDetail;
  events: WidgetEvent[];
  registry: Registry;
}

/** The session's own snapshot when we have it; otherwise the default one (validation then warns W_STALE_VERSION). */
function registryFor(gameVersion: string): Registry {
  try {
    return loadRegistry(gameVersion);
  } catch {
    return loadRegistry();
  }
}

function loadSession(store: SessionStore, sessionId: string): LoadedSession {
  const session = store.get(sessionId, { includeSeries: 'events' });
  if (!session) throw new Error(`Session "${sessionId}" not found`);
  const events = (session.series?.events ?? []) as unknown as WidgetEvent[];
  return { session, events, registry: registryFor(session.meta.gameVersion) };
}

export function registerCaptureHandlers(sessionStore: SessionStore = defaultSessionStore): void {
  handle('capture:listPlayers', (req) => {
    const { session, events, registry } = loadSession(sessionStore, req.sessionId);
    return listCapturePlayers(registry, session.meta, events);
  });

  handle('capture:toPlan', (req) => {
    const replayId = parseReplayIdOrUrl(req.replayId);
    if (replayId === null) throw new Error('Not a replay id or bar-rts.com replay link');
    const { session, events, registry } = loadSession(sessionStore, req.sessionId);
    return capturePlan({
      registry,
      meta: session.meta,
      events,
      teamId: req.teamId,
      horizonSec: req.horizonSec,
      replayId,
      capturedAt: new Date().toISOString()
    });
  });
}
