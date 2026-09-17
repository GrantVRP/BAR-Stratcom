import { z } from 'zod';

// ==========================================
// Core Enums and Types
// ==========================================

export const FACTIONS = ['Armada', 'Cortex'] as const;
export type Faction = (typeof FACTIONS)[number];

export const FactionSchema = z.enum(['Armada', 'Cortex']);

export const FACTORY_TYPES = [
  'Bot Lab',
  'Vehicle Plant',
  'Aircraft Plant',
  'Shipyard',
] as const;
export type FactoryType = (typeof FACTORY_TYPES)[number];

export const FactoryTypeSchema = z.enum([
  'Bot Lab',
  'Vehicle Plant',
  'Aircraft Plant',
  'Shipyard',
]);

export const TECH_TIERS = ['T1', 'T2', 'T3'] as const;
export type TechTier = (typeof TECH_TIERS)[number];

export const TechTierSchema = z.enum(['T1', 'T2', 'T3']);

// ==========================================
// Competitive Economy & Meta Rules
// ==========================================

export const ECONOMY_RULES = {
  /** Minimum energy income (+60E) required before dropping the first production factory */
  minEnergyBeforeFactory: 60,
  /** Golden macro sustain ratio: 100 Energy generation per 10 Metal income */
  energyToMetalRatio: '100 Energy to 10 Metal (10:1 ratio)',
  /** Starting pool given to Commander at game launch */
  commanderStartingResources: {
    metal: 1000,
    energy: 1000,
    buildPower: 300,
  },
  /** Map wind vs solar evaluation criteria */
  windVsSolar: {
    minAvgWindForTurbines: 8,
    guideline:
      'If map wind average >= 8, build Wind Turbines for superior cost efficiency; if wind < 8 or volatile, prioritize Solar Collectors (+20 fixed) for guaranteed grid stability.',
  },
  /** Commander reclaim priorities */
  commanderReclaim: {
    earlyBoost:
      'Reclaim large rock clusters (250+ instant metal) or trees to fund rapid unit production without metal stalling.',
    recycleObsoletePower:
      'Reclaim early obsolete Solar Collectors once wind farms, advanced solars, or fusion reactors are established to recover 100% of their metal investment.',
  },
  /** Energy conversion specifications */
  energyConversion: {
    rate: '70E -> 1M (+5.7 Metal/sec per converter)',
    overflowTrigger:
      'Engage converters when energy storage exceeds 400+ excess to translate power surges into metal.',
  },
} as const;

export type EconomyRules = typeof ECONOMY_RULES;

export const UNIT_CATEGORIES = [
  'Unit',
  'Economy',
  'Defense',
  'Factory',
] as const;
export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

export const UnitCategorySchema = z.enum([
  'Unit',
  'Economy',
  'Defense',
  'Factory',
]);

export const UNIT_ROLES = [
  'Raider',
  'Assault',
  'Artillery',
  'Anti-Air',
  'Scout',
  'Sniper',
  'Skirmisher',
  'Riot',
  'Bomb',
  'Support',
  'Constructor',
  'Fighter',
  'Bomber',
  'Gunship',
  'Transport',
  'Energy Production',
  'Metal Extraction',
  'Energy Conversion',
  'Storage',
  'Point Defense',
] as const;
export type UnitRole = (typeof UNIT_ROLES)[number];

// ==========================================
// Interfaces
// ==========================================

export interface ResourceCost {
  metal: number;
  energy: number;
  buildTime: number; // in seconds or work units
}

export interface CombatStats {
  health: number;
  speed?: number; // elmo/s
  range?: number; // max weapon range
  dps?: number; // damage per second
  damagePerShot?: number;
  reloadTime?: number;
}

export interface EconomyStats {
  metalOutput?: number; // metal generated per second
  energyOutput?: number; // energy generated per second
  metalStorage?: number;
  energyStorage?: number;
  energyConsumption?: number; // energy consumed per second to operate
  metalConversionRate?: number; // energy needed per 1 metal converted
}

export interface BARUnit {
  id: string; // unique slug e.g. 'armada-flash'
  name: string; // Official display name e.g. 'Flash'
  codeName?: string; // Engine unit tag e.g. 'armflash'
  faction: Faction;
  category: UnitCategory;
  tier: TechTier;
  factory?: FactoryType;
  role: UnitRole;
  description: string;
  cost: ResourceCost;
  combat?: CombatStats;
  economy?: EconomyStats;
  strengths: string[];
  weaknesses: string[];
  counters?: string[]; // unit names it is effective against
  counteredBy?: string[]; // unit names that threaten it
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  unit?: BARUnit;
  suggestedAlternative?: string;
}

export interface BuildOrderValidationResult {
  valid: boolean;
  validUnits: BARUnit[];
  invalidUnits: string[];
  crossFactionUnits: {
    unitName: string;
    unitFaction: Faction;
    targetFaction: Faction;
    correctFactionAlternative?: string;
  }[];
  errors: string[];
}

export const buildPlanResponseSchema = z.object({
  openingBuildOrder: z.array(z.string()).describe(
    'Ordered step-by-step opening queue with timestamps or execution order for the Commander and initial factory'
  ),
  unitComposition: z.array(z.string()).describe(
    'Target army composition and production ratios using exclusively valid faction units'
  ),
  strategyNotes: z.string().describe(
    'Markdown-formatted tactical guide explaining power and metal economy spikes, energy stall prevention, wind vs solar trade-offs, commander reclaim usage, and timing attack execution windows'
  ),
});

export type BuildPlanResponse = z.infer<typeof buildPlanResponseSchema>;

// ==========================================
// Mock Database of Valid BAR Units & Structures
// ==========================================

