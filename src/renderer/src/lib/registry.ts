import { createRegistry, type Registry } from '../../../core/registry';
import type { UnitSnapshot, FactionsFile, AliasesFile } from '../../../core/schemas';

// Boot/test fallback until `registry:getMeta` has loaded the real data/factions.json + aliases.json
const defaultFactions: FactionsFile = {
  schemaVersion: 1,
  factions: [
    {
      id: 'armada',
      displayName: 'Armada',
      unitPrefix: 'arm',
      enabled: true,
      accent: '#449bed',
      commanderIds: ['armcom']
    },
    {
      id: 'cortex',
      displayName: 'Cortex',
      unitPrefix: 'cor',
      enabled: true,
      accent: '#ff2244',
      commanderIds: ['corcom']
    }
  ]
};

const defaultAliases: AliasesFile = {
  schemaVersion: 1,
  aliases: []
};

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
