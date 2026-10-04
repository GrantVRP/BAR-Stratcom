import { create } from 'zustand';
import type { CoachState, Cue } from '../../../core/schemas';
import type { CoachStartRequest } from '../../../shared/ipc';
import { ipcClient } from '../lib/ipc-client';

export type CoachMode = 'live' | 'manual' | 'demo' | 'off';

export interface CoachStoreState {
  coachState: CoachState | null;
  lastCue: Cue | null;
  isRunning: boolean;
  mode: CoachMode;
  demoId: string | null;
  error: string | null;
  start: (req: CoachStartRequest) => Promise<boolean>;
  stop: () => Promise<boolean>;
  manualAction: (action: 'start' | 'pause' | 'reset') => Promise<boolean>;
  markDone: (stepId: string) => Promise<boolean>;
  setCoachState: (state: CoachState | null) => void;
  setCue: (cue: Cue | null) => void;
  subscribe: () => () => void;
  reset: () => void;
}

export const useCoach = create<CoachStoreState>()((set) => ({
  coachState: null,
  lastCue: null,
  isRunning: false,
  mode: 'off',
  demoId: null,
  error: null,

  setCoachState: (coachState) => set({ coachState }),
  setCue: (lastCue) => set({ lastCue }),

  start: async (req: CoachStartRequest) => {
    set({ error: null });
    const res = await ipcClient.invoke('coach:start', req);
    if (res.ok) {
      set({ isRunning: true, mode: req.mode, demoId: req.demoId ?? null, error: null });
      return true;
    } else {
      set({ error: res.message });
      return false;
    }
  },

  stop: async () => {
    set({ error: null });
    const res = await ipcClient.invoke('coach:stop');
    if (res.ok) {
      set({ isRunning: false, mode: 'off', demoId: null, coachState: null, error: null });
      return true;
    } else {
      set({ error: res.message });
      return false;
    }
  },

  manualAction: async (action: 'start' | 'pause' | 'reset') => {
    const res = await ipcClient.invoke('coach:manual', { action });
    return res.ok;
  },

  markDone: async (stepId: string) => {
    const res = await ipcClient.invoke('coach:markDone', { stepId });
    return res.ok;
  },

  subscribe: () => {
    const unsubUpdate = ipcClient.on('coach:update', (coachState) => {
      set({ coachState, isRunning: true });
    });
    const unsubCue = ipcClient.on('coach:cue', (lastCue) => {
      set({ lastCue });
    });

    return () => {
      unsubUpdate();
      unsubCue();
    };
  },

  reset: () =>
    set({
      coachState: null,
      lastCue: null,
      isRunning: false,
      mode: 'off',
      demoId: null,
      error: null
    })
}));
