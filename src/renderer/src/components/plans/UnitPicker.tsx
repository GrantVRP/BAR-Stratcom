import React, { useMemo, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { Actor, UnitDefRecord } from '../../../../core/schemas';
import { useSnapshot } from '../../stores';
import { getClientRegistry } from '../../lib/registry';
import { TacticalIcon } from './TacticalIcon';
import { MetalIcon } from '../ui/MetalIcon';
import { EnergyIcon } from '../ui/EnergyIcon';

export interface UnitPickerProps {
  isOpen: boolean;
  actor: Actor;
  availableActors?: Actor[];
  faction: string;
  onSelect: (unit: UnitDefRecord, actor?: Actor) => void;
  onClose: () => void;
}

function getBuilderDefId(a: Actor, reg: import('../../../../core/registry').Registry, f: string): string {
  if (a.kind === 'commander') {
    try {
      return reg.commanderOf(f).id;
    } catch {
      return 'armcom';
    }
  }
  return a.unitId;
}

export function UnitPicker({
  isOpen,
  actor,
  availableActors,
  faction,
  onSelect,
  onClose
}: UnitPickerProps): React.JSX.Element | null {
  const [search, setSearch] = useState('');
  const [selectedActorKey, setSelectedActorKey] = useState<string>('all');
  const snapshot = useSnapshot((s) => s.snapshot);

  const handleClose = React.useCallback((): void => {
    setSearch('');
    setSelectedActorKey('all');
    onClose();
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const registry = useMemo(() => {
    return snapshot ? getClientRegistry(snapshot) : null;
  }, [snapshot]);

  const buildableUnits = useMemo(() => {
    if (!registry) return [];
    if (availableActors && availableActors.length > 1 && selectedActorKey === 'all') {
      const unitMap = new Map<string, UnitDefRecord>();
      for (const a of availableActors) {
        const bId = getBuilderDefId(a, registry, faction);
        const bDef = registry.get(bId);
        for (const optId of bDef?.buildOptions ?? []) {
          const u = registry.get(optId);
          if (u) unitMap.set(u.id, u);
        }
      }
      return Array.from(unitMap.values());
    }

    const currentActor =
      availableActors && selectedActorKey !== 'all'
        ? availableActors.find((_, i) => `actor-${i}` === selectedActorKey) ?? actor
        : actor;

    const builderId = getBuilderDefId(currentActor, registry, faction);
    const builderDef = registry.get(builderId);
    const options = builderDef?.buildOptions ?? [];
    const direct = options
      .map((id) => registry.get(id))
      .filter((u): u is UnitDefRecord => u !== undefined);

    if (direct.length > 0) return direct;
    return registry.byFaction(faction);
  }, [registry, actor, availableActors, selectedActorKey, faction]);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buildableUnits;

    return buildableUnits
      .filter((u) => {
        return (
          u.name.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aPrefix = a.name.toLowerCase().startsWith(q) ? 1 : 0;
        const bPrefix = b.name.toLowerCase().startsWith(q) ? 1 : 0;
        return bPrefix - aPrefix;
      });
  }, [buildableUnits, search]);

  if (!isOpen) return null;

  const actorLabel =
    actor.kind === 'commander'
      ? 'COMMANDER'
      : `${actor.kind.toUpperCase()} #${actor.index} (${actor.unitId})`;

  const handleSelect = (u: UnitDefRecord): void => {
    let chosenActor: Actor | undefined;
    if (availableActors && availableActors.length > 0) {
      if (selectedActorKey !== 'all') {
        chosenActor = availableActors.find((_, i) => `actor-${i}` === selectedActorKey);
      } else if (registry) {
        chosenActor = availableActors.find((a) => {
          const bId = getBuilderDefId(a, registry, faction);
          return registry.canBuild(bId, u.id);
        });
      }
    }
    onSelect(u, chosenActor ?? actor);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4"
      data-testid="unit-picker-modal"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0c0e18] border-2 border-zinc-700 pixel-box shadow-[4px_4px_0px_#000] p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h2 className="font-pixel-heading text-xs text-white">SELECT UNIT TO BUILD</h2>
            {availableActors && availableActors.length > 1 ? (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-pixel-heading text-zinc-400">ACTOR:</span>
                <select
                  data-testid="select-picker-actor"
                  value={selectedActorKey}
                  onChange={(e) => setSelectedActorKey(e.target.value)}
                  className="bg-[#080910] border border-zinc-700 text-zinc-200 text-[10px] font-pixel-heading px-2 py-0.5"
                >
                  <option value="all">ALL AVAILABLE BUILDERS ({availableActors.length})</option>
                  {availableActors.map((a, i) => (
                    <option key={`actor-${i}`} value={`actor-${i}`}>
                      {a.kind === 'commander' ? 'COMMANDER' : `${a.kind.toUpperCase()} #${a.index} (${a.unitId})`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-[10px] font-pixel-heading text-zinc-400 mt-1">
                ACTOR: <span className="text-zinc-200">{actorLabel}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-unit-picker"
            className="p-1 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 cursor-pointer transition-none"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-zinc-500" />
          <input
            type="text"
            data-testid="input-picker-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unit name or ID..."
            autoFocus
            className="w-full bg-[#080910] border border-zinc-700 px-3 py-2 pl-9 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#449bed]"
          />
        </div>

        {/* Unit list */}
        <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
          {filteredUnits.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-xs text-zinc-500">
              No buildable units matching &quot;{search}&quot;
            </div>
          ) : (
            filteredUnits.map((u) => (
              <button
                key={u.id}
                type="button"
                data-testid={`picker-unit-${u.id}`}
                onClick={() => {
                  handleSelect(u);
                }}
                className="flex items-start gap-3 p-2.5 text-left border border-zinc-800 bg-[#0a0c16] hover:bg-[#141828] hover:border-zinc-500 cursor-pointer transition-none group"
              >
                <TacticalIcon unitId={u.id} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="font-pixel-heading text-[10px] text-zinc-200 group-hover:text-white truncate">
                    {u.name}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-500 truncate">
                    {u.id}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                    <span className="flex items-center gap-0.5 text-zinc-300">
                      <MetalIcon size={10} />
                      <span data-num="true" className="font-mono">{u.metalCost}</span>
                    </span>
                    <span className="flex items-center gap-0.5 text-[#fbbf24]">
                      <EnergyIcon size={10} />
                      <span data-num="true" className="font-mono">{u.energyCost}</span>
                    </span>
                    <span className="text-zinc-500 font-mono" data-num="true">
                      {u.buildTime}BP
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
