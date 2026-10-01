import fs from 'node:fs';
import path from 'node:path';
import { type AliasEntry, AliasesFileSchema } from '../src/core/schemas';

// Copied directly from legacy/scripts/enrich-aliases.js (do not import/require that script)
const ALIASES_MAP: Record<string, string[]> = {
  // Armada Bots
  armpw: ['Paw', 'Pawn', 'armpw'],
  armrock: ['Rocko', 'Rocketeer', 'armrock'],
  armham: ['Hammer', 'Mace', 'armham'],
  armllt: ['Light Laser Tower', 'LLT', 'Sentry', 'armllt'],
  armrectr: ['Lazarus', 'Lazarus Rez Bot', 'armrectr'],
  armflea: ['Tick', 'Flea', 'armflea'],
  armflash: ['Flash', 'Blitz', 'armflash'],
  armstump: ['Stump', 'Stout', 'armstump'],
  armsam: ['Samson', 'Whistler', 'armsam'],
  armwar: ['Warrior', 'armwar'],
  armbeaver: ['Beaver', 'Muskrat', 'armbeaver'],
  armzeus: ['Zeus', 'armzeus'],
  armfido: ['Fido', 'armfido'],
  armbull: ['Bull', 'Bulldog', 'armbull'],
  armmart: ['Mauser', 'Wolverine', 'armmart'],
  armart: ['Shellshocker', 'armart'],
  armjeth: ['Jethro', 'armjeth'],
  armck: ['Construction Bot', 'Con Bot', 'armck'],
  armack: ['Advanced Construction Bot', 'T2 Con Bot', 'armack'],

  // Armada Air
  armpeep: ['Sparrow', 'Blink', 'armpeep', 'Armada Scout Plane'],
  armfig: ['Freedom Fighter', 'Falcon', 'armfig', 'Armada Fighter'],
  armbrawl: ['Brawler', 'Roughneck', 'armbrawl', 'Armada Gunship'],
  armthund: ['Thunderbird', 'Shadow', 'Stormbringer', 'armthund', 'Armada Bomber'],
  armatlas: ['Atlas', 'Stork', 'armatlas', 'Armada Transport', 'Air Transport'],
  armkam: ['Banshee', 'Kamikaze', 'armkam'],
  armhawk: ['Highwind', 'Hawk', 'armhawk'],
  armlance: ['Cormorant', 'Lance', 'armlance'],
  armca: ['Construction Aircraft', 'Con Air', 'armca'],
  armaca: ['Advanced Construction Aircraft', 'T2 Con Air', 'armaca'],

  // Armada Buildings
  armafus: ['AFUS', 'Advanced Fusion Reactor', 'Advanced Fusion', 'armafus'],
  armfus: ['Fusion', 'Fusion Reactor', 'armfus'],
  armsolar: ['Solar', 'Solar Collector', 'armsolar'],
  armadvsol: ['Advanced Solar', 'Advanced Solar Generator', 'Advanced Solar Collector', 'armadvsol'],
  armwin: ['Wind', 'Wind Turbine', 'Wind Generator', 'armwin'],
  armmex: ['Mex', 'Metal Extractor', 'armmex'],
  armamex: ['Advanced Mex', 'Advanced Metal Extractor', 'Moho Mine', 'armamex'],
  armrad: ['Radar', 'Radar Tower', 'armrad'],
  armdrag: ["Dragon's Teeth", 'Dragons Teeth', 'armdrag'],
  armlab: ['Bot Lab', 'armlab'],
  armalab: ['Advanced Bot Lab', 'T2 Bot Lab', 'armalab'],
  armvp: ['Vehicle Plant', 'armvp'],
  armavp: ['Advanced Vehicle Plant', 'T2 Vehicle Plant', 'armavp'],
  armap: ['Aircraft Plant', 'Air Plant', 'Aircraft Factory', 'armap'],
  armaap: ['Advanced Aircraft Plant', 'T2 Aircraft Plant', 'armaap'],
  armsy: ['Shipyard', 'armsy'],
  armestor: ['Energy Storage', 'armestor'],
  armmstor: ['Metal Storage', 'armmstor'],
  armmakr: ['Energy Converter', 'armmakr'],
  armmmkr: ['Advanced Energy Converter', 'armmmkr'],

  // Cortex Bots
  corak: ['Grunt', 'corak'],
  corstorm: ['Storm', 'Aggravator', 'corstorm'],
  corthud: ['Thug', 'corthud'],
  corllt: ['Light Laser Tower', 'LLT', 'Guard', 'corllt'],
  cornecro: ['Necro', 'Graverobber', 'cornecro'],
  corroach: ['Roach', 'corroach'],
  corpyro: ['Pyro', 'Pyros', 'Fiend', 'corpyro'],
  corcrash: ['Crasher', 'corcrash'],
  corcan: ['Can', 'Sumo', 'corcan'],
  corsumo: ['Sumo', 'Mammoth', 'corsumo'],
  corck: ['Construction Bot', 'Con Bot', 'corck'],
  corack: ['Advanced Construction Bot', 'T2 Con Bot', 'corack'],

  // Cortex Vehicles
  corfav: ['Rascal', 'Fav', 'corfav'],
  corraid: ['Raider', 'Brute', 'corraid'],
  corgator: ['Gator', 'Instigator', 'Incisor', 'Blitz', 'corgator'],
  corlevlr: ['Leveler', 'Pounder', 'corlevlr'],
  corslash: ['Slasher', 'corslash'],
  corgol: ['Goliath', 'Tzar', 'corgol'],
  corwolv: ['Wolverine', 'corwolv'],
  corvroc: ['Diplomat', 'Negotiator', 'corvroc'],
  corcv: ['Construction Vehicle', 'Con Vehicle', 'corcv'],
  coracv: ['Advanced Construction Vehicle', 'T2 Con Vehicle', 'coracv'],

  // Cortex Air
  corvalk: ['Valkyrie', 'Hercules', 'corvalk', 'Cortex Transport', 'Air Transport'],
  corveng: ['Avenger', 'Valiant', 'corveng', 'Cortex Fighter'],
  corshad: ['Shadow', 'Whirlwind', 'corshad', 'Cortex Bomber'],
  corfink: ['Fink', 'Finch', 'corfink', 'Cortex Scout Plane'],
  corape: ['Rapier', 'Wasp', 'corape', 'Cortex Gunship'],
  cortitan: ['Titan', 'Angler', 'cortitan'],
  corhurc: ['Hurricane', 'Hailstorm', 'corhurc'],
  corvamp: ['Vampire', 'Nighthawk', 'corvamp'],
  corca: ['Construction Aircraft', 'Con Air', 'corca'],
  coraca: ['Advanced Construction Aircraft', 'T2 Con Air', 'coraca'],

  // Cortex Buildings
  corafus: ['AFUS', 'Advanced Fusion Reactor', 'Advanced Fusion', 'corafus'],
  corfus: ['Fusion', 'Fusion Reactor', 'corfus'],
  corsolar: ['Solar', 'Solar Collector', 'corsolar'],
  coradvsol: ['Advanced Solar', 'Advanced Solar Generator', 'Advanced Solar Collector', 'coradvsol'],
  corwin: ['Wind', 'Wind Turbine', 'Wind Generator', 'corwin'],
  cormex: ['Mex', 'Metal Extractor', 'cormex'],
  coramex: ['Advanced Mex', 'Advanced Metal Extractor', 'Moho Mine', 'coramex'],
  corrad: ['Radar', 'Radar Tower', 'corrad'],
  cordrag: ["Dragon's Teeth", 'Dragons Teeth', 'cordrag'],
  corlab: ['Bot Lab', 'corlab'],
  coralab: ['Advanced Bot Lab', 'T2 Bot Lab', 'coralab'],
  corvp: ['Vehicle Plant', 'corvp'],
  coravp: ['Advanced Vehicle Plant', 'T2 Vehicle Plant', 'coravp'],
  corap: ['Aircraft Plant', 'Air Plant', 'Aircraft Factory', 'corap'],
  coraap: ['Advanced Aircraft Plant', 'T2 Aircraft Plant', 'coraap'],
  corsy: ['Shipyard', 'corsy'],
  corestor: ['Energy Storage', 'corestor'],
  cormstor: ['Metal Storage', 'cormstor'],
  cormakr: ['Energy Converter', 'cormakr'],
  cormmkr: ['Advanced Energy Converter', 'cormmkr']
};