export const BAR_DATABASE: readonly BARUnit[] = [
  // ----------------------------------------------------
  // Armada - T1 Bot Lab
  // ----------------------------------------------------
  {
    id: 'armada-paw',
    name: 'Paw',
    codeName: 'armpw',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Raider',
    description: 'Fast, cheap raider bot armed with twin light pulse lasers.',
    cost: { metal: 45, energy: 450, buildTime: 12 },
    combat: { health: 260, speed: 75, range: 200, dps: 48 },
    strengths: ['Early expansion harassment', 'Cheap scouting', 'Flanking unguarded mexes'],
    weaknesses: ['Low health', 'Vulnerable to Riot cannons and Light Laser Towers'],
    counters: ['Solar Collector', 'Metal Extractor', 'Lazarus'],
    counteredBy: ['Flash', 'Leveler', 'Light Laser Tower'],
  },
  {
    id: 'armada-tick',
    name: 'Tick',
    codeName: 'armflea',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Scout',
    description: 'Ultra-cheap, fast miniature spider bot for line-of-sight scouting and EMP nuisance.',
    cost: { metal: 14, energy: 160, buildTime: 4 },
    combat: { health: 55, speed: 96, range: 130, dps: 8 },
    strengths: ['Extremely cheap', 'High movement speed', 'Mountain/hill climbing'],
    weaknesses: ['Dies to a single shot from almost anything'],
    counters: ['Scouting blind spots'],
    counteredBy: ['Any armed unit', 'Light Laser Tower'],
  },
  {
    id: 'armada-rocko',
    name: 'Rocko',
    codeName: 'armrock',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Skirmisher',
    description: 'Mobile rocket skirmisher bot that outranges early static defenses.',
    cost: { metal: 95, energy: 900, buildTime: 22 },
    combat: { health: 520, speed: 52, range: 420, dps: 58 },
    strengths: ['Outranges Light Laser Towers', 'Good firing arc over hills'],
    weaknesses: ['Slow projectile speed', 'Vulnerable to fast raiders'],
    counters: ['Light Laser Tower', 'Thug'],
    counteredBy: ['Flash', 'Blitz', 'Pyros'],
  },
  {
    id: 'armada-hammer',
    name: 'Hammer',
    codeName: 'armham',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Artillery',
    description: 'Light mobile plasma artillery bot capable of lobbing shells into enemy choke points.',
    cost: { metal: 120, energy: 1100, buildTime: 26 },
    combat: { health: 640, speed: 45, range: 570, dps: 65 },
    strengths: ['High arc indirect fire', 'Forces stationary defenders to reposition'],
    weaknesses: ['Slow speed', 'High inaccuracy against moving targets'],
    counters: ['Static defenses', 'Solar farms'],
    counteredBy: ['Fast raiders', 'Gunships'],
  },
  {
    id: 'armada-jethro',
    name: 'Jethro',
    codeName: 'armjeth',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Anti-Air',
    description: 'Mobile anti-air missile bot providing perimeter air defense.',
    cost: { metal: 75, energy: 650, buildTime: 18 },
    combat: { health: 380, speed: 60, range: 600, dps: 50 },
    strengths: ['Protects bot groups from early bomber and gunship runs'],
    weaknesses: ['Cannot target ground units'],
    counters: ['Shadow', 'Banshee', 'Tornado'],
    counteredBy: ['Paw', 'Grunt', 'Flash'],
  },
  {
    id: 'armada-lazarus',
    name: 'Lazarus',
    codeName: 'armlatnk',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Support',
    description: 'Dedicated resurrection and fast nanolathe bot. Restores wrecks and repairs allies.',
    cost: { metal: 110, energy: 1300, buildTime: 24 },
    combat: { health: 310, speed: 66 },
    strengths: ['High resurrection build power', 'Reclaims metal wrecks rapidly'],
    weaknesses: ['Unarmed', 'Low durability'],
    counters: [],
    counteredBy: ['Any combat unit'],
  },

  // ----------------------------------------------------
  // Armada - T1 Vehicle Plant
  // ----------------------------------------------------
  {
    id: 'armada-flash',
    name: 'Flash',
    codeName: 'armflash',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Vehicle Plant',
    role: 'Raider',
    description: 'High-speed light assault tank armed with twin rapid-fire red lasers. Iconic Armada frontline raider.',
    cost: { metal: 105, energy: 850, buildTime: 20 },
    combat: { health: 620, speed: 82, range: 240, dps: 92 },
    strengths: ['High speed and maneuverability', 'High close-range DPS', 'Deadly in wolfpacks'],
    weaknesses: ['Terrain pathing restrictions', 'Susceptible to riot cannons and EMP'],
    counters: ['Paw', 'Grunt', 'Rocko', 'Storm'],
    counteredBy: ['Leveler', 'Stump', 'Light Laser Tower'],
  },
  {
    id: 'armada-stump',
    name: 'Stump',
    codeName: 'armstump',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Vehicle Plant',
    role: 'Assault',
    description: 'Medium battle tank with heavy armor and a reliable high-velocity plasma cannon.',
    cost: { metal: 190, energy: 1650, buildTime: 36 },
    combat: { health: 1250, speed: 50, range: 350, dps: 115 },
    strengths: ['Rugged frontline brawler', 'High durability for T1', 'Consistent cannon damage'],
    weaknesses: ['Moderate speed', 'Struggles against long-range skirmishers without cover'],
    counters: ['Flash', 'Blitz', 'Raider', 'Paw'],
    counteredBy: ['Wolverine', 'Rocko', 'Banshee'],
  },
  {
    id: 'armada-samson',
    name: 'Samson',
    codeName: 'armsam',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Vehicle Plant',
    role: 'Anti-Air',
    description: 'Mobile anti-air missile launcher truck with extended detection radar.',
    cost: { metal: 115, energy: 1100, buildTime: 25 },
    combat: { health: 580, speed: 62, range: 680, dps: 70 },
    strengths: ['Long-range missile interception against air threats', 'Solid speed'],
    weaknesses: ['Cannot attack ground forces'],
    counters: ['Shadow', 'Banshee', 'Avenger'],
    counteredBy: ['Stump', 'Flash', 'Blitz'],
  },
  {
    id: 'armada-wolverine',
    name: 'Wolverine',
    codeName: 'armarty',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Vehicle Plant',
    role: 'Artillery',
    description: 'Light mobile artillery and mine-laying vehicle for siege breaking and area denial.',
    cost: { metal: 165, energy: 1550, buildTime: 34 },
    combat: { health: 540, speed: 44, range: 650, dps: 75 },
    strengths: ['Breaks static defensive lines', 'Long range indirect barrage'],
    weaknesses: ['Frail armor', 'Requires vision and frontline screens'],
    counters: ['Light Laser Tower', 'Stump', 'Raider'],
    counteredBy: ['Flash', 'Blitz', 'Banshee'],
  },

  // ----------------------------------------------------
  // Armada - T1 Aircraft Plant
  // ----------------------------------------------------
  {
    id: 'armada-sparrow',
    name: 'Sparrow',
    codeName: 'armpeep',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Scout',
    description: 'High-altitude, high-speed reconnaissance plane for early intel gathering.',
    cost: { metal: 35, energy: 650, buildTime: 9 },
    combat: { health: 80, speed: 175, range: 0, dps: 0 },
    strengths: ['Extreme flight speed', 'Unmatched vision radius'],
    weaknesses: ['Completely unarmed', 'Shot down by any anti-air weapon'],
    counters: [],
    counteredBy: ['Jethro', 'Samson', 'Crasher'],
  },
  {
    id: 'armada-freedom-fighter',
    name: 'Freedom Fighter',
    codeName: 'armfig',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Fighter',
    description: 'T1 air superiority interceptor equipped with twin air-to-air missiles.',
    cost: { metal: 85, energy: 1700, buildTime: 20 },
    combat: { health: 240, speed: 150, range: 450, dps: 60 },
    strengths: ['Intercepts enemy scout planes, bombers, and gunships'],
    weaknesses: ['Cannot attack ground units'],
    counters: ['Shadow', 'Banshee', 'Sparrow'],
    counteredBy: ['Samson', 'Jethro', 'Defender'],
  },
  {
    id: 'armada-shadow',
    name: 'Shadow',
    codeName: 'armthund',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Bomber',
    description: 'Tactical carpet bomber designed to execute pinpoint bombing runs on economy nodes.',
    cost: { metal: 135, energy: 3200, buildTime: 32 },
    combat: { health: 420, speed: 110, range: 200, dps: 180 },
    strengths: ['High burst explosive damage on static buildings and massed units'],
    weaknesses: ['Vulnerable on turnaround approach', 'Must reload bomb bay'],
    counters: ['Metal Extractor', 'Solar Collector', 'Bot Lab'],
    counteredBy: ['Freedom Fighter', 'Avenger', 'Jethro', 'Samson'],
  },
  {
    id: 'armada-tornado',
    name: 'Tornado',
    codeName: 'armbrawl',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Gunship',
    description: 'Rotary assault gunship capable of hovering and precision pulse fire.',
    cost: { metal: 180, energy: 3800, buildTime: 38 },
    combat: { health: 680, speed: 88, range: 320, dps: 105 },
    strengths: ['Can hover in place', 'Punishes undefended raiding groups'],
    weaknesses: ['Easily countered by mobile AA'],
    counters: ['Paw', 'Flash', 'Stump', 'Pyros'],
    counteredBy: ['Jethro', 'Samson', 'Crasher'],
  },
  {
    id: 'armada-brawler',
    name: 'Brawler',
    codeName: 'armbraw',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Gunship',
    description: 'Iconic T1 heavy tactical gunship with twin rotary pulse lasers. Excels at assassinating constructors and raiding unshielded mexes.',
    cost: { metal: 280, energy: 4800, buildTime: 36 },
    combat: { health: 1250, speed: 110, range: 450, dps: 180 },
    strengths: ['High sustained DPS', 'Heavy armor for T1 air', 'Dominates unescorted land units'],
    weaknesses: ['Vulnerable to dedicated anti-air swarms (Crasher, Slasher, Avenger)'],
    counters: ['Grunt', 'Paw', 'Solar Collector', 'Metal Extractor', 'Commander'],
    counteredBy: ['Avenger', 'Crasher', 'Slasher'],
  },
  {
    id: 'armada-blade',
    name: 'Blade',
    codeName: 'armblade',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Gunship',
    description: 'EMP paralyzer gunship. Incapacitates high-threat commanders, heavy assault units, and defense turrets.',
    cost: { metal: 220, energy: 3600, buildTime: 30 },
    combat: { health: 820, speed: 125, range: 420, dps: 90 },
    strengths: ['Paralyzes heavy units', 'Disables defensive towers before ground push'],
    weaknesses: ['Low lethal damage on its own', 'Requires follow-up combat units'],
    counters: ['Commander', 'Bulldog', 'Goliath', 'Heavy Laser Tower'],
    counteredBy: ['Avenger', 'Crasher'],
  },
  {
    id: 'armada-atlas',
    name: 'Atlas',
    codeName: 'armatlas',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Transport',
    description: 'Air transport capable of ferrying commanders, constructors, and heavy assault units across rugged cliffs and waterways.',
    cost: { metal: 85, energy: 1200, buildTime: 20 },
    combat: { health: 390, speed: 140 },
    strengths: ['Bypasses terrain chokepoints', 'Enables automated ferry routes'],
    weaknesses: ['Unarmed', 'Easily shot down by fighters'],
    counters: [],
    counteredBy: ['Avenger', 'Crasher', 'Slasher'],
  },

  // ----------------------------------------------------
  // Armada - T1 Shipyard
  // ----------------------------------------------------
  {
    id: 'armada-skeeter',
    name: 'Skeeter',
    codeName: 'armpt',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Shipyard',
    role: 'Scout',
    description: 'Fast scout and patrol boat equipped with a light laser and depth charges.',
    cost: { metal: 65, energy: 750, buildTime: 16 },
    combat: { health: 320, speed: 90, range: 280, dps: 38 },
    strengths: ['Fast naval scouting', 'Light anti-submarine capability'],
    weaknesses: ['Frail hull'],
    counters: ['Lurker', 'Early naval expansion'],
    counteredBy: ['Crusader', 'Enforcer'],
  },
  {
    id: 'armada-crusader',
    name: 'Crusader',
    codeName: 'armroy',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T1',
    factory: 'Shipyard',
    role: 'Assault',
    description: 'General-purpose naval destroyer armed with twin naval deck guns and sonar.',
    cost: { metal: 280, energy: 2400, buildTime: 52 },
    combat: { health: 1850, speed: 48, range: 520, dps: 140 },
    strengths: ['Dominates coastal waters', 'High HP pool'],
    weaknesses: ['Vulnerable to torpedo bombers and massed subs'],
    counters: ['Skeeter', 'Searcher'],
    counteredBy: ['Lurker', 'Snake', 'Shadow'],
  },

  // ----------------------------------------------------
  // Armada - T2 Notable Units
  // ----------------------------------------------------
  {
    id: 'armada-zeus',
    name: 'Zeus',
    codeName: 'armzeus',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T2',
    factory: 'Bot Lab',
    role: 'Assault',
    description: 'T2 assault bot wielding lightning arc generators with heavy EMP stun capability.',
    cost: { metal: 460, energy: 4800, buildTime: 65 },
    combat: { health: 2650, speed: 56, range: 280, dps: 240 },
    strengths: ['EMP disables enemy vehicles', 'High burst arc damage'],
    weaknesses: ['Short range', 'Vulnerable to T2 artillery'],
    counters: ['Goliath', 'Reaper', 'Can'],
    counteredBy: ['Tremor', 'Pillager', 'Sharpshooter'],
  },
  {
    id: 'armada-zipper',
    name: 'Zipper',
    codeName: 'armfast',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T2',
    factory: 'Bot Lab',
    role: 'Raider',
    description: 'Hyperspeed T2 raider bot that slips through defensive perimeters to assassinate commanders and fusions.',
    cost: { metal: 190, energy: 2800, buildTime: 30 },
    combat: { health: 780, speed: 115, range: 220, dps: 135 },
    strengths: ['Blistering speed', 'Devastating backline eco raids'],
    weaknesses: ['Fragile against heavy defensive fire'],
    counters: ['Solar Collector', 'Fusion Reactor', 'T2 Constructors'],
    counteredBy: ['Light Laser Tower', 'Heavy Laser Tower'],
  },
  {
    id: 'armada-bulldog',
    name: 'Bulldog',
    codeName: 'armbull',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T2',
    factory: 'Vehicle Plant',
    role: 'Assault',
    description: 'Massive heavy assault tank boasting twin high-caliber plasma cannons and heavy composite armor.',
    cost: { metal: 880, energy: 9500, buildTime: 95 },
    combat: { health: 5800, speed: 42, range: 450, dps: 360 },
    strengths: ['Frontline breakthrough', 'Tremendous survivability'],
    weaknesses: ['Slow turn rate', 'Requires AA umbrella against heavy gunships'],
    counters: ['Reaper', 'Can', 'Stump'],
    counteredBy: ['Goliath', 'Banshee', 'Rapier'],
  },
  {
    id: 'armada-hound',
    name: 'Hound',
    codeName: 'armfido',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T2',
    factory: 'Bot Lab',
    role: 'Skirmisher',
    description: 'Fast, high-mobility skirmisher/artillery bot armed with a ballistic gauss cannon.',
    cost: { metal: 360, energy: 4100, buildTime: 42 },
    combat: { health: 1400, speed: 64, range: 560, dps: 165 },
    strengths: ['Outranges standard T1/T2 defenses', 'Can fire while repositioning', 'High single-target damage'],
    weaknesses: ['Vulnerable to swarming fast raiders (Freaker, Zipper)'],
    counters: ['Thug', 'Pyros', 'Can', 'Light Laser Tower'],
    counteredBy: ['Freaker', 'Blitz', 'Banshee'],
  },
  {
    id: 'armada-sharpshooter',
    name: 'Sharpshooter',
    codeName: 'armsnipe',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T2',
    factory: 'Bot Lab',
    role: 'Sniper',
    description: 'Long-range precision energy sniper bot. Deploys high-alpha beams to one-shot enemy commanders and heavy targets.',
    cost: { metal: 520, energy: 7800, buildTime: 50 },
    combat: { health: 750, speed: 45, range: 900, dps: 220, damagePerShot: 1800 },
    strengths: ['Outranges almost all ground units', 'Extreme single-shot burst damage', 'Stealth cloak capability'],
    weaknesses: ['Fragile hull', 'High energy drain per shot', 'Poor against massed swarm units'],
    counters: ['Commander', 'Can', 'Sumo', 'Goliath'],
    counteredBy: ['Zipper', 'Freaker', 'Brawler', 'Tornado'],
  },
  {
    id: 'armada-centurion',
    name: 'Centurion',
    codeName: 'armcent',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T2',
    factory: 'Bot Lab',
    role: 'Assault',
    description: 'Shield-bearing heavy assault bot built to absorb frontal punishment and breach fortified lines.',
    cost: { metal: 950, energy: 8600, buildTime: 65 },
    combat: { health: 4800, speed: 48, range: 380, dps: 280 },
    strengths: ['Heavy frontal shield', 'Absorbs plasma barrage', 'Frontline breaker'],
    weaknesses: ['Vulnerable to rear flanking (+100% damage)', 'Heavy build cost'],
    counters: ['Can', 'Thug', 'Raider', 'Storm'],
    counteredBy: ['Sheldon', 'Sumo', 'Heavy Laser Tower'],
  },
  {
    id: 'armada-phoenix',
    name: 'Phoenix',
    codeName: 'armpnix',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T2',
    factory: 'Aircraft Plant',
    role: 'Bomber',
    description: 'Advanced precision tactical dive-bomber designed for surgical elimination of enemy tech installations.',
    cost: { metal: 460, energy: 9800, buildTime: 48 },
    combat: { health: 1600, speed: 185, range: 500, dps: 340 },
    strengths: ['Precision dive-bombing', 'Penetrates perimeter flak', 'High structural burst damage'],
    weaknesses: ['High cost', 'Requires energy grid backing'],
    counters: ['Fusion Reactor', 'Advanced Solar', 'T2 Factories'],
    counteredBy: ['Avenger', 'Slasher', 'Flakker'],
  },
  {
    id: 'armada-kestrel',
    name: 'Kestrel',
    codeName: 'armcybr',
    faction: 'Armada',
    category: 'Unit',
    tier: 'T2',
    factory: 'Aircraft Plant',
    role: 'Gunship',
    description: 'T2 heavy armored flying fortress gunship equipped with twin heavy laser batteries.',
    cost: { metal: 580, energy: 12400, buildTime: 58 },
    combat: { health: 2900, speed: 95, range: 480, dps: 310 },
    strengths: ['Sustained heavy laser fire', 'High durability', 'Flies over terrain barriers'],
    weaknesses: ['High energy build cost', 'Vulnerable to concentrated T2 anti-air'],
    counters: ['Bulldog', 'Goliath', 'Can', 'Sumo'],
    counteredBy: ['Avenger', 'Flakker', 'Crasher'],
  },

  // ----------------------------------------------------
  // Cortex - T1 Bot Lab
  // ----------------------------------------------------
  {
    id: 'cortex-grunt',
    name: 'Grunt',
    codeName: 'corak',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Raider',
    description: 'Fast, expendable T1 raider bot equipped with twin light lasers.',
    cost: { metal: 42, energy: 420, buildTime: 11 },
    combat: { health: 240, speed: 78, range: 190, dps: 52 },
    strengths: ['Very cost-effective', 'Fast expansion and early eco disruption'],
    weaknesses: ['Low individual health'],
    counters: ['Solar Collector', 'Metal Extractor', 'Scouts'],
    counteredBy: ['Flash', 'Leveler', 'Light Laser Tower'],
  },
  {
    id: 'cortex-thug',
    name: 'Thug',
    codeName: 'corthug',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Assault',
    description: 'Tough, armored T1 infantry bot with a reliable plasma cannon.',
    cost: { metal: 125, energy: 1100, buildTime: 24 },
    combat: { health: 880, speed: 48, range: 300, dps: 82 },
    strengths: ['High durability for a T1 bot', 'Pushes through light defenses'],
    weaknesses: ['Outranged by skirmishers and artillery'],
    counters: ['Paw', 'Grunt', 'Flash'],
    counteredBy: ['Rocko', 'Storm', 'Hammer'],
  },
  {
    id: 'cortex-storm',
    name: 'Storm',
    codeName: 'corstorm',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Skirmisher',
    description: 'Rocket artillery bot designed to pick apart static defenses from safety.',
    cost: { metal: 100, energy: 950, buildTime: 22 },
    combat: { health: 500, speed: 50, range: 430, dps: 60 },
    strengths: ['Outranges Light Laser Towers', 'Good firing range'],
    weaknesses: ['Vulnerable to fast flanking raiders'],
    counters: ['Light Laser Tower', 'Thug'],
    counteredBy: ['Blitz', 'Flash', 'Pyros'],
  },
  {
    id: 'cortex-pyros',
    name: 'Pyros',
    codeName: 'corpyro',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Assault',
    description: 'Devastating frontline assault bot armed with a high-temperature flamethrower and self-destruct charge.',
    cost: { metal: 180, energy: 1900, buildTime: 32 },
    combat: { health: 1100, speed: 64, range: 180, dps: 175 },
    strengths: ['Immense close-quarters AoE flame damage', 'Melts light infantry and structures in seconds'],
    weaknesses: ['Short range', 'Vulnerable to kiting and long-range fire'],
    counters: ['Paw', 'Grunt', 'Rocko', 'Flash'],
    counteredBy: ['Rocko', 'Wolverine', 'Banshee'],
  },
  {
    id: 'cortex-crasher',
    name: 'Crasher',
    codeName: 'corcrash',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Anti-Air',
    description: 'Shoulder-mounted anti-air missile infantry bot.',
    cost: { metal: 78, energy: 680, buildTime: 18 },
    combat: { health: 390, speed: 58, range: 620, dps: 52 },
    strengths: ['Direct mobile air protection for bot columns'],
    weaknesses: ['Cannot attack ground targets'],
    counters: ['Shadow', 'Freedom Fighter', 'Tornado'],
    counteredBy: ['Grunt', 'Paw', 'Blitz'],
  },
  {
    id: 'cortex-roach',
    name: 'Roach',
    codeName: 'corroach',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Bomb',
    description: 'Crawling suicide bomb bot packed with high explosives. Capable of burrowing or detonating upon contact.',
    cost: { metal: 70, energy: 1200, buildTime: 16 },
    combat: { health: 180, speed: 72, range: 40, damagePerShot: 1200 },
    strengths: ['Huge area-of-effect suicide explosion', 'Assassination of commanders and factories'],
    weaknesses: ['Low health before detonation', 'Chain-reacts if grouped tightly'],
    counters: ['Factory clusters', 'Armored vehicle balls'],
    counteredBy: ['Rocko', 'Light Laser Tower'],
  },
  {
    id: 'cortex-necro',
    name: 'Necro',
    codeName: 'cornecro',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Bot Lab',
    role: 'Support',
    description: 'Rapid resurrection and battlefield salvage bot. Reanimates destroyed unit husks into active frontline fighters and vacuums high-value metal wrecks.',
    cost: { metal: 115, energy: 1350, buildTime: 24 },
    combat: { health: 320, speed: 68 },
    strengths: ['High resurrection build power', 'Restores destroyed enemy and friendly units', 'Fast reclaim speed'],
    weaknesses: ['Unarmed', 'Light armor requires combat escort'],
    counters: [],
    counteredBy: ['Any combat unit', 'Flash', 'Paw'],
  },

  // ----------------------------------------------------
  // Cortex - T1 Vehicle Plant
  // ----------------------------------------------------
  {
    id: 'cortex-blitz',
    name: 'Blitz',
    codeName: 'corgator',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Vehicle Plant',
    role: 'Raider',
    description: 'Nimble raider tank equipped with a fast pulse laser. Cortex answer to the Flash.',
    cost: { metal: 98, energy: 780, buildTime: 18 },
    combat: { health: 580, speed: 84, range: 230, dps: 86 },
    strengths: ['Fast hit-and-run tactics', 'Quick turn and acceleration'],
    weaknesses: ['Light armor', 'Vulnerable to static defenses'],
    counters: ['Paw', 'Grunt', 'Rocko'],
    counteredBy: ['Stump', 'Leveler', 'Light Laser Tower'],
  },
  {
    id: 'cortex-raider',
    name: 'Raider',
    codeName: 'corraid',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Vehicle Plant',
    role: 'Assault',
    description: 'Workhorse T1 medium tank with heavy armor and dependable cannon fire.',
    cost: { metal: 180, energy: 1500, buildTime: 34 },
    combat: { health: 1180, speed: 52, range: 340, dps: 108 },
    strengths: ['Cost-effective frontline battle line', 'Sturdy armor'],
    weaknesses: ['Struggles against long-range skirmishers'],
    counters: ['Flash', 'Blitz', 'Paw'],
    counteredBy: ['Wolverine', 'Rocko', 'Banshee'],
  },
  {
    id: 'cortex-leveler',
    name: 'Leveler',
    codeName: 'corlevlr',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Vehicle Plant',
    role: 'Riot',
    description: 'Short-range heavy riot tank armed with a devastating spread-shot riot cannon.',
    cost: { metal: 220, energy: 1850, buildTime: 40 },
    combat: { health: 1450, speed: 46, range: 260, dps: 160 },
    strengths: ['Absolute counter to swarming light raiders and bots', 'High burst AoE'],
    weaknesses: ['Slow movement', 'Short range makes it easy prey for skirmishers'],
    counters: ['Flash', 'Paw', 'Grunt', 'Tick'],
    counteredBy: ['Rocko', 'Storm', 'Wolverine'],
  },
  {
    id: 'cortex-slasher',
    name: 'Slasher',
    codeName: 'corsh',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Vehicle Plant',
    role: 'Anti-Air',
    description: 'Versatile rocket truck providing both surface-to-air and long-range light ground support.',
    cost: { metal: 120, energy: 1200, buildTime: 26 },
    combat: { health: 540, speed: 60, range: 650, dps: 65 },
    strengths: ['Mobile AA coverage with auxiliary ground rocket fire'],
    weaknesses: ['Fragile hull', 'Slow reload time'],
    counters: ['Shadow', 'Freedom Fighter', 'Tornado'],
    counteredBy: ['Raider', 'Stump', 'Flash'],
  },

  // ----------------------------------------------------
  // Cortex - T1 Aircraft Plant
  // ----------------------------------------------------
  {
    id: 'cortex-avenger',
    name: 'Avenger',
    codeName: 'corvamp',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Fighter',
    description: 'T1 air superiority interceptor equipped with high-velocity air-to-air laser cannons.',
    cost: { metal: 82, energy: 1650, buildTime: 19 },
    combat: { health: 230, speed: 155, range: 460, dps: 62 },
    strengths: ['High interception speed', 'Cleanses enemy bombers and scouts'],
    weaknesses: ['Unusable against ground targets'],
    counters: ['Shadow', 'Tornado', 'Sparrow'],
    counteredBy: ['Crasher', 'Slasher'],
  },
  {
    id: 'cortex-banshee',
    name: 'Banshee',
    codeName: 'corbtrans',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Gunship',
    description: 'Aggressive T1 assault gunship bristling with twin light pulse lasers for surgical ground strikes.',
    cost: { metal: 175, energy: 3600, buildTime: 36 },
    combat: { health: 650, speed: 86, range: 310, dps: 110 },
    strengths: ['Flies over terrain barriers', 'Punishes unescorted tanks and constructors'],
    weaknesses: ['Shredded by dedicated anti-air vehicles and bots'],
    counters: ['Stump', 'Raider', 'Pyros', 'Wolverine'],
    counteredBy: ['Samson', 'Jethro', 'Freedom Fighter'],
  },
  {
    id: 'cortex-valkyrie',
    name: 'Valkyrie',
    codeName: 'corvalk',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Aircraft Plant',
    role: 'Transport',
    description: 'Rugged aerial transport capable of picking up commanders, siege units, and raider tanks to drop them behind enemy lines.',
    cost: { metal: 90, energy: 1250, buildTime: 20 },
    combat: { health: 410, speed: 138 },
    strengths: ['Enables rapid cliff bypass and automated ferry lanes', 'High payload capacity'],
    weaknesses: ['Unarmed', 'Vulnerable to anti-air fighters'],
    counters: [],
    counteredBy: ['Freedom Fighter', 'Jethro', 'Samson'],
  },

  // ----------------------------------------------------
  // Cortex - T1 Shipyard
  // ----------------------------------------------------
  {
    id: 'cortex-searcher',
    name: 'Searcher',
    codeName: 'corpt',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Shipyard',
    role: 'Scout',
    description: 'Fast patrol boat armed with a light laser and sonar for perimeter coastal defense.',
    cost: { metal: 62, energy: 720, buildTime: 15 },
    combat: { health: 310, speed: 92, range: 270, dps: 36 },
    strengths: ['Inexpensive ocean scouting', 'Submarine hunting'],
    weaknesses: ['Light armor'],
    counters: ['Early naval expansion'],
    counteredBy: ['Enforcer', 'Crusader'],
  },
  {
    id: 'cortex-enforcer',
    name: 'Enforcer',
    codeName: 'corroy',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T1',
    factory: 'Shipyard',
    role: 'Assault',
    description: 'Heavy naval gunboat equipped with heavy naval plasma cannons and depth charges.',
    cost: { metal: 290, energy: 2350, buildTime: 50 },
    combat: { health: 1900, speed: 46, range: 530, dps: 145 },
    strengths: ['Formidable coastal bombardment', 'High structural armor'],
    weaknesses: ['Sluggish maneuvers', 'Vulnerable to air torpedo strikes'],
    counters: ['Searcher', 'Skeeter'],
    counteredBy: ['Torpedo bombers', 'Submarines'],
  },

  // ----------------------------------------------------
  // Cortex - T2 Notable Units
  // ----------------------------------------------------
  {
    id: 'cortex-can',
    name: 'Can',
    codeName: 'corcan',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T2',
    factory: 'Bot Lab',
    role: 'Assault',
    description: 'Heavy armored assault bot encased in impenetrable alloy plating, firing heavy high-energy plasma.',
    cost: { metal: 620, energy: 6200, buildTime: 75 },
    combat: { health: 4200, speed: 38, range: 350, dps: 280 },
    strengths: ['Immense soak capability', 'Relentless marching frontline anchor'],
    weaknesses: ['Extremely slow movement speed', 'Susceptible to EMP and sniper bots'],
    counters: ['Thug', 'Raider', 'Stump'],
    counteredBy: ['Zeus'],
  },
  {
    id: 'cortex-goliath',
    name: 'Goliath',
    codeName: 'corgol',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T2',
    factory: 'Vehicle Plant',
    role: 'Assault',
    description: 'The iconic Cortex 100-ton super-heavy assault tank. Features devastating heavy twin cannons and fortress-grade armor.',
    cost: { metal: 1250, energy: 13500, buildTime: 120 },
    combat: { health: 8200, speed: 36, range: 480, dps: 450 },
    strengths: ['Crushes standard ground units with raw firepower and monstrous HP pool', 'Unstoppable spearhead'],
    weaknesses: ['Very expensive', 'Slow acceleration and vulnerable to heavy air gunships / bombers'],
    counters: ['Bulldog', 'Can', 'Stump', 'Raider'],
    counteredBy: ['Zeus', 'Tornado', 'Shadow'],
  },
  {
    id: 'cortex-sheldon',
    name: 'Sheldon',
    codeName: 'cormort',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T2',
    factory: 'Bot Lab',
    role: 'Artillery',
    description: 'Long-range rocket artillery bot with high arc trajectory, devastating static defensive lines from total safety.',
    cost: { metal: 420, energy: 4600, buildTime: 44 },
    combat: { health: 1200, speed: 50, range: 720, dps: 155 },
    strengths: ['High firing arc over hills', 'Long range siege', 'Cracks static defensive nests'],
    weaknesses: ['Vulnerable at close quarters', 'Requires frontline meat-shield'],
    counters: ['Heavy Laser Tower', 'Light Laser Tower', 'Can', 'Bulldog'],
    counteredBy: ['Flash', 'Zipper', 'Brawler', 'Sharpshooter'],
  },
  {
    id: 'cortex-sumo',
    name: 'Sumo',
    codeName: 'corsumo',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T2',
    factory: 'Bot Lab',
    role: 'Assault',
    description: 'Super-heavy walking fortress bot with twin heavy pulse lasers. Extremely durable frontline anchor unit.',
    cost: { metal: 1750, energy: 16500, buildTime: 85 },
    combat: { health: 11000, speed: 28, range: 440, dps: 520 },
    strengths: ['Monstrous health pool (11,000 HP)', 'Twin heavy laser cannons', 'Nearly immovable anchor'],
    weaknesses: ['Very slow speed', 'Vulnerable to long-range artillery and EMP paralyzers (Blade)'],
    counters: ['Centurion', 'Bulldog', 'Can', 'Zeus'],
    counteredBy: ['Sharpshooter', 'Blade', 'Hound', 'Phoenix'],
  },
  {
    id: 'cortex-freaker',
    name: 'Freaker',
    codeName: 'corfast',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T2',
    factory: 'Bot Lab',
    role: 'Raider',
    description: 'Hyper-velocity cyber raider bot. Dances through enemy formations, assassinating commanders and backend tech.',
    cost: { metal: 290, energy: 3400, buildTime: 34 },
    combat: { health: 980, speed: 115, range: 260, dps: 210 },
    strengths: ['Extreme speed and DPS', 'Assassination of isolated commanders and T2 constructors'],
    weaknesses: ['Light armor', 'Vulnerable to area-of-effect defensive fire'],
    counters: ['Solar Collector', 'Metal Extractor', 'Hound', 'Sharpshooter'],
    counteredBy: ['Centurion', 'Bulldog', 'Heavy Laser Tower'],
  },
  {
    id: 'cortex-rapier',
    name: 'Rapier',
    codeName: 'corvamp',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T2',
    factory: 'Aircraft Plant',
    role: 'Gunship',
    description: 'T2 heavy rocket gunship unleashing rapid salvoes of anti-armor rockets against ground armies and commanders.',
    cost: { metal: 520, energy: 11500, buildTime: 52 },
    combat: { health: 2600, speed: 102, range: 460, dps: 290 },
    strengths: ['High rocket burst damage', 'Heavy armor for air', 'Effective tank hunter'],
    weaknesses: ['High energy cost', 'Vulnerable to advanced interceptors'],
    counters: ['Bulldog', 'Centurion', 'Commander', 'Goliath'],
    counteredBy: ['Freedom Fighter', 'Jethro', 'Flakker'],
  },
  {
    id: 'cortex-liche',
    name: 'Liche',
    codeName: 'corhurc',
    faction: 'Cortex',
    category: 'Unit',
    tier: 'T2',
    factory: 'Aircraft Plant',
    role: 'Bomber',
    description: 'Advanced tactical nuclear bomber capable of annihilating entire enemy base sectors and eco farms in a single run.',
    cost: { metal: 680, energy: 15200, buildTime: 62 },
    combat: { health: 2100, speed: 170, range: 550, dps: 550 },
    strengths: ['Tactical nuclear payload', 'Devastating AoE blast', 'Game-ending base snipe capability'],
    weaknesses: ['Slow turn radius', 'Heavy loss if intercepted by air screens'],
    counters: ['Advanced Fusion', 'Energy Converter', 'Factory clusters'],
    counteredBy: ['Freedom Fighter', 'Avenger', 'Flakker'],
  },

  // ----------------------------------------------------
  // Economy Structures - Armada
  // ----------------------------------------------------
  {
    id: 'armada-solar-collector',
    name: 'Solar Collector',
    codeName: 'armsolar',
    faction: 'Armada',
    category: 'Economy',
    tier: 'T1',
    role: 'Energy Production',
    description: 'Standard baseline T1 solar power plant. Generates a consistent +20 energy output.',
    cost: { metal: 145, energy: 0, buildTime: 25 },
    combat: { health: 320 },
    economy: { energyOutput: 20, energyStorage: 50 },
    strengths: ['Stable, reliable 24/7 energy', 'Closes during damage to reduce blast hazard'],
    weaknesses: ['Substantial metal investment compared to wind', 'Explodes when destroyed'],
    counters: [],
    counteredBy: ['Raiders', 'Bombers'],
  },
  {
    id: 'armada-wind-generator',
    name: 'Wind Turbine',
    codeName: 'armwin',
    faction: 'Armada',
    category: 'Economy',
    tier: 'T1',
    role: 'Energy Production',
    description: 'Economical wind turbine producing variable energy depending on current wind conditions (0 to 25+).',
    cost: { metal: 37, energy: 0, buildTime: 10 },
    combat: { health: 170 },
    economy: { energyOutput: 12 },
    strengths: ['Extremely fast payback time on high-wind maps', 'Low metal cost'],
    weaknesses: ['Output fluctuates with wind speed', 'Vulnerable to cascading chain-reaction explosions'],
    counters: [],
    counteredBy: ['Early raiders', 'Tick swarms'],
  },
  {
    id: 'armada-metal-extractor',
    name: 'Metal Extractor',
    codeName: 'armmex',
    faction: 'Armada',
    category: 'Economy',
    tier: 'T1',
    role: 'Metal Extraction',
    description: 'Basic resource extraction facility placed directly over metal deposits to generate continuous income.',
    cost: { metal: 50, energy: 500, buildTime: 15 },
    combat: { health: 420 },
    economy: { metalOutput: 2.0, metalStorage: 50, energyConsumption: 3 },
    strengths: ['Fundamental economic foundation of any BAR strategy'],
    weaknesses: ['Prime target for enemy harassment and raiding runs'],
    counters: [],
    counteredBy: ['Flash', 'Blitz', 'Shadow'],
  },
  {
    id: 'armada-advanced-metal-extractor',
    name: 'Advanced Metal Extractor',
    codeName: 'armmoho',
    faction: 'Armada',
    category: 'Economy',
    tier: 'T2',
    role: 'Metal Extraction',
    description: 'Moho mine exploiting deep metal seams for massive T2 metal yields (4x-5x standard extractor).',
    cost: { metal: 580, energy: 7200, buildTime: 65 },
    combat: { health: 2400 },
    economy: { metalOutput: 10.0, metalStorage: 250, energyConsumption: 30 },
    strengths: ['Huge metal multiplier on high-value spots'],
    weaknesses: ['Heavy power drain to run', 'High-priority artillery target'],
    counters: [],
    counteredBy: ['T2 Bombers', 'Long-range artillery'],
  },
  {
    id: 'armada-energy-converter',
    name: 'Energy Converter',
    codeName: 'armmakr',
    faction: 'Armada',
    category: 'Economy',
    tier: 'T1',
    role: 'Energy Conversion',
    description: 'Converts surplus grid energy into precious refined metal at a standard exchange ratio.',
    cost: { metal: 1, energy: 900, buildTime: 14 },
    combat: { health: 120 },
    economy: { metalConversionRate: 70, energyConsumption: 70 },
    strengths: ['Prevents energy overflow waste', 'Translates excess solar/wind into army production'],
    weaknesses: ['Very fragile'],
    counters: [],
    counteredBy: ['Raiders'],
  },
  {
    id: 'armada-fusion-reactor',
    name: 'Fusion Reactor',
    codeName: 'armfus',
    faction: 'Armada',
    category: 'Economy',
    tier: 'T2',
    role: 'Energy Production',
    description: 'Massive thermonuclear fusion power plant producing a tremendous +1050 clean energy output.',
    cost: { metal: 4400, energy: 28000, buildTime: 240 },
    combat: { health: 4800 },
    economy: { energyOutput: 1050, energyStorage: 2500 },
    strengths: ['Powers T2 mass production and heavy energy conversion complexes'],
    weaknesses: ['Catastrophic nuclear explosion radius upon destruction'],
    counters: [],
    counteredBy: ['T2/T3 Bombers', 'Sneak raiding parties'],
  },

  // ----------------------------------------------------
  // Economy Structures - Cortex
  // ----------------------------------------------------
  {
    id: 'cortex-solar-collector',
    name: 'Solar Collector',
    codeName: 'corsolar',
    faction: 'Cortex',
    category: 'Economy',
    tier: 'T1',
    role: 'Energy Production',
    description: 'Heavy reinforced T1 solar generator producing a constant +20 energy stream.',
    cost: { metal: 150, energy: 0, buildTime: 26 },
    combat: { health: 340 },
    economy: { energyOutput: 20, energyStorage: 50 },
    strengths: ['Guaranteed base power', 'Tougher frame than wind turbines'],
    weaknesses: ['Explodes when ruptured'],
    counters: [],
    counteredBy: ['Raiders', 'Bombers'],
  },
  {
    id: 'cortex-wind-generator',
    name: 'Wind Turbine',
    codeName: 'corwin',
    faction: 'Cortex',
    category: 'Economy',
    tier: 'T1',
    role: 'Energy Production',
    description: 'Lightweight Cortex wind dynamo supplying dynamic wind-driven power (0 to 25+).',
    cost: { metal: 38, energy: 0, buildTime: 10 },
    combat: { health: 165 },
    economy: { energyOutput: 12 },
    strengths: ['Extremely cheap metal cost', 'Quick initial opening setup'],
    weaknesses: ['Unreliable on calm maps', 'Chain explosions in packed grids'],
    counters: [],
    counteredBy: ['Paw', 'Grunt'],
  },
  {
    id: 'cortex-metal-extractor',
    name: 'Metal Extractor',
    codeName: 'cormex',
    faction: 'Cortex',
    category: 'Economy',
    tier: 'T1',
    role: 'Metal Extraction',
    description: 'Fundamental Cortex metal rig installed onto ore veins to secure resource flow.',
    cost: { metal: 52, energy: 520, buildTime: 15 },
    combat: { health: 430 },
    economy: { metalOutput: 2.0, metalStorage: 50, energyConsumption: 3 },
    strengths: ['Core building block for tech advancement and military expansion'],
    weaknesses: ['Sparse and isolated across the map'],
    counters: [],
    counteredBy: ['Flash', 'Blitz', 'Shadow'],
  },
  {
    id: 'cortex-advanced-metal-extractor',
    name: 'Advanced Metal Extractor',
    codeName: 'cormoho',
    faction: 'Cortex',
    category: 'Economy',
    tier: 'T2',
    role: 'Metal Extraction',
    description: 'Heavy Moho mining rig extracting deep-core subterranean metal veins for high-volume T2 production.',
    cost: { metal: 600, energy: 7400, buildTime: 68 },
    combat: { health: 2500 },
    economy: { metalOutput: 10.0, metalStorage: 250, energyConsumption: 32 },
    strengths: ['Exponentially accelerates T2/T3 unit manufacturing'],
    weaknesses: ['High power requirement', 'Expensive asset loss if raided'],
    counters: [],
    counteredBy: ['T2 Strategic Bombers'],
  },
  {
    id: 'cortex-energy-converter',
    name: 'Energy Converter',
    codeName: 'cormakr',
    faction: 'Cortex',
    category: 'Economy',
    tier: 'T1',
    role: 'Energy Conversion',
    description: 'Matter synthesizer that converts excess power into raw metal stock.',
    cost: { metal: 1, energy: 950, buildTime: 15 },
    combat: { health: 125 },
    economy: { metalConversionRate: 70, energyConsumption: 70 },
    strengths: ['Absorbs unspent energy surges and turns them into units'],
    weaknesses: ['Delicate construction'],
    counters: [],
    counteredBy: ['Raiders'],
  },
  {
    id: 'cortex-fusion-reactor',
    name: 'Fusion Reactor',
    codeName: 'corfus',
    faction: 'Cortex',
    category: 'Economy',
    tier: 'T2',
    role: 'Energy Production',
    description: 'Industrial heavy fusion generator pumping +1080 energy into the Cortex grid.',
    cost: { metal: 4600, energy: 29000, buildTime: 250 },
    combat: { health: 5000 },
    economy: { energyOutput: 1080, energyStorage: 2600 },
    strengths: ['Powers heavy industry, shields, and superweapons'],
    weaknesses: ['Massive fatal blast radius if destroyed in base'],
    counters: [],
    counteredBy: ['T2/T3 Bombers', 'Artillery'],
  },

  // ----------------------------------------------------
  // Static Defenses (Bonus complete data)
  // ----------------------------------------------------
  {
    id: 'armada-light-laser-tower',
    name: 'Light Laser Tower',
    codeName: 'armllt',
    faction: 'Armada',
    category: 'Defense',
    tier: 'T1',
    role: 'Point Defense',
    description: 'Rapid-firing defensive turret designed to deny light bot and vehicle raids.',
    cost: { metal: 90, energy: 950, buildTime: 20 },
    combat: { health: 650, range: 430, dps: 110 },
    strengths: ['Shreds T1 raiders like Paw, Grunt, Blitz, and Flash'],
    weaknesses: ['Outranged by Rocko, Storm, and mobile artillery'],
    counters: ['Paw', 'Grunt', 'Flash', 'Blitz', 'Tick'],
    counteredBy: ['Rocko', 'Storm', 'Hammer', 'Wolverine'],
  },
  {
    id: 'cortex-light-laser-tower',
    name: 'Light Laser Tower',
    codeName: 'corllt',
    faction: 'Cortex',
    category: 'Defense',
    tier: 'T1',
    role: 'Point Defense',
    description: 'Armored turret armed with a high-cadence red laser beam for base perimeter security.',
    cost: { metal: 95, energy: 980, buildTime: 21 },
    combat: { health: 680, range: 430, dps: 115 },
    strengths: ['Stops light scout and raider incursions in their tracks'],
    weaknesses: ['Vulnerable to artillery and skirmisher rockets'],
    counters: ['Paw', 'Grunt', 'Flash', 'Blitz', 'Tick'],
    counteredBy: ['Rocko', 'Storm', 'Hammer', 'Wolverine'],
  },
] as const;

