import { useEffect } from 'react';
import { WINDOW_FACTIONS, type WindowFaction } from '../../../shared/ipc';
import { factionKey } from './faction-style';
import { ipcClient } from './ipc-client';

function windowFaction(factionId: string | null | undefined): WindowFaction | null {
  const key = factionKey(factionId);
  return (WINDOW_FACTIONS as readonly string[]).includes(key) ? (key as WindowFaction) : null;
}

/**
 * Keeps the window icon's S in this faction's colour. An unknown or missing
 * faction leaves the icon as it is, so it keeps the last faction shown.
 */
export function useWindowIconFaction(factionId: string | null | undefined): void {
  const faction = windowFaction(factionId);
  useEffect(() => {
    if (faction) void ipcClient.invoke('app:setWindowFaction', { faction });
  }, [faction]);
}
