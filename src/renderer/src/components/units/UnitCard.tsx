import React from 'react';
import type { UnitDefRecord } from '../../../../core/schemas';
import type { UnitClass } from '../../../../core/registry';
import { UnitIcon } from '../icons/UnitIcon';
import { MetalIcon } from '../ui/MetalIcon';
import { EnergyIcon } from '../ui/EnergyIcon';
import { CLASS_LABELS } from '../../lib/unit-catalog';

export interface UnitCardProps {
  unit: UnitDefRecord;
  unitClass: UnitClass;
  selected: boolean;
  onSelect: (unitId: string) => void;
}

/** Catalog card: original class icon, name, id, costs and build time (06 §4.8). */
export function UnitCard({ unit, unitClass, selected, onSelect }: UnitCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      data-testid={`unit-card-${unit.id}`}
      onClick={() => onSelect(unit.id)}
      className={`pixel-box flex w-full cursor-pointer flex-col gap-2 border-2 bg-[#12131a] p-3 text-left active:translate-y-0.5 ${
        selected ? 'border-[#fbbf24]' : 'border-black hover:border-zinc-600'
      }`}
    >
      <div className="flex items-start gap-3">
        <UnitIcon unitId={unit.id} size={64} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-['Press_Start_2P'] text-[10px] leading-relaxed text-zinc-100" title={unit.name}>
            {unit.name}
          </div>
          <div className="truncate font-mono text-sm text-zinc-400">{unit.id}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="border border-zinc-700 bg-[#0d0f17] px-1 font-['Press_Start_2P'] text-[10px] text-zinc-300">
              {CLASS_LABELS[unitClass]}
            </span>
            {unit.techLevel !== null && (
              <span className="border border-[#b45309] bg-[#271d05] px-1 font-['Press_Start_2P'] text-[10px] text-[#fbbf24]">
                T{unit.techLevel}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 font-mono text-sm text-zinc-300">
        <span className="flex items-center gap-1" title="Metal cost">
          <MetalIcon size={14} />
          {unit.metalCost}
        </span>
        <span className="flex items-center gap-1" title="Energy cost">
          <EnergyIcon size={14} />
          {unit.energyCost}
        </span>
        <span title="Build work (seconds = work ÷ build power)">BT {unit.buildTime}</span>
      </div>
    </button>
  );
}
