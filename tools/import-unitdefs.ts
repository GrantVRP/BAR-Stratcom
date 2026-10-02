import fs from 'node:fs';
import path from 'node:path';
import {
  FactionsFileSchema,
  RawUnitdefsExportSchema,
  SnapshotIndexSchema,
  type FactionsFile,
  type RawUnitdefsExport,
  type SnapshotIndex,
  type UnitSnapshot
} from '../src/core/schemas';
import { normalizeRawUnitdefs } from '../src/core/registry/normalize';
import { classifyUnit } from '../src/core/registry/registry';
import type { UnitClass } from '../src/core/registry/types';

export const SIMULATOR_CRITICAL_FIELDS = [
  'metalCost',
  'energyCost',
  'buildTime',
  'buildSpeed',
  'energyMake',
  'metalMake',
  'extractsMetal',
  'windGenerator',
  'metalStorage',
  'energyStorage'
] as const;

export const ALL_UNIT_CLASSES: UnitClass[] = [
  'commander',
  'factory',
  'builder',
  'turret',
  'eco-metal',
  'eco-energy',
  'converter',
  'storage',
  'defense',
  'combat',
  'scout',
  'other'
];

export interface UnitdefsSummary {
  gameVersion: string;
  engineVersion: string;
  totalUnits: number;
  byFaction: Record<string, number>;
  byClass: Record<UnitClass, number>;
  byFactionAndClass: Record<string, Record<UnitClass, number>>;
  missingFields: string[];
  criticalMissingFields: string[];
  unitsWithMissingFields: Array<{ id: string; missing: string[] }>;
}