// ==========================================
// Lookup Maps and Sets for Fast Grounding
// ==========================================

export const VALID_BAR_UNITS: readonly BARUnit[] = BAR_DATABASE;

/**
 * Array of all canonical unit/structure names
 */
export const VALID_UNIT_NAMES: readonly string[] = Array.from(
  new Set(BAR_DATABASE.map((u) => u.name))
);

/**
 * Normalized lowercase set of all valid unit/structure names
 */
export const VALID_UNIT_NAMES_SET: ReadonlySet<string> = new Set(
  BAR_DATABASE.map((u) => u.name.toLowerCase().trim())
);

/**
 * Unit lookup indexed by unique ID slug (e.g., 'armada-flash')
 */
export const BAR_UNITS_BY_ID: Readonly<Record<string, BARUnit>> = Object.freeze(
  BAR_DATABASE.reduce<Record<string, BARUnit>>((acc, unit) => {
    acc[unit.id] = unit;
    return acc;
  }, {})
);

/**
 * Cross-faction unit ownership mapping (unit name lowercase -> Set of factions that have it)
 */
export const UNIT_FACTION_MAP: ReadonlyMap<string, Set<Faction>> = (() => {
  const map = new Map<string, Set<Faction>>();
  for (const unit of BAR_DATABASE) {
    const key = unit.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    map.get(key)!.add(unit.faction);
  }
  return map;
})();

