import type { AliasesFile, Faction, FactionsFile, UnitDefRecord, UnitSnapshot } from '../schemas';
import type { Registry, ResolveResult, UnitClass } from './types';

export function normalizeLookupKey(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function classifyUnit(unit: UnitDefRecord): UnitClass {
  if (unit.isCommander) return 'commander';
  if (unit.isFactory) return 'factory';
  if (unit.isBuilder && unit.canMove) return 'builder';
  if (unit.isBuilder && !unit.canMove) return 'turret';
  if (unit.economy.extractsMetal > 0) return 'eco-metal';
  if (unit.economy.converter !== null) return 'converter';
  if (
    unit.isBuilding &&
    (unit.economy.energyMake > 0 || unit.economy.windGenerator > 0 || unit.economy.tidalGenerator > 0)
  ) {
    return 'eco-energy';
  }
  if (unit.isBuilding && (unit.economy.energyStorage > 0 || unit.economy.metalStorage > 0)) {
    return 'storage';
  }
  if (unit.isBuilding && unit.combat.maxWeaponRange > 0) return 'defense';
  if (unit.canMove && unit.combat.maxWeaponRange > 0) return 'combat';
  if (unit.canFly && unit.combat.maxWeaponRange === 0 && !unit.isBuilder) return 'scout';
  return 'other';
}

export function createRegistry(
  snapshot: UnitSnapshot,
  factions: FactionsFile,
  aliases: AliasesFile
): Registry {
  const unitsById = new Map<string, UnitDefRecord>();
  const unitsByFaction = new Map<string, UnitDefRecord[]>();
  const nameMap = new Map<string, UnitDefRecord[]>();
  const aliasMap = new Map<string, UnitDefRecord[]>();
  const buildersByTargetId = new Map<string, UnitDefRecord[]>();
  const factionsById = new Map<string, Faction>();

  // Index factions
  for (const f of factions.factions) {
    factionsById.set(f.id, f);
  }

  // Index snapshot units
  for (const unit of snapshot.units) {
    const idKey = normalizeLookupKey(unit.id);
    unitsById.set(idKey, unit);

    if (unit.factionId) {
      const list = unitsByFaction.get(unit.factionId) ?? [];
      list.push(unit);
      unitsByFaction.set(unit.factionId, list);
    }

    const nameKey = normalizeLookupKey(unit.name);
    if (nameKey) {
      const list = nameMap.get(nameKey) ?? [];
      list.push(unit);
      nameMap.set(nameKey, list);
    }

    // Index build options for buildersOf
    for (const opt of unit.buildOptions) {
      const optKey = normalizeLookupKey(opt);
      const list = buildersByTargetId.get(optKey) ?? [];
      list.push(unit);
      buildersByTargetId.set(optKey, list);
    }
  }

  // Index aliases
  for (const entry of aliases.aliases) {
    const unit = unitsById.get(normalizeLookupKey(entry.unitId));
    if (!unit) continue;

    const aliasKey = normalizeLookupKey(entry.alias);
    if (!aliasKey) continue;

    const list = aliasMap.get(aliasKey) ?? [];
    if (!list.some((u) => u.id === unit.id)) {
      list.push(unit);
    }
    aliasMap.set(aliasKey, list);
  }

  return {
    gameVersion: snapshot.gameVersion,

    get(unitId: string): UnitDefRecord | undefined {
      return unitsById.get(normalizeLookupKey(unitId));
    },

    resolve(text: string, factionId?: string): ResolveResult {
      const key = normalizeLookupKey(text);
      if (!key) {
        return { kind: 'none' };
      }

      // 1. Exact unitId
      const exact = unitsById.get(key);
      if (exact) {
        if (!factionId || exact.factionId === null || exact.factionId === factionId) {
          return { kind: 'unit', unit: exact };
        }
        return { kind: 'none' };
      }

      // 2. Exact current name
      const nameMatches = nameMap.get(key);
      if (nameMatches && nameMatches.length > 0) {
        let candidates = nameMatches;
        if (factionId) {
          candidates = candidates.filter((u) => u.factionId === null || u.factionId === factionId);
        }
        if (candidates.length === 1 && candidates[0]) {
          return { kind: 'unit', unit: candidates[0] };
        }
        if (candidates.length > 1) {
          return { kind: 'ambiguous', candidates };
        }
        return { kind: 'none' };
      }

      // 3. Exact alias
      const aliasMatches = aliasMap.get(key);
      if (aliasMatches && aliasMatches.length > 0) {
        let candidates = aliasMatches;
        if (factionId) {
          candidates = candidates.filter((u) => u.factionId === null || u.factionId === factionId);
        }
        if (candidates.length === 1 && candidates[0]) {
          return { kind: 'unit', unit: candidates[0] };
        }
        if (candidates.length > 1) {
          return { kind: 'ambiguous', candidates };
        }
        return { kind: 'none' };
      }

      return { kind: 'none' };
    },

    byFaction(factionId: string): UnitDefRecord[] {
      return unitsByFaction.get(factionId) ?? [];
    },

    commanderOf(factionId: string): UnitDefRecord {
      const faction = factionsById.get(factionId);
      const commanderId = faction?.commanderIds[0];
      if (!faction || !commanderId) {
        throw new Error(`Unknown faction or no commander configured for: ${factionId}`);
      }
      const commander = unitsById.get(normalizeLookupKey(commanderId));
      if (!commander) {
        throw new Error(`Commander unit "${commanderId}" not found in snapshot for faction "${factionId}"`);
      }
      return commander;
    },

    canBuild(builderUnitId: string, unitId: string): boolean {
      const builder = unitsById.get(normalizeLookupKey(builderUnitId));
      if (!builder) return false;
      const targetKey = normalizeLookupKey(unitId);
      return builder.buildOptions.some((opt) => normalizeLookupKey(opt) === targetKey);
    },

    buildersOf(unitId: string): UnitDefRecord[] {
      return buildersByTargetId.get(normalizeLookupKey(unitId)) ?? [];
    },

    classify(unitId: string): UnitClass {
      const unit = unitsById.get(normalizeLookupKey(unitId));
      if (!unit) {
        throw new Error(`Unit not found in registry: ${unitId}`);
      }
      return classifyUnit(unit);
    }
  };
}
