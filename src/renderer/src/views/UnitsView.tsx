import React, { useEffect, useMemo, useState } from 'react';
import type { UnitClass } from '../../../core/registry';
import { usePlans, useSnapshot } from '../stores';
import { getClientRegistry } from '../lib/registry';
import { buildableFrom, filterCatalog, techLevelsOf } from '../lib/unit-catalog';
import { UnitFilters } from '../components/units/UnitFilters';
import { UnitCard } from '../components/units/UnitCard';
import { UnitDossier } from '../components/units/UnitDossier';
import { Drawer } from '../components/ui/Drawer';
import { Provenance } from '../components/ui/Provenance';

/** Unit catalog with original class icons and a dossier drawer (06 §4.8, T10.3). */
export function UnitsView(): React.JSX.Element {
  const { snapshot, factions, load } = useSnapshot();
  const plans = usePlans((s) => s.plans);
  const loadPlans = usePlans((s) => s.loadPlans);
  const enabled = useMemo(() => factions.filter((f) => f.enabled), [factions]);

  const [factionChoice, setFactionChoice] = useState<string | null>(null);
  const [unitClass, setUnitClass] = useState<UnitClass | 'all'>('all');
  const [tech, setTech] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void load();
    void loadPlans();
  }, [load, loadPlans]);

  const factionId = factionChoice ?? enabled[0]?.id ?? null;
  const registry = useMemo(() => (snapshot ? getClientRegistry(snapshot) : null), [snapshot]);
  const buildable = useMemo(() => {
    const commanders = enabled.find((f) => f.id === factionId)?.commanderIds ?? [];
    return registry ? buildableFrom(registry, commanders) : new Set<string>();
  }, [registry, enabled, factionId]);
  const entries = useMemo(
    () =>
      registry && factionId
        ? filterCatalog(registry, { factionId, unitClass, tech, query, only: showAll ? undefined : buildable })
        : [],
    [registry, factionId, unitClass, tech, query, showAll, buildable]
  );
  const hiddenCount =
    registry && factionId && !showAll ? registry.byFaction(factionId).filter((u) => !buildable.has(u.id)).length : 0;
  const techLevels = useMemo(() => (registry && factionId ? techLevelsOf(registry, factionId) : []), [registry, factionId]);
  const openUnit = openId && registry ? registry.get(openId) : undefined;

  return (
    <div data-testid="view-units" className="flex h-full flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-['Press_Start_2P'] text-sm text-zinc-100">UNIT CATALOG</h1>
        {snapshot && (
          <div className="flex items-center gap-2 font-mono text-sm text-zinc-400" data-testid="units-game-version">
            Data from game version {snapshot.gameVersion}
            <Provenance kind="MEASURED" tooltip="Unit definitions exported from the game by the StratCom widget" />
          </div>
        )}
      </header>

      {factionId && (
        <UnitFilters
          factions={enabled}
          factionId={factionId}
          onFaction={setFactionChoice}
          unitClass={unitClass}
          onClass={setUnitClass}
          techLevels={techLevels}
          tech={tech}
          onTech={setTech}
          query={query}
          onQuery={setQuery}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 font-mono text-sm text-zinc-400" data-testid="units-count">
        <span>{snapshot ? `${entries.length} units` : 'Loading unit data…'}</span>
        {snapshot && (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              data-testid="units-show-all"
            />
            {showAll ? 'Showing game-mode variants too' : `Show ${hiddenCount} game-mode variants (not buildable in a normal game)`}
          </label>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {entries.map((e) => (
          <UnitCard key={e.unit.id} unit={e.unit} unitClass={e.unitClass} selected={e.unit.id === openId} onSelect={setOpenId} />
        ))}
      </div>

      <Drawer open={Boolean(openUnit)} onClose={() => setOpenId(null)} title="UNIT DOSSIER" width="w-[28rem]">
        {openUnit && registry && snapshot && (
          <UnitDossier unit={openUnit} registry={registry} plans={plans} gameVersion={snapshot.gameVersion} onOpenUnit={setOpenId} />
        )}
      </Drawer>
    </div>
  );
}