/**
 * Equivalent counterparts across factions for cross-faction correction suggestions
 */
export const FACTION_EQUIVALENTS: Record<string, { armada: string; cortex: string }> = {
  // Raiders
  flash: { armada: 'Flash', cortex: 'Blitz' },
  blitz: { armada: 'Flash', cortex: 'Blitz' },
  paw: { armada: 'Paw', cortex: 'Grunt' },
  grunt: { armada: 'Paw', cortex: 'Grunt' },
  // Skirmishers
  rocko: { armada: 'Rocko', cortex: 'Storm' },
  storm: { armada: 'Rocko', cortex: 'Storm' },
  // Assault
  stump: { armada: 'Stump', cortex: 'Raider' },
  raider: { armada: 'Stump', cortex: 'Raider' },
  thug: { armada: 'Hammer', cortex: 'Thug' },
  pyros: { armada: 'Hammer', cortex: 'Pyros' },
  // AA
  jethro: { armada: 'Jethro', cortex: 'Crasher' },
  crasher: { armada: 'Jethro', cortex: 'Crasher' },
  samson: { armada: 'Samson', cortex: 'Slasher' },
  slasher: { armada: 'Samson', cortex: 'Slasher' },
  // Air
  sparrow: { armada: 'Sparrow', cortex: 'Avenger' },
  tornado: { armada: 'Tornado', cortex: 'Banshee' },
  banshee: { armada: 'Tornado', cortex: 'Banshee' },
  // T2 heavy
  bulldog: { armada: 'Bulldog', cortex: 'Goliath' },
  goliath: { armada: 'Bulldog', cortex: 'Goliath' },
  zeus: { armada: 'Zeus', cortex: 'Can' },
  can: { armada: 'Zeus', cortex: 'Can' },
  centurion: { armada: 'Centurion', cortex: 'Sumo' },
  sumo: { armada: 'Centurion', cortex: 'Sumo' },
  // Resurrection & Salvage
  lazarus: { armada: 'Lazarus', cortex: 'Necro' },
  necro: { armada: 'Lazarus', cortex: 'Necro' },
  // Air Transports
  atlas: { armada: 'Atlas', cortex: 'Valkyrie' },
  valkyrie: { armada: 'Atlas', cortex: 'Valkyrie' },
  // Gunships & Bombers
  brawler: { armada: 'Brawler', cortex: 'Banshee' },
  rapier: { armada: 'Kestrel', cortex: 'Rapier' },
  kestrel: { armada: 'Kestrel', cortex: 'Rapier' },
  phoenix: { armada: 'Phoenix', cortex: 'Liche' },
  liche: { armada: 'Phoenix', cortex: 'Liche' },
  // Snipers / Artillery
  sharpshooter: { armada: 'Sharpshooter', cortex: 'Sheldon' },
  sheldon: { armada: 'Sharpshooter', cortex: 'Sheldon' },
  hound: { armada: 'Hound', cortex: 'Sheldon' },
  // Fast T2 Raiders
  zipper: { armada: 'Zipper', cortex: 'Freaker' },
  freaker: { armada: 'Zipper', cortex: 'Freaker' },
};

