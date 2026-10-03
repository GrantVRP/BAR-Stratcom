import { create } from 'zustand';
import type { BuildPlan } from '../../../core/schemas';
import { ipcClient } from '../lib/ipc-client';

export interface PlansState {
  plans: BuildPlan[];
  activePlanId: string | null;
  loading: boolean;
  error: string | null;
  loadPlans: () => Promise<void>;
  setActivePlanId: (id: string | null) => void;
  savePlan: (plan: BuildPlan) => Promise<BuildPlan | null>;
  deletePlan: (id: string) => Promise<boolean>;
  getActivePlan: () => BuildPlan | null;
  reset: () => void;
}

export const usePlans = create<PlansState>()((set, get) => ({
  plans: [],
  activePlanId: null,
  loading: false,
  error: null,

  loadPlans: async () => {
    set({ loading: true, error: null });
    const res = await ipcClient.invoke('plans:list');
    if (res.ok) {
      set({ plans: res.data, loading: false, error: null });
    } else {
      set({ error: res.message, loading: false });
    }
  },

  setActivePlanId: (id: string | null) => set({ activePlanId: id }),

  savePlan: async (plan: BuildPlan) => {
    set({ loading: true, error: null });
    const res = await ipcClient.invoke('plans:save', plan);
    if (res.ok) {
      const saved = res.data;
      set((state) => {
        const index = state.plans.findIndex((p) => p.id === saved.id);
        const nextPlans =
          index >= 0
            ? [...state.plans.slice(0, index), saved, ...state.plans.slice(index + 1)]
            : [...state.plans, saved];
        return { plans: nextPlans, loading: false, error: null };
      });
      return saved;
    } else {
      set({ error: res.message, loading: false });
      return null;
    }
  },

  deletePlan: async (id: string) => {
    set({ loading: true, error: null });
    const res = await ipcClient.invoke('plans:delete', { id });
    if (res.ok) {
      set((state) => ({
        plans: state.plans.filter((p) => p.id !== id),
        activePlanId: state.activePlanId === id ? null : state.activePlanId,
        loading: false,
        error: null
      }));
      return true;
    } else {
      set({ error: res.message, loading: false });
      return false;
    }
  },

  getActivePlan: () => {
    const { plans, activePlanId } = get();
    if (!activePlanId) return null;
    return plans.find((p) => p.id === activePlanId) ?? null;
  },

  reset: () => set({ plans: [], activePlanId: null, loading: false, error: null })
}));
