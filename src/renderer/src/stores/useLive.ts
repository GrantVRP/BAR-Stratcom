import { create } from 'zustand';
import type { LiveSnapshot } from '../../../core/schemas';
import type { HealthState } from '../../../shared/ipc';
import { ipcClient } from '../lib/ipc-client';

export interface LiveState {
  health: HealthState;
  snapshot: LiveSnapshot | null;
  setHealth: (health: HealthState) => void;
  setSnapshot: (snapshot: LiveSnapshot | null) => void;
  subscribe: () => () => void;
  reset: () => void;
}

const DEFAULT_HEALTH: HealthState = {
  status: 'no-bar',
  message: 'Detecting Beyond All Reason...',
  lastHeartbeat: null
};

export const useLive = create<LiveState>()((set) => ({
  health: DEFAULT_HEALTH,
  snapshot: null,

  setHealth: (health: HealthState) => set({ health }),
  setSnapshot: (snapshot: LiveSnapshot | null) => set({ snapshot }),

  subscribe: () => {
    const unsubHealth = ipcClient.on('live:health', (health) => {
      set({ health });
    });
    const unsubState = ipcClient.on('live:state', (snapshot) => {
      set({ snapshot });
    });

    return () => {
      unsubHealth();
      unsubState();
    };
  },

  reset: () => set({ health: DEFAULT_HEALTH, snapshot: null })
}));
