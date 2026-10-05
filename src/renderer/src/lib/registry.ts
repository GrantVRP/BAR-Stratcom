import { createRegistry, type Registry } from '../../../core/registry';
import { AliasesFileSchema, FactionsFileSchema, type UnitSnapshot, type FactionsFile, type AliasesFile } from '../../../core/schemas';
import factionsJson from '../../../../data/factions.json';
import aliasesJson from '../../../../data/aliases.json';

// Boot/test fallback until `registry:getMeta` answers: the same data/factions.json and aliases.json
// the main process serves (bundled at build time), never a hand-typed copy (T11.1)
const defaultFactions: FactionsFile = FactionsFileSchema.parse(factionsJson);
const defaultAliases: AliasesFile = AliasesFileSchema.parse(aliasesJson);

let cachedRegistry: Registry | null = null;
let cachedVersion: string | null = null;
let loadedMeta: { factions: FactionsFile; aliases: AliasesFile } | null = null;

/** Called by the snapshot store once the real factions and aliases are loaded from main. */
export function setClientRegistryMeta(meta: { factions: FactionsFile; aliases: AliasesFile }): void {
  loadedMeta = meta;
  cachedRegistry = null;
  cachedVersion = null;
}

export function getClientRegistry(snapshot: UnitSnapshot): Registry {
  if (cachedRegistry && cachedVersion === snapshot.gameVersion) {
    return cachedRegistry;
  }
  const registry = createRegistry(
    snapshot,
    loadedMeta?.factions ?? defaultFactions,
    loadedMeta?.aliases ?? defaultAliases
  );
  cachedRegistry = registry;
  cachedVersion = snapshot.gameVersion;
  return registry;
}
