import { create } from 'zustand';
import type { SessionDetail, SessionSummary } from '../../../core/schemas';
import { ipcClient } from '../lib/ipc-client';

export interface SessionsState {
  sessions: SessionSummary[];
  latestSession: SessionDetail | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  subscribe: () => () => void;
  reset: () => void;
}

export const useSessions = create<SessionsState>()((set, get) => ({
  sessions: [],
  latestSession: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    const listRes = await ipcClient.invoke('sessions:list');
    if (!listRes.ok) {
      set({ loading: false, error: listRes.message });
      return;
    }

    const sessions = listRes.data;
    let latestSession: SessionDetail | null = null;

    // Find newest session with a report
    const newestWithReport = sessions.find((s) => s.hasReport);
    if (newestWithReport) {
      const detailRes = await ipcClient.invoke('sessions:get', {
        sessionId: newestWithReport.sessionId
      });
      if (detailRes.ok) {
        latestSession = detailRes.data;
      }
    }

    set({ sessions, latestSession, loading: false, error: null });
  },

  subscribe: () => {
    const unsubReview = ipcClient.on('review:ready', () => {
      void get().load();
    });
    return () => {
      unsubReview();
    };
  },

  reset: () => set({ sessions: [], latestSession: null, loading: false, error: null })
}));
