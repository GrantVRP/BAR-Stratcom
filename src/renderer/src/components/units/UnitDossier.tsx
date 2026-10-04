import React, { useMemo } from 'react';
import type { Registry } from '../../../../core/registry';
import { classifyUnit } from '../../../../core/registry';
import type { BuildPlan, UnitDefRecord } from '../../../../core/schemas';
import { UnitIcon } from '../icons/UnitIcon';
import { Provenance } from '../ui/Provenance';
import { CLASS_LABELS } from '../../lib/unit-catalog';
import { UNIT_ART_CREDIT } from '../icons/unit-sprites';

export interface UnitDossierProps {
  unit: UnitDefRecord;
  registry: Registry;
  plans: BuildPlan[];
  gameVersion: string;
  onOpenUnit: (unitId: string) => void;
}

const heading = "font-['Press_Start_2P'] text-[10px] text-zinc-400";

function statRows(u: UnitDefRecord): Array<[string, string | number]> {
  const rows: Array<[string, string | number]> = [
    ['Metal cost', u.metalCost],
    ['Energy cost', u.energyCost],
    ['Build work', u.buildTime],
    ['Health', u.combat.health],
    ['Speed', u.combat.speed],
    ['Weapon range', u.combat.maxWeaponRange],
    ['Sight', u.combat.sightDistance],
    ['Radar', u.combat.radarDistance],
    ['Build power', u.buildSpeed]
  ];
  const eco = u.economy;
  const extra: Array<[string, number]> = [
    ['Energy make', eco.energyMake],
    ['Metal make', eco.metalMake],
    ['Energy upkeep', eco.energyUpkeep],
    ['Metal upkeep', eco.metalUpkeep],
    ['Extracts metal', eco.extractsMetal],
    ['Wind generator', eco.windGenerator],
    ['Tidal generator', eco.tidalGenerator],
    ['Energy storage', eco.energyStorage],
    ['Metal storage', eco.metalStorage]
  ];
  rows.push(...extra.filter(([, v]) => v !== 0));
  if (eco.converter) rows.push(['Converter', `${eco.converter.energyPerSecond} E/s → ${eco.converter.metalPerEnergy} M/E`]);
  return rows;
}

function UnitLinks({ title, units, onOpen }: { title: string; units: UnitDefRecord[]; onOpen: (id: string) => void }): React.JSX.Element | null {
  if (units.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className={heading}>{title}</div>
      <div className="flex flex-wrap gap-1">
        {units.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onOpen(u.id)}
            title={u.name}
            className="flex cursor-pointer items-center gap-1 border border-zinc-800 bg-[#0d0f17] px-1.5 py-1 font-mono text-sm text-zinc-300 hover:border-zinc-500"
          >
            <UnitIcon unitId={u.id} size={20} />
            {u.name}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Dossier drawer body: all snapshot fields, built by, can build, and plans using the unit. */
export function UnitDossier({ unit, registry, plans, gameVersion, onOpenUnit }: UnitDossierProps): React.JSX.Element {
  const builtBy = useMemo(() => registry.buildersOf(unit.id), [registry, unit.id]);
  const canBuild = useMemo(
    () => unit.buildOptions.map((id) => registry.get(id)).filter((u): u is UnitDefRecord => Boolean(u)),
    [registry, unit.buildOptions]
  );
  const usedBy = plans.filter((p) => p.steps.some((s) => s.unitId === unit.id));

  return (
    <div data-testid="unit-dossier" className="space-y-4">
      <div className="flex items-center gap-3">
        <UnitIcon unitId={unit.id} size={128} />
        <div className="min-w-0">
          <div className="font-['Press_Start_2P'] text-xs leading-relaxed text-zinc-100">{unit.name}</div>
          <div className="font-mono text-sm text-zinc-400">{unit.id}</div>
          <div className="font-mono text-sm text-zinc-300">{unit.tooltip}</div>
          <div className="mt-1 font-['Press_Start_2P'] text-[10px] text-zinc-400">
            {CLASS_LABELS[classifyUnit(unit)]}
            {unit.techLevel !== null ? ` // T${unit.techLevel}` : ''}
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={heading}>STATS</span>
          <Provenance kind="MEASURED" tooltip={`Exported from the game (version ${gameVersion})`} />
        </div>
        <table className="w-full font-mono text-sm">
          <tbody>
            {statRows(unit).map(([label, value]) => (
              <tr key={label} className="border-b border-zinc-900">
                <td className="py-0.5 text-zinc-400">{label}</td>
                <td className="py-0.5 text-right tabular-nums text-zinc-100">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {unit.missing.length > 0 && (
          <div className="font-mono text-sm text-zinc-400">Not in the export: {unit.missing.join(', ')}</div>
        )}
      </section>

      <UnitLinks title="BUILT BY" units={builtBy} onOpen={onOpenUnit} />
      <UnitLinks title="CAN BUILD" units={canBuild} onOpen={onOpenUnit} />

      <p className="font-mono text-sm text-zinc-400">{UNIT_ART_CREDIT}</p>

      <section className="space-y-2">
        <div className={heading}>PLANS USING THIS UNIT</div>
        {usedBy.length === 0 ? (
          <div className="font-mono text-sm text-zinc-400">None in your library.</div>
        ) : (
          usedBy.map((p) => (
            <a key={p.id} href={`#/library/${p.id}`} className="block font-mono text-sm text-[#449bed] hover:underline">
              {p.title}
            </a>
          ))
        )}
      </section>
    </div>
  );
}
