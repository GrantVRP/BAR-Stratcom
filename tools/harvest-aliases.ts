/**
 * data/aliases.json and data/aliases.report.md from the v2 units database.
 * The v2 code is no longer in the tree; take its database from the baseline tag:
 *   git show v2-legacy-baseline:data/bar_units_database.json > scratch/bar_units_database.json
 *   npx tsx tools/harvest-aliases.ts scratch/bar_units_database.json
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  type AliasEntry,
  AliasesFileSchema,
  type SnapshotIndex,
  type UnitDefRecord,
  type UnitSnapshot
} from '../src/core/schemas';

// Copied directly from the v2 scripts/enrich-aliases.js (tag v2-legacy-baseline; do not import that script)
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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function factionOf(unitId: string): string {
  const lower = unitId.toLowerCase();
  if (lower.startsWith('arm')) return 'armada';
  if (lower.startsWith('cor')) return 'cortex';
  if (lower.startsWith('leg')) return 'legion';
  return 'unknown';
}

export function harvestAliases(dbPath: string, snapshotPath?: string): {
  aliases: AliasEntry[];
  keptCrossFaction: Array<{ alias: string; units: Array<{ faction: string; slug: string }> }>;
  droppedSameFactionMulti: Array<{ alias: string; faction: string; slugs: string[] }>;
  droppedNameConflict: Array<{ alias: string; slug: string; conflictingUnits: string[] }>;
} {
  const rawDb = fs.readFileSync(dbPath, 'utf8');
  const units: LegacyUnit[] = JSON.parse(rawDb);

  // Load real unit snapshot if available
  let snapshot: UnitSnapshot | undefined;
  const snapshotIndexPath = path.resolve(process.cwd(), 'data/snapshots/index.json');
  if (snapshotPath && fs.existsSync(snapshotPath)) {
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } else if (fs.existsSync(snapshotIndexPath)) {
    const index: SnapshotIndex = JSON.parse(fs.readFileSync(snapshotIndexPath, 'utf8'));
    const defaultSnapshotPath = path.resolve(process.cwd(), 'data/snapshots', index.default, 'units.json');
    if (fs.existsSync(defaultSnapshotPath)) {
      snapshot = JSON.parse(fs.readFileSync(defaultSnapshotPath, 'utf8'));
    }
  }

  // Map normalized current display names to slugs
  const currentNames = new Map<string, Set<string>>();
  const snapshotUnits = new Map<string, UnitDefRecord>();

  if (snapshot) {
    for (const u of snapshot.units) {
      snapshotUnits.set(u.id.toLowerCase(), u);
      const key = normalizeKey(u.name);
      if (!currentNames.has(key)) {
        currentNames.set(key, new Set());
      }
      currentNames.get(key)!.add(u.id.toLowerCase());
    }
  } else {
    for (const u of units) {
      const key = normalizeKey(u.name);
      if (!currentNames.has(key)) {
        currentNames.set(key, new Set());
      }
      currentNames.get(key)!.add(u.slug.toLowerCase());
    }
  }

  // Gather unique (alias, slug) pairs grouped by: normalized alias -> faction -> Map<slug, rawAlias>
  const aliasByFaction = new Map<string, Map<string, Map<string, string>>>();

  for (const u of units) {
    const slug = u.slug.toLowerCase();
    let currentUnitName = u.name;

    if (snapshot) {
      const realUnit = snapshotUnits.get(slug);
      if (!realUnit) {
        // Drop aliases whose unitId does not exist in real snapshot
        continue;
      }
      currentUnitName = realUnit.name;
    }

    const rawAliases = new Set<string>([...(u.aliases || []), ...(ALIASES_MAP[slug] || [])]);

    for (const rawAlias of rawAliases) {
      const decoded = decodeHtmlEntities(rawAlias);
      const trimmed = decoded.trim();
      if (!trimmed) continue;
      // Skip if alias equals current real name
      if (normalizeKey(trimmed) === normalizeKey(currentUnitName)) continue;
      // Skip if alias equals unit's own slug
      if (normalizeKey(trimmed) === normalizeKey(slug)) continue;

      const norm = normalizeKey(trimmed);
      const faction = factionOf(slug);

      if (!aliasByFaction.has(norm)) {
        aliasByFaction.set(norm, new Map());
      }
      const factionGroup = aliasByFaction.get(norm)!;
      if (!factionGroup.has(faction)) {
        factionGroup.set(faction, new Map());
      }
      factionGroup.get(faction)!.set(slug, trimmed);
    }
  }

  const droppedSameFactionMulti: Array<{ alias: string; faction: string; slugs: string[] }> = [];
  const droppedNameConflict: Array<{ alias: string; slug: string; conflictingUnits: string[] }> = [];
  const keptEntries: AliasEntry[] = [];
  const keptCrossFaction: Array<{ alias: string; units: Array<{ faction: string; slug: string }> }> = [];

  for (const [norm, factionGroup] of aliasByFaction.entries()) {
    const validGroupEntries: Array<{ faction: string; slug: string; rawAlias: string }> = [];

    for (const [faction, slugMap] of factionGroup.entries()) {
      const slugs = Array.from(slugMap.keys()).sort();
      const originalAlias = Array.from(slugMap.values())[0]!;

      // Drop a group only if it has 2+ distinct unitIds within the same faction
      if (slugs.length > 1) {
        droppedSameFactionMulti.push({ alias: originalAlias, faction, slugs });
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

      validGroupEntries.push({ faction, slug, rawAlias: originalAlias });
    }

    if (validGroupEntries.length > 1) {
      keptCrossFaction.push({
        alias: validGroupEntries[0]!.rawAlias,
        units: validGroupEntries.map((e) => ({ faction: e.faction, slug: e.slug }))
      });
    }

    for (const entry of validGroupEntries) {
      keptEntries.push({
        alias: entry.rawAlias,
        unitId: entry.slug,
        kind: classifyKind(entry.rawAlias)
      });
    }
  }

  // Sort kept entries deterministically by alias then unitId
  keptEntries.sort((a, b) => a.alias.localeCompare(b.alias) || a.unitId.localeCompare(b.unitId));
  droppedSameFactionMulti.sort((a, b) => a.alias.localeCompare(b.alias));
  droppedNameConflict.sort((a, b) => a.alias.localeCompare(b.alias));
  keptCrossFaction.sort((a, b) => a.alias.localeCompare(b.alias));

  return {
    aliases: keptEntries,
    keptCrossFaction,
    droppedSameFactionMulti,
    droppedNameConflict
  };
}

function run(): void {
  const dbPath = process.argv[2];
  if (!dbPath) throw new Error('Usage: npx tsx tools/harvest-aliases.ts <bar_units_database.json> (see the header)');
  const result = harvestAliases(path.resolve(dbPath));

  const fileData = {
    schemaVersion: 1,
    aliases: result.aliases
  };
  AliasesFileSchema.parse(fileData);

  const outJsonPath = path.resolve(process.cwd(), 'data/aliases.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(fileData, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${result.aliases.length} aliases to data/aliases.json`);

  const crossFactionRows = result.keptCrossFaction
    .map((i) => `| \`${i.alias}\` | ${i.units.map((u) => `\`${u.slug}\` (${u.faction})`).join(', ')} |`)
    .join('\n');

  const sameFactionRows = result.droppedSameFactionMulti
    .map((i) => `| \`${i.alias}\` | ${i.faction} | \`${i.slugs.join('`, `')}\` |`)
    .join('\n');

  const nameConflictRows = result.droppedNameConflict
    .map((i) => `| \`${i.alias}\` | \`${i.slug}\` | \`${i.conflictingUnits.join('`, `')}\` |`)
    .join('\n');

  const report = `# Harvested Aliases Report

Total valid aliases preserved: **${result.aliases.length}**

## Kept Cross-Faction Aliases (Resolved by Faction)

These aliases appear in multiple factions and are resolved in-game by the player’s active faction.

| Alias | Matched Units |
|-------|---------------|
${crossFactionRows}

## Dropped Aliases: Same-Faction Ambiguities (Maps to 2+ Units Within One Faction)

These aliases were dropped because they resolve to more than one unitId within the same faction.

| Alias | Faction | Matched Units |
|-------|---------|---------------|
${sameFactionRows}

## Dropped Aliases: Collisions with Existing Unit Names

These aliases were dropped because the alias string equals the current official display name of a different unit.

| Alias | Unit for Which it was an Alias | Conflicts With Unit(s) Having this Current Name |
|-------|---------------------------------|--------------------------------------------------|
${nameConflictRows}

## Historical Notes on Known Conflicts

- **Blitz / corgator**: In legacy data, \`corgator\` was nicknamed "Blitz", but "Blitz" is the official current name of Armada's \`armflash\`. Dropped by collision rule.
- **Sumo / corsumo / corcan**: In legacy scraped data, \`corcan\` was erroneously labeled "Sumo" while \`corsumo\` was labeled "Mammoth". Aliases mapping \`Sumo\` to \`corsumo\` conflict with \`corcan\`'s scraped name and map to multiple units within Cortex. Dropped.
- **Shadow / armthund / corshad**: "Shadow" was mapped to both the Armada bomber (\`armthund\`) and the Cortex bomber (\`corshad\`). It is preserved as a cross-faction alias resolved by faction.
- **Raider / corraid / corfav**: "Raider" was mapped to both Cortex Raider (\`corraid\`) and Cortex Rascal (\`corfav\`) within Cortex. Dropped as same-faction ambiguous.
- **Can / corcan**: "Can" represents the original TA/BAR unit name for \`corcan\`. In legacy data where \`corcan\` was mislabeled "Sumo", "Can" served as an alias; with the legacy \`corcan\`/\`corsumo\` mismatch resolved, exact unit definition takes precedence.
`;

  const outReportPath = path.resolve(process.cwd(), 'data/aliases.report.md');
  fs.writeFileSync(outReportPath, report, 'utf8');
  console.log(`Wrote dropped aliases report to data/aliases.report.md`);
}

if (process.argv[1]?.endsWith('harvest-aliases.ts')) {
  run();
}
