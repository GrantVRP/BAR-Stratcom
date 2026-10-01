import type { FactionsFile, RawUnitdefsExport, UnitDefRecord, UnitSnapshot } from '../schemas';
import { UnitSnapshotSchema } from '../schemas';

const RAW_EXPECTED_FIELDS = [
  'name',
  'translatedHumanName',
  'translatedTooltip',
  'metalCost',
  'energyCost',
  'buildTime',
  'buildSpeed',
  'isBuilder',
  'isFactory',
  'isBuilding',
  'canFly',
  'canMove',
  'speed',
  'health',
  'maxWeaponRange',
  'sightDistance',
  'radarDistance',
  'energyMake',
  'metalMake',
  'energyUpkeep',
  'metalUpkeep',
  'extractsMetal',
  'windGenerator',
  'tidalGenerator',
  'energyStorage',
  'metalStorage',
  'buildOptions'
] as const;

function resolveFactionId(
  id: string,
  customParams: Record<string, unknown> | undefined,
  factions: FactionsFile
): string | null {
  if (customParams && typeof customParams.faction === 'string') {
    const rawFaction = customParams.faction.toLowerCase().trim();
    for (const f of factions.factions) {
      if (f.id.toLowerCase() === rawFaction || f.unitPrefix.toLowerCase() === rawFaction) {
        return f.id;
      }
    }
  }

  const lowerId = id.toLowerCase();
  // Sort factions by unitPrefix length descending to avoid partial prefix collisions
  const sorted = [...factions.factions].sort((a, b) => b.unitPrefix.length - a.unitPrefix.length);
  for (const f of sorted) {
    if (f.unitPrefix && lowerId.startsWith(f.unitPrefix.toLowerCase())) {
      return f.id;
    }
  }

  return null;
}

export function normalizeRawUnit(
  rawUnit: Record<string, unknown>,
  globalMissingFields: string[] | undefined,
  factions: FactionsFile
): UnitDefRecord {
  const id = String(rawUnit.name ?? '');
  const name = String(rawUnit.translatedHumanName ?? rawUnit.name ?? '');
  const tooltip = String(rawUnit.translatedTooltip ?? '');

  const customParams =
    rawUnit.customParams && typeof rawUnit.customParams === 'object'
      ? (rawUnit.customParams as Record<string, unknown>)
      : undefined;

  const factionId = resolveFactionId(id, customParams, factions);

  let techLevel: number | null = null;
  if (customParams?.techlevel != null) {
    const parsed = Number(customParams.techlevel);
    techLevel = Number.isNaN(parsed) ? null : parsed;
  }

  const unitGroup = customParams?.unitgroup != null ? String(customParams.unitgroup) : null;

  const isCommander = Boolean(
    customParams?.iscommander === '1' ||
    customParams?.iscommander === 1 ||
    customParams?.iscommander === true ||
    customParams?.iscommander === 'true'
  );

  let converter: { energyPerSecond: number; metalPerEnergy: number } | null = null;
  if (customParams?.energyconv_capacity != null && customParams?.energyconv_efficiency != null) {
    const eps = Number(customParams.energyconv_capacity);
    const mpe = Number(customParams.energyconv_efficiency);
    if (!Number.isNaN(eps) && !Number.isNaN(mpe)) {
      converter = { energyPerSecond: eps, metalPerEnergy: mpe };
    }
  }

  // Combat fields with fallbacks
  const sightDistance =
    rawUnit.sightDistance != null
      ? Number(rawUnit.sightDistance)
      : rawUnit.losRadius != null
        ? Number(rawUnit.losRadius)
        : 0;

  const radarDistance =
    rawUnit.radarDistance != null
      ? Number(rawUnit.radarDistance)
      : rawUnit.radarRadius != null
        ? Number(rawUnit.radarRadius)
        : 0;

  // Build missing field list
  const missingSet = new Set<string>(globalMissingFields ?? []);

  for (const field of RAW_EXPECTED_FIELDS) {
    if (field === 'sightDistance') {
      if (rawUnit.sightDistance == null && rawUnit.losRadius == null) {
        missingSet.add('sightDistance');
      }
    } else if (field === 'radarDistance') {
      if (rawUnit.radarDistance == null && rawUnit.radarRadius == null) {
        missingSet.add('radarDistance');
      }
    } else if (rawUnit[field] == null) {
      missingSet.add(field);
    }
  }

  return {
    id,
    name,
    tooltip,
    factionId,
    techLevel,
    unitGroup,
    metalCost: Number(rawUnit.metalCost ?? 0),
    energyCost: Number(rawUnit.energyCost ?? 0),
    buildTime: Number(rawUnit.buildTime ?? 0),
    buildSpeed: Number(rawUnit.buildSpeed ?? 0),
    isBuilder: Boolean(rawUnit.isBuilder),
    isFactory: Boolean(rawUnit.isFactory),
    isBuilding: Boolean(rawUnit.isBuilding),
    isCommander,
    canFly: Boolean(rawUnit.canFly),
    canMove: Boolean(rawUnit.canMove),
    buildOptions: Array.isArray(rawUnit.buildOptions) ? rawUnit.buildOptions.map(String) : [],
    economy: {
      energyMake: Number(rawUnit.energyMake ?? 0),
      metalMake: Number(rawUnit.metalMake ?? 0),
      energyUpkeep: Number(rawUnit.energyUpkeep ?? 0),
      metalUpkeep: Number(rawUnit.metalUpkeep ?? 0),
      extractsMetal: Number(rawUnit.extractsMetal ?? 0),
      windGenerator: Number(rawUnit.windGenerator ?? 0),
      tidalGenerator: Number(rawUnit.tidalGenerator ?? 0),
      energyStorage: Number(rawUnit.energyStorage ?? 0),
      metalStorage: Number(rawUnit.metalStorage ?? 0),
      converter
    },
    combat: {
      health: Number(rawUnit.health ?? 0),
      speed: Number(rawUnit.speed ?? 0),
      maxWeaponRange: Number(rawUnit.maxWeaponRange ?? 0),
      sightDistance,
      radarDistance
    },
    missing: Array.from(missingSet).sort()
  };
}

export function normalizeRawUnitdefs(
  raw: RawUnitdefsExport,
  factions: FactionsFile,
  options?: { exportedAt?: string; source?: 'widget-export' | 'test-fixture' }
): UnitSnapshot {
  const units = raw.units.map((u) => normalizeRawUnit(u, raw.missingFields, factions));

  const snapshot: UnitSnapshot = {
    schemaVersion: 1,
    gameVersion: raw.gameVersion,
    engineVersion: raw.engineVersion,
    exportedAt: options?.exportedAt ?? '1970-01-01T00:00:00.000Z',
    source: options?.source ?? 'widget-export',
    units
  };

  return UnitSnapshotSchema.parse(snapshot);
}
