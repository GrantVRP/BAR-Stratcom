import fs from 'node:fs';
import path from 'node:path';
import { createRegistry, type Registry } from '../../src/core/registry';
import { AliasesFileSchema, FactionsFileSchema, SnapshotIndexSchema, UnitSnapshotSchema } from '../../src/core/schemas';

/**
 * Registry per game version for tools: the version's own snapshot when data/snapshots has it, else the
 * default one (as the app's capture does).
 */
export function registryLoader(dataDir = path.join(process.cwd(), 'data')): (gameVersion: string) => Registry {
  const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(path.join(dataDir, p), 'utf-8'));
  const index = SnapshotIndexSchema.parse(readJson('snapshots/index.json'));
  const factions = FactionsFileSchema.parse(readJson('factions.json'));
  const aliases = AliasesFileSchema.parse(readJson('aliases.json'));
  const cache = new Map<string, Registry>();
  return (gameVersion) => {
    const entry =
      index.available.find((a) => a.gameVersion === gameVersion) ?? index.available.find((a) => a.gameVersion === index.default)!;
    let registry = cache.get(entry.gameVersion);
    if (!registry) {
      registry = createRegistry(UnitSnapshotSchema.parse(readJson(path.join('snapshots', entry.path))), factions, aliases);
      cache.set(entry.gameVersion, registry);
    }
    return registry;
  };
}

/** Faction ids that are enabled in data/factions.json (Legion is not yet). */
export function enabledFactions(dataDir = path.join(process.cwd(), 'data')): Set<string> {
  const file = FactionsFileSchema.parse(JSON.parse(fs.readFileSync(path.join(dataDir, 'factions.json'), 'utf-8')));
  return new Set(file.factions.filter((f) => f.enabled).map((f) => f.id));
}

/** AI teams in fixtures are named "AI" or end in "(AI)". */
export const isAiPlayerName = (name: string): boolean => name === 'AI' || name.endsWith('(AI)');
