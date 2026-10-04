import { create } from 'zustand';
import type { Faction, UnitDefRecord, UnitSnapshot } from '../../../core/schemas';
import { ipcClient } from '../lib/ipc-client';
import { setClientRegistryMeta } from '../lib/registry';

export interface SnapshotState {
  snapshot: UnitSnapshot | null;
  unitsById: Map<string, UnitDefRecord>;
  /** From data/factions.json (registry:getMeta); empty until loaded. */
  factions: Faction[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  getUnit: (unitId: string) => UnitDefRecord | undefined;
  getUnitName: (unitId?: string) => string;
}

export const useSnapshot = create<SnapshotState>()((set, get) => ({
  snapshot: null,
  unitsById: new Map(),
  factions: [],
  loading: false,
  error: null,

  load: async () => {
    if (get().snapshot) return;
    set({ loading: true, error: null });
    const [res, meta] = await Promise.all([
      ipcClient.invoke('registry:getSnapshot'),
      ipcClient.invoke('registry:getMeta')
    ]);
    if (meta.ok) {
      setClientRegistryMeta(meta.data);
      set({ factions: meta.data.factions.factions });
    }
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
