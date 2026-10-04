import { create } from 'zustand';
import type { UnitDefRecord, UnitSnapshot } from '../../../core/schemas';
import { ipcClient } from '../lib/ipc-client';

export interface SnapshotState {
  snapshot: UnitSnapshot | null;
  unitsById: Map<string, UnitDefRecord>;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  getUnit: (unitId: string) => UnitDefRecord | undefined;
  getUnitName: (unitId?: string) => string;
}

export const useSnapshot = create<SnapshotState>()((set, get) => ({
  snapshot: null,
  unitsById: new Map(),
  loading: false,
  error: null,

  load: async () => {
    if (get().snapshot) return;
    set({ loading: true, error: null });
    const res = await ipcClient.invoke('registry:getSnapshot');
    if (res.ok) {
      const snap = res.data;
      const map = new Map<string, UnitDefRecord>();
      for (const u of snap.units) {
        map.set(u.id.toLowerCase().trim(), u);
      }
      set({ snapshot: snap, unitsById: map, loading: false, error: null });
    } else {
      set({ error: res.message, loading: false });
    }
  },

  getUnit: (unitId: string) => {
    return get().unitsById.get(unitId.toLowerCase().trim());
  },

  getUnitName: (unitId?: string) => {
    if (!unitId) return 'Unknown unit';
    const unit = get().getUnit(unitId);
    return unit ? unit.name : 'Unknown unit';
  }
}));