interface LegacyUnit {
  slug: string;
  name: string;
  aliases?: string[];
}

function normalizeKey(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function classifyKind(alias: string): 'legacy-name' | 'abbreviation' | 'nickname' {
  if (alias.length <= 5 && alias === alias.toUpperCase() && /^[A-Z0-9]+$/.test(alias)) {
    return 'abbreviation';
  }
  const lower = alias.toLowerCase();
  const nicknamePatterns = ['moho', 'fav', 'nano', 'care taker', 'lazarus rez bot'];
  if (nicknamePatterns.some((pattern) => lower.includes(pattern))) {
    return 'nickname';
  }
  return 'legacy-name';
}

export function harvestAliases(): {
  aliases: AliasEntry[];
  droppedMulti: Array<{ alias: string; slugs: string[] }>;
  droppedNameConflict: Array<{ alias: string; slug: string; conflictingUnits: string[] }>;
} {
  const dbPath = path.resolve(process.cwd(), 'legacy/data/bar_units_database.json');
  const rawDb = fs.readFileSync(dbPath, 'utf8');
  const units: LegacyUnit[] = JSON.parse(rawDb);

  // Map normalized current display names to slugs
  const currentNames = new Map<string, Set<string>>();
  for (const u of units) {
    const key = normalizeKey(u.name);
    if (!currentNames.has(key)) {
      currentNames.set(key, new Set());
    }
    currentNames.get(key)!.add(u.slug);
  }

  // Gather unique (alias, slug) pairs where alias != unit's current name and alias != slug
  // (Self-slug aliases were legacy search artifacts; canonical unit identity is the unitDef name)
  const aliasToSlugs = new Map<string, Map<string, string>>();

  for (const u of units) {
    const slug = u.slug;
    const rawAliases = new Set<string>([...(u.aliases || []), ...(ALIASES_MAP[slug] || [])]);

    for (const rawAlias of rawAliases) {
      const trimmed = rawAlias.trim();
      if (!trimmed) continue;
      // Skip if alias equals current name
      if (normalizeKey(trimmed) === normalizeKey(u.name)) continue;
      // Skip if alias equals unit's own slug
      if (normalizeKey(trimmed) === normalizeKey(slug)) continue;

      const norm = normalizeKey(trimmed);
      if (!aliasToSlugs.has(norm)) {
        aliasToSlugs.set(norm, new Map());
      }
      aliasToSlugs.get(norm)!.set(slug, trimmed);
    }
  }

  const droppedMulti: Array<{ alias: string; slugs: string[] }> = [];
  const droppedNameConflict: Array<{ alias: string; slug: string; conflictingUnits: string[] }> = [];
  const keptEntries: AliasEntry[] = [];

  for (const [norm, slugMap] of aliasToSlugs.entries()) {
    const slugs = Array.from(slugMap.keys()).sort();
    const originalAlias = Array.from(slugMap.values())[0]!;

    // Condition (a): drop any alias that maps to 2+ unitIds
    if (slugs.length > 1) {
      droppedMulti.push({ alias: originalAlias, slugs });
      continue;
    }

    const slug = slugs[0]!;

    // Condition (b): drop any alias that equals the current name of a different unit
    if (currentNames.has(norm)) {
      const conflictingUnits = Array.from(currentNames.get(norm)!).filter((s) => s !== slug);
      if (conflictingUnits.length > 0) {
        droppedNameConflict.push({
          alias: originalAlias,
          slug,
          conflictingUnits
        });
        continue;
      }
    }

    keptEntries.push({
      alias: originalAlias,
      unitId: slug,
      kind: classifyKind(originalAlias)
    });
  }

  // Sort kept entries deterministically by alias then unitId
  keptEntries.sort((a, b) => a.alias.localeCompare(b.alias) || a.unitId.localeCompare(b.unitId));
  droppedMulti.sort((a, b) => a.alias.localeCompare(b.alias));
  droppedNameConflict.sort((a, b) => a.alias.localeCompare(b.alias));

  return {
    aliases: keptEntries,
    droppedMulti,
    droppedNameConflict
  };
}

function run(): void {
  const result = harvestAliases();

  // Validate output conforms to schema
  const fileData = {
    schemaVersion: 1,
    aliases: result.aliases
  };
  AliasesFileSchema.parse(fileData);

  const outJsonPath = path.resolve(process.cwd(), 'data/aliases.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(fileData, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${result.aliases.length} aliases to data/aliases.json`);

  // Build markdown report
  const lines: string[] = [
    '# Harvested Aliases Report',
    '',
    `Total valid aliases preserved: **${result.aliases.length}**`,
    '',
    '## Dropped Aliases: Multi-Unit Ambiguities (Maps to 2+ Units)',
    '',
    'These aliases were dropped because they resolve to more than one unitId, violating uniqueness.',
    '',
    '| Alias | Matched Units |',
    '|-------|---------------|'
  ];

  for (const item of result.droppedMulti) {
    lines.push(`| \`${item.alias}\` | \`${item.slugs.join('`, `')}\` |`);
  }

  lines.push('');
  lines.push('## Dropped Aliases: Collisions with Existing Unit Names');
  lines.push('');
  lines.push(
    'These aliases were dropped because the alias string equals the current official display name of a different unit.'
  );
  lines.push('');
  lines.push('| Alias | Unit for Which it was an Alias | Conflicts With Unit(s) Having this Current Name |');
  lines.push(
    '|-------|---------------------------------|--------------------------------------------------|'
  );

  for (const item of result.droppedNameConflict) {
    lines.push(`| \`${item.alias}\` | \`${item.slug}\` | \`${item.conflictingUnits.join('`, `')}\` |`);
  }

  lines.push('');
  lines.push('## Historical Notes on Known Conflicts');
  lines.push('');
  lines.push(
    '- **Blitz / corgator**: In legacy data, `corgator` was nicknamed "Blitz", but "Blitz" is the official current name of Armada\'s `armflash`. Dropped.'
  );
  lines.push(
    '- **Sumo / corsumo / corcan**: In legacy scraped data, `corcan` was erroneously labeled "Sumo" while `corsumo` was labeled "Mammoth". Aliases mapping `Sumo` to `corsumo` conflict with `corcan`\'s scraped name and map to multiple units. Dropped.'
  );
  lines.push(
    '- **Shadow / armthund / corshad**: "Shadow" was mapped to both the Armada bomber (`armthund`) and the Cortex bomber (`corshad`). Dropped.'
  );
  lines.push(
    '- **Raider / corraid / corfav**: "Raider" was mapped to both Cortex Raider (`corraid`) and Cortex Rascal (`corfav`). Dropped.'
  );
  lines.push(
    '- **Can / corcan**: "Can" represents the original TA/BAR unit name for `corcan`. In legacy data where `corcan` was mislabeled "Sumo", "Can" served as an alias; with the legacy `corcan`/`corsumo` mismatch resolved, exact unit definition takes precedence.'
  );
  lines.push('');

  const outReportPath = path.resolve(process.cwd(), 'data/aliases.report.md');
  fs.writeFileSync(outReportPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote dropped aliases report to data/aliases.report.md`);
}

if (process.argv[1]?.endsWith('harvest-aliases.ts')) {
  run();
}