export function sanitizeGameVersion(version: string): string {
  return version.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export function generateSummary(snapshot: UnitSnapshot, rawMissingFields: string[]): UnitdefsSummary {
  const byFaction: Record<string, number> = {};
  const byClass = Object.fromEntries(ALL_UNIT_CLASSES.map((c) => [c, 0])) as Record<UnitClass, number>;
  const byFactionAndClass: Record<string, Record<UnitClass, number>> = {};

  const unitsWithMissingFields: Array<{ id: string; missing: string[] }> = [];

  for (const unit of snapshot.units) {
    const factionKey = unit.factionId ?? 'unaligned';
    byFaction[factionKey] = (byFaction[factionKey] ?? 0) + 1;

    const unitClass = classifyUnit(unit);
    byClass[unitClass] = (byClass[unitClass] ?? 0) + 1;

    if (!byFactionAndClass[factionKey]) {
      byFactionAndClass[factionKey] = Object.fromEntries(ALL_UNIT_CLASSES.map((c) => [c, 0])) as Record<
        UnitClass,
        number
      >;
    }
    byFactionAndClass[factionKey]![unitClass] = (byFactionAndClass[factionKey]![unitClass] ?? 0) + 1;

    if (unit.missing && unit.missing.length > 0) {
      unitsWithMissingFields.push({ id: unit.id, missing: unit.missing });
    }
  }

  const criticalMissing = rawMissingFields.filter((f) =>
    (SIMULATOR_CRITICAL_FIELDS as readonly string[]).includes(f)
  );

  return {
    gameVersion: snapshot.gameVersion,
    engineVersion: snapshot.engineVersion,
    totalUnits: snapshot.units.length,
    byFaction,
    byClass,
    byFactionAndClass,
    missingFields: rawMissingFields,
    criticalMissingFields: criticalMissing,
    unitsWithMissingFields
  };
}

export function formatSummaryMarkdown(summary: UnitdefsSummary): string {
  const lines: string[] = [];
  lines.push(`### Unitdefs Import Summary — ${summary.gameVersion}`);
  lines.push(`- **Engine Version:** \`${summary.engineVersion}\``);
  lines.push(`- **Total Units:** ${summary.totalUnits}`);
  lines.push(
    `- **Raw Missing Fields:** ${
      summary.missingFields.length > 0 ? summary.missingFields.join(', ') : 'none (0)'
    }`
  );
  lines.push(
    `- **Simulator-Critical Missing Fields:** ${
      summary.criticalMissingFields.length > 0
        ? `⚠️ **${summary.criticalMissingFields.join(', ')}**`
        : 'none (0)'
    }`
  );
  lines.push('');
  lines.push('#### Units by Faction & Class');
  lines.push('| Class | Armada | Cortex | Legion | Unaligned | Total |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const cls of ALL_UNIT_CLASSES) {
    const arm = summary.byFactionAndClass['armada']?.[cls] ?? 0;
    const cor = summary.byFactionAndClass['cortex']?.[cls] ?? 0;
    const leg = summary.byFactionAndClass['legion']?.[cls] ?? 0;
    const unaligned = summary.byFactionAndClass['unaligned']?.[cls] ?? 0;
    const total = summary.byClass[cls] ?? 0;
    lines.push(`| ${cls} | ${arm} | ${cor} | ${leg} | ${unaligned} | **${total}** |`);
  }

  const totalArm = summary.byFaction['armada'] ?? 0;
  const totalCor = summary.byFaction['cortex'] ?? 0;
  const totalLeg = summary.byFaction['legion'] ?? 0;
  const totalUnaligned = summary.byFaction['unaligned'] ?? 0;
  lines.push(
    `| **Total** | **${totalArm}** | **${totalCor}** | **${totalLeg}** | **${totalUnaligned}** | **${summary.totalUnits}** |`
  );

  return lines.join('\n');
}

export interface ImportUnitdefsOptions {
  fromPath: string;
  dataDir?: string;
  setDefault?: boolean;
  now?: string;
}

export function importUnitdefs(options: ImportUnitdefsOptions): {
  snapshot: UnitSnapshot;
  index: SnapshotIndex;
  summary: UnitdefsSummary;
  snapshotPath: string;
  indexPath: string;
} {
  const resolvedFrom = path.resolve(process.cwd(), options.fromPath);
  if (!fs.existsSync(resolvedFrom)) {
    throw new Error(`Input unitdefs file not found: ${resolvedFrom}`);
  }

  const dataDir = path.resolve(process.cwd(), options.dataDir ?? 'data');
  const factionsPath = path.join(dataDir, 'factions.json');
  if (!fs.existsSync(factionsPath)) {
    throw new Error(`factions.json not found: ${factionsPath}`);
  }

  const rawJson = JSON.parse(fs.readFileSync(resolvedFrom, 'utf-8'));
  const rawExport: RawUnitdefsExport = RawUnitdefsExportSchema.parse(rawJson);

  const factionsJson = JSON.parse(fs.readFileSync(factionsPath, 'utf-8'));
  const factions: FactionsFile = FactionsFileSchema.parse(factionsJson);

  const exportedAt = options.now ?? new Date().toISOString();
  const snapshot = normalizeRawUnitdefs(rawExport, factions, {
    exportedAt,
    source: 'widget-export'
  });

  const sanitisedVersion = sanitizeGameVersion(snapshot.gameVersion);
  const snapshotsDir = path.join(dataDir, 'snapshots');
  const targetDir = path.join(snapshotsDir, sanitisedVersion);
  fs.mkdirSync(targetDir, { recursive: true });

  const snapshotPath = path.join(targetDir, 'units.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  // Update index.json
  const indexPath = path.join(snapshotsDir, 'index.json');
  let index: SnapshotIndex;

  const relSnapshotPath = `${sanitisedVersion}/units.json`;

  if (fs.existsSync(indexPath)) {
    const existingIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    index = SnapshotIndexSchema.parse(existingIndex);

    const existingIdx = index.available.findIndex((e) => e.gameVersion === snapshot.gameVersion);
    const entry = {
      gameVersion: snapshot.gameVersion,
      path: relSnapshotPath,
      unitCount: snapshot.units.length,
      exportedAt: snapshot.exportedAt
    };

    if (existingIdx >= 0) {
      index.available[existingIdx] = entry;
    } else {
      index.available.push(entry);
    }
  } else {
    index = {
      schemaVersion: 1,
      default: snapshot.gameVersion,
      available: [
        {
          gameVersion: snapshot.gameVersion,
          path: relSnapshotPath,
          unitCount: snapshot.units.length,
          exportedAt: snapshot.exportedAt
        }
      ]
    };
  }

  if (options.setDefault !== false) {
    index.default = snapshot.gameVersion;
  }

  // Sort available entries deterministically
  index.available.sort((a, b) => a.gameVersion.localeCompare(b.gameVersion));

  // Validate index
  index = SnapshotIndexSchema.parse(index);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');

  const summary = generateSummary(snapshot, rawExport.missingFields);

  return {
    snapshot,
    index,
    summary,
    snapshotPath,
    indexPath
  };
}

export function parseCliArgs(argv: string[]): { from?: string; dataDir?: string; setDefault?: boolean } {
  let from: string | undefined;
  let dataDir: string | undefined;
  let setDefault = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--from' && i + 1 < argv.length) {
      from = argv[++i];
    } else if (arg.startsWith('--from=')) {
      from = arg.slice('--from='.length);
    } else if (arg === '--data-dir' && i + 1 < argv.length) {
      dataDir = argv[++i];
    } else if (arg.startsWith('--data-dir=')) {
      dataDir = arg.slice('--data-dir='.length);
    } else if (arg === '--no-default') {
      setDefault = false;
    }
  }

  return { from, dataDir, setDefault };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const args = parseCliArgs(process.argv.slice(2));
  if (!args.from) {
    console.error('Usage: tsx tools/import-unitdefs.ts --from <path-to-raw-unitdefs.json> [--data-dir <path>] [--no-default]');
    process.exit(1);
  }

  try {
    const result = importUnitdefs({
      fromPath: args.from,
      dataDir: args.dataDir,
      setDefault: args.setDefault
    });

    console.log(`import-unitdefs: Successfully imported snapshot to ${result.snapshotPath}`);
    console.log(`import-unitdefs: Updated index at ${result.indexPath} (default: ${result.index.default})`);
    console.log('');
    console.log(formatSummaryMarkdown(result.summary));

    if (result.summary.criticalMissingFields.length > 0) {
      console.error('');
      console.error(
        `ERROR: Critical simulator fields are missing: ${result.summary.criticalMissingFields.join(', ')}`
      );
      process.exit(1);
    }
  } catch (err) {
    console.error('import-unitdefs: Error:', err);
    process.exit(1);
  }
}
