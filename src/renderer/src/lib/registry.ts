import { createRegistry, type Registry } from '../../../core/registry';
import type { UnitSnapshot, FactionsFile, AliasesFile } from '../../../core/schemas';

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

export function getClientRegistry(snapshot: UnitSnapshot): Registry {
  if (cachedRegistry && cachedVersion === snapshot.gameVersion) {
    return cachedRegistry;
  }
  const registry = createRegistry(snapshot, defaultFactions, defaultAliases);
  cachedRegistry = registry;
  cachedVersion = snapshot.gameVersion;
  return registry;
}