// ==========================================
// Helper Functions for Data Grounding
// ==========================================

/**
 * Check whether a given unit or structure name is a valid Beyond All Reason entity.
 */
export function isValidUnit(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  return VALID_UNIT_NAMES_SET.has(name.toLowerCase().trim());
}

/**
 * Retrieve a unit by display name or id (case-insensitive).
 * If a faction is supplied, it retrieves the faction-specific variant.
 */
export function getUnitByName(
  name: string,
  faction?: Faction
): BARUnit | undefined {
  if (!name || typeof name !== 'string') return undefined;
  const normalized = name.toLowerCase().trim();

  // Try direct ID lookup first
  if (BAR_UNITS_BY_ID[normalized]) {
    return BAR_UNITS_BY_ID[normalized];
  }

  // Filter by matching name
  const matches = BAR_DATABASE.filter(
    (u) =>
      u.name.toLowerCase() === normalized ||
      u.codeName?.toLowerCase() === normalized ||
      u.id.toLowerCase() === normalized
  );

  if (matches.length === 0) return undefined;
  if (faction) {
    return matches.find((u) => u.faction.toLowerCase() === faction.toLowerCase()) || matches[0];
  }
  return matches[0];
}

/**
 * Get all valid units and structures for a given faction.
 */
export function getUnitsByFaction(faction: Faction): BARUnit[] {
  return BAR_DATABASE.filter(
    (u) => u.faction.toLowerCase() === faction.toLowerCase()
  );
}

