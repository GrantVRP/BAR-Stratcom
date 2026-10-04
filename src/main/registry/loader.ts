import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import {
  AliasesFileSchema,
  FactionsFileSchema,
  SnapshotIndexSchema,
  UnitSnapshotSchema,
  type UnitSnapshot,
  type FactionsFile,
  type AliasesFile
} from '../../core/schemas';
import { createRegistry, type Registry } from '../../core/registry';

export function findDataDir(): string {
  try {
    if (app && app.isPackaged && process.resourcesPath) {
      const prodData = path.join(process.resourcesPath, 'data');
      if (fs.existsSync(prodData)) {
        return prodData;
      }
    }
  } catch {
    // Ignore outside Electron
  }

  const candidates = [
    path.join(process.cwd(), 'data'),
    path.resolve(__dirname, '../../data'),
    path.resolve(__dirname, '../../../data'),
    path.resolve(__dirname, '../../../../data')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'factions.json'))) {
      return candidate;
    }
  }

  return path.join(process.cwd(), 'data');
}

const registryCache = new Map<string, Registry>();
const snapshotCache = new Map<string, UnitSnapshot>();

export function loadSnapshot(gameVersion?: string): UnitSnapshot {
  const dataDir = findDataDir();
  const indexPath = path.join(dataDir, 'snapshots', 'index.json');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  const index = SnapshotIndexSchema.parse(JSON.parse(indexContent));

  const targetVersion = gameVersion ?? index.default;
  const cached = snapshotCache.get(targetVersion);
  if (cached) return cached;

  const entry = index.available.find((a) => a.gameVersion === targetVersion);
  const relPath = entry ? entry.path : `${targetVersion}/units.json`;
  const snapshotPath = path.join(dataDir, 'snapshots', relPath);

  const content = fs.readFileSync(snapshotPath, 'utf-8');
  const snapshot = UnitSnapshotSchema.parse(JSON.parse(content));
  snapshotCache.set(targetVersion, snapshot);
  return snapshot;
}

/** Factions and aliases from data/ (the renderer builds its registry from these plus the snapshot). */
export function loadRegistryMeta(): { factions: FactionsFile; aliases: AliasesFile } {
  const dataDir = findDataDir();
  return {
    factions: FactionsFileSchema.parse(JSON.parse(fs.readFileSync(path.join(dataDir, 'factions.json'), 'utf-8'))),
    aliases: AliasesFileSchema.parse(JSON.parse(fs.readFileSync(path.join(dataDir, 'aliases.json'), 'utf-8')))
  };
}

export function loadRegistry(gameVersion?: string): Registry {
  const snapshot = loadSnapshot(gameVersion);
  const versionKey = snapshot.gameVersion;
  const cached = registryCache.get(versionKey);
  if (cached) return cached;

  const { factions, aliases } = loadRegistryMeta();
  const registry = createRegistry(snapshot, factions, aliases);
  registryCache.set(versionKey, registry);
  return registry;
}
