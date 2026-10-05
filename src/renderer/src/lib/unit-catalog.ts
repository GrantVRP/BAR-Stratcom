import type { Registry, UnitClass } from '../../../core/registry';
import { classifyUnit } from '../../../core/registry';
import type { UnitDefRecord } from '../../../core/schemas';

export const CLASS_LABELS: Record<UnitClass, string> = {
  commander: 'COMMANDER',
  factory: 'FACTORY',
  builder: 'BUILDER',
  turret: 'NANO TURRET',
  'eco-metal': 'METAL',
  'eco-energy': 'ENERGY',
  converter: 'CONVERTER',
  storage: 'STORAGE',
  defense: 'DEFENSE',
  combat: 'COMBAT',
  scout: 'SCOUT',
  other: 'OTHER'
};

const CLASS_ORDER = Object.keys(CLASS_LABELS) as UnitClass[];

export interface CatalogFilter {
  factionId: string;
  unitClass: UnitClass | 'all';
  tech: number | 'all';
  query: string;
  /** When set, only these units are listed (see `buildableFrom`). */
  only?: ReadonlySet<string>;
}

/**
 * Units a normal game can produce: the faction's commanders and everything reachable through build
 * options from them. Hides game-mode variants (evolving commander levels, drones, scavenger units).
 */
export function buildableFrom(registry: Registry, commanderIds: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const queue = commanderIds.filter((id) => registry.get(id));
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of registry.get(id)?.buildOptions ?? []) if (!seen.has(next) && registry.get(next)) queue.push(next);
  }
  return seen;
}

export interface CatalogEntry {
  unit: UnitDefRecord;
  unitClass: UnitClass;
  /** How the search matched: an alias or exact name/id is shown first. */
  match: 'exact' | 'text' | null;
}

function textMatch(unit: UnitDefRecord, q: string): boolean {
  return [unit.name, unit.id, unit.tooltip].some((s) => s.toLowerCase().includes(q));
}

/**
 * Units of one faction filtered by class, tech and search (name, alias or id). An exact
 * name/alias/id hit (via the registry, e.g. the legacy name "Rocko") comes first; otherwise
 * units sort by tech, class and metal cost.
 */
export function filterCatalog(registry: Registry, filter: CatalogFilter): CatalogEntry[] {
  const q = filter.query.trim().toLowerCase();
  const resolved = q ? registry.resolve(filter.query, filter.factionId) : { kind: 'none' as const };
  const exactIds = new Set(
    resolved.kind === 'unit' ? [resolved.unit.id] : resolved.kind === 'ambiguous' ? resolved.candidates.map((u) => u.id) : []
  );

  const entries: CatalogEntry[] = [];
  for (const unit of registry.byFaction(filter.factionId)) {
    if (filter.only && !filter.only.has(unit.id)) continue;
    const unitClass = classifyUnit(unit);
    if (filter.unitClass !== 'all' && unitClass !== filter.unitClass) continue;
    if (filter.tech !== 'all' && unit.techLevel !== filter.tech) continue;
    const match = exactIds.has(unit.id) ? 'exact' : q && textMatch(unit, q) ? 'text' : null;
    if (q && !match) continue;
    entries.push({ unit, unitClass, match });
  }

  return entries.sort(
    (a, b) =>
      Number(b.match === 'exact') - Number(a.match === 'exact') ||
      (a.unit.techLevel ?? Infinity) - (b.unit.techLevel ?? Infinity) ||
      CLASS_ORDER.indexOf(a.unitClass) - CLASS_ORDER.indexOf(b.unitClass) ||
      a.unit.metalCost - b.unit.metalCost ||
      a.unit.name.localeCompare(b.unit.name)
  );
}

/** Tech levels present in a faction (for the tech chips). */
export function techLevelsOf(registry: Registry, factionId: string): number[] {
  const levels = new Set<number>();
  for (const u of registry.byFaction(factionId)) if (u.techLevel !== null) levels.add(u.techLevel);
  return [...levels].sort((a, b) => a - b);
}