/**
 * Get all units produced by a specific factory type for a faction.
 */
export function getUnitsByFactory(
  faction: Faction,
  factory: FactoryType,
  tier?: TechTier
): BARUnit[] {
  return BAR_DATABASE.filter((u) => {
    const factionMatch = u.faction.toLowerCase() === faction.toLowerCase();
    const factoryMatch = u.factory === factory;
    const tierMatch = tier ? u.tier === tier : true;
    return factionMatch && factoryMatch && tierMatch;
  });
}

/**
 * Retrieve all economy structures (Solar, Wind, Mex, Fusion, Converters) for a faction.
 */
export function getEconomyStructures(
  faction?: Faction,
  tier?: TechTier
): BARUnit[] {
  return BAR_DATABASE.filter((u) => {
    const isEco = u.category === 'Economy';
    const factionMatch = faction
      ? u.faction.toLowerCase() === faction.toLowerCase()
      : true;
    const tierMatch = tier ? u.tier === tier : true;
    return isEco && factionMatch && tierMatch;
  });
}

/**
 * Validate that a unit exists AND belongs to the intended faction.
 * Prevents LLMs from creating cross-faction hallucinations like "Cortex Flash" or "Armada Pyros".
 */
export function validateUnitFactionCombination(
  unitName: string,
  faction: Faction
): ValidationResult {
  const normalized = unitName.toLowerCase().trim();

  if (!isValidUnit(normalized)) {
    return {
      valid: false,
      reason: `'${unitName}' is not a recognized Beyond All Reason unit or structure.`,
    };
  }

  const validFactions = UNIT_FACTION_MAP.get(normalized);
  if (!validFactions || !validFactions.has(faction)) {
    const actualFaction = validFactions ? Array.from(validFactions).join(', ') : 'Unknown';
    const equivalent = FACTION_EQUIVALENTS[normalized];
    const suggestion =
      faction === 'Armada'
        ? equivalent?.armada
        : equivalent?.cortex;

    return {
      valid: false,
      reason: `'${unitName}' belongs to ${actualFaction}, not ${faction}.`,
      suggestedAlternative: suggestion,
    };
  }

  const unit = getUnitByName(normalized, faction);
  return {
    valid: true,
    unit,
  };
}

