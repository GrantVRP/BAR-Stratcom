import type { UnitDefRecord } from '../schemas';
import { classifyUnit, type Registry } from '../registry';

/** Body sprite of an icon (original pixel art). */
export type IconBase =
  | 'commander'
  | 'bot'
  | 'vehicle'
  | 'air'
  | 'ship'
  | 'hover'
  | 'factory'
  | 'mex'
  | 'solar'
  | 'wind'
  | 'tidal'
  | 'reactor'
  | 'converter'
  | 'storage-metal'
  | 'storage-energy'
  | 'turret'
  | 'nano'
  | 'radar'
  | 'silo'
  | 'shield'
  | 'structure';

/** Small corner badge: a mobile unit's role, or what a factory builds. */
export type IconBadge =
  | 'build'
  | 'aa'
  | 'sub'
  | 'scout'
  | 'nuke'
  | 'emp'
  | 'bot'
  | 'vehicle'
  | 'air'
  | 'ship'
  | 'hover'
  | 'amphib'
  | 'gantry';

export type FactoryDomain = 'bot' | 'vehicle' | 'air' | 'ship' | 'hover' | 'amphib' | 'gantry';

export interface IconSpec {
  base: IconBase;
  badge: IconBadge | null;
  /** 1–3, or null when the snapshot has no tech level. */
  tech: number | null;
  factionId: string | null;
}

/** Above this energy output (E/s) a generator draws as a reactor rather than a solar collector. */
export const REACTOR_MIN_ENERGY = 100;

// Factory unitDef names end in a stable type suffix (armlab, armalab, armhalab, corgant, …).
const FACTORY_SUFFIXES: Array<[RegExp, FactoryDomain]> = [
  [/(shltx|gant)(uw)?$/, 'gantry'],
  [/amsub$/, 'amphib'],
  [/f?hp$/, 'hover'],
  [/h?a?sy$/, 'ship'],
  [/h?a?vp$/, 'vehicle'],
  [/h?a?lab$/, 'bot'],
  [/(h?a?ap(uw)?|plat)$/, 'air']
];

export function factoryDomain(factoryId: string): FactoryDomain | null {
  const id = factoryId.toLowerCase();
  for (const [pattern, domain] of FACTORY_SUFFIXES) if (pattern.test(id)) return domain;
  return null;
}

const DOMAIN_BASE: Record<FactoryDomain, IconBase> = {
  bot: 'bot',
  vehicle: 'vehicle',
  air: 'air',
  ship: 'ship',
  hover: 'hover',
  amphib: 'bot',
  gantry: 'bot'
};

function mobileBase(unit: UnitDefRecord, registry: Registry): IconBase {
  if (unit.canFly) return 'air';
  for (const builder of registry.buildersOf(unit.id)) {
    const domain = builder.isFactory ? factoryDomain(builder.id) : null;
    if (domain) return DOMAIN_BASE[domain];
  }
  return 'bot';
}

function roleBadge(group: string | null): IconBadge | null {
  if (group === 'aa' || group === 'weaponaa') return 'aa';
  if (group === 'sub' || group === 'weaponsub') return 'sub';
  if (group === 'nuke') return 'nuke';
  if (group === 'emp') return 'emp';
  return null;
}

function energyBase(unit: UnitDefRecord): IconBase {
  if (unit.economy.windGenerator > 0) return 'wind';
  if (unit.economy.tidalGenerator > 0) return 'tidal';
  return unit.economy.energyMake >= REACTOR_MIN_ENERGY ? 'reactor' : 'solar';
}

function defenseSpec(group: string | null): Pick<IconSpec, 'base' | 'badge'> {
  if (group === 'nuke' || group === 'emp') return { base: 'silo', badge: roleBadge(group) };
  if (group === 'antinuke') return { base: 'shield', badge: null };
  return { base: 'turret', badge: roleBadge(group) };
}

function partsFor(unit: UnitDefRecord, registry: Registry): Pick<IconSpec, 'base' | 'badge'> {
  const group = unit.unitGroup;
  switch (classifyUnit(unit)) {
    case 'commander':
      return { base: 'commander', badge: null };
    case 'factory':
      return { base: 'factory', badge: factoryDomain(unit.id) };
    case 'builder':
      return { base: mobileBase(unit, registry), badge: 'build' };
    case 'turret':
      return { base: 'nano', badge: null };
    case 'eco-metal':
      return { base: 'mex', badge: null };
    case 'converter':
      return { base: 'converter', badge: null };
    case 'eco-energy':
      return { base: energyBase(unit), badge: null };
    case 'storage':
      return {
        base: unit.economy.energyStorage >= unit.economy.metalStorage ? 'storage-energy' : 'storage-metal',
        badge: null
      };
    case 'defense':
      return defenseSpec(group);
    case 'combat':
      return { base: mobileBase(unit, registry), badge: roleBadge(group) };
    case 'scout':
      return { base: 'air', badge: 'scout' };
    default:
      if (unit.canMove) return { base: mobileBase(unit, registry), badge: 'scout' };
      if (group === 'antinuke') return { base: 'shield', badge: null };
      return { base: unit.combat.radarDistance > 0 ? 'radar' : 'structure', badge: null };
  }
}

/** Which original sprite, badge and tech pips represent a unit, from its snapshot data only. */
export function iconSpecFor(unit: UnitDefRecord, registry: Registry): IconSpec {
  return {
    ...partsFor(unit, registry),
    tech: unit.techLevel !== null && unit.techLevel >= 1 && unit.techLevel <= 3 ? unit.techLevel : null,
    factionId: unit.factionId
  };
}
