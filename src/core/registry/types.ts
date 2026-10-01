import type { UnitDefRecord } from '../schemas';

export type UnitClass =
  | 'commander'
  | 'factory'
  | 'builder'
  | 'turret'
  | 'eco-metal'
  | 'eco-energy'
  | 'converter'
  | 'storage'
  | 'defense'
  | 'combat'
  | 'scout'
  | 'other';

export type ResolveResult =
  | { kind: 'unit'; unit: UnitDefRecord }
  | { kind: 'ambiguous'; candidates: UnitDefRecord[] }
  | { kind: 'none' };

export interface Registry {
  readonly gameVersion: string;
  get(unitId: string): UnitDefRecord | undefined;
  resolve(text: string, factionId?: string): ResolveResult;
  byFaction(factionId: string): UnitDefRecord[];
  commanderOf(factionId: string): UnitDefRecord;
  canBuild(builderUnitId: string, unitId: string): boolean;
  buildersOf(unitId: string): UnitDefRecord[];
  classify(unitId: string): UnitClass;
}