/**
 * Validate an entire list/build order of units for a faction, returning any unknown
 * units or illegal cross-faction units.
 */
export function validateBuildOrder(
  faction: Faction,
  unitNames: string[]
): BuildOrderValidationResult {
  const validUnits: BARUnit[] = [];
  const invalidUnits: string[] = [];
  const crossFactionUnits: BuildOrderValidationResult['crossFactionUnits'] = [];
  const errors: string[] = [];

  for (const rawName of unitNames) {
    const normalized = rawName.toLowerCase().trim();
    if (!isValidUnit(normalized)) {
      invalidUnits.push(rawName);
      errors.push(`Unknown unit or structure: '${rawName}'.`);
      continue;
    }

    const validation = validateUnitFactionCombination(rawName, faction);
    if (!validation.valid) {
      const allowedFactions = Array.from(UNIT_FACTION_MAP.get(normalized) || []);
      crossFactionUnits.push({
        unitName: rawName,
        unitFaction: allowedFactions[0] || 'Armada',
        targetFaction: faction,
        correctFactionAlternative: validation.suggestedAlternative,
      });
      errors.push(
        validation.reason +
          (validation.suggestedAlternative
            ? ` Consider using '${validation.suggestedAlternative}' instead.`
            : '')
      );
    } else if (validation.unit) {
      validUnits.push(validation.unit);
    }
  }

  return {
    valid: invalidUnits.length === 0 && crossFactionUnits.length === 0,
    validUnits,
    invalidUnits,
    crossFactionUnits,
    errors,
  };
}

/**
 * Get known tactical counters for a given unit.
 */
export function getUnitCounters(unitName: string): string[] {
  const unit = getUnitByName(unitName);
  return unit?.counters ?? [];
}

/**
 * Get known threats / units that counter this unit.
 */
export function getUnitCounteredBy(unitName: string): string[] {
  const unit = getUnitByName(unitName);
  return unit?.counteredBy ?? [];
}
