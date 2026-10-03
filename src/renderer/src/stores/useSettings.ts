import { create } from 'zustand';
import type { Settings } from '../../../core/schemas';
import { ipcClient } from '../lib/ipc-client';

export interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  update: (partial: Partial<Settings>) => Promise<boolean>;
  updateSettings: (partial: Partial<Settings>) => Promise<boolean>;
  setSettings: (settings: Settings) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  setSettings: (settings: Settings) => set({ settings, error: null }),

  load: async () => {
    set({ loading: true, error: null });
    const res = await ipcClient.invoke('settings:get');
    if (res.ok) {
      set({ settings: res.data, loading: false, error: null });
    } else {
      set({ error: res.message, loading: false });
    }
  },

  update: async (partial: Partial<Settings>) => {
    set({ loading: true, error: null });
    const res = await ipcClient.invoke('settings:set', partial);
    if (res.ok) {
      set({ settings: res.data, loading: false, error: null });
      return true;
    } else {
      set({ error: res.message, loading: false });
      return false;
    }
  },

  updateSettings: async (partial: Partial<Settings>) => {
    return get().update(partial);
  },

  reset: () => set({ settings: null, loading: false, error: null })
}));
