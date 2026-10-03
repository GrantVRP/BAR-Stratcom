import React from 'react';
import type { BuildPlan } from '../../../../core/schemas';

export interface PlanMetaCardProps {
  title: string;
  factionId: string;
  opening: BuildPlan['opening'];
  onUpdate: (updates: Partial<BuildPlan>) => void;
}

export function PlanMetaCard({
  title,
  factionId,
  opening,
  onUpdate
}: PlanMetaCardProps): React.JSX.Element {
  return (
    <div className="p-4 pixel-box bg-[#0c0e18] grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="md:col-span-2 space-y-1">
        <label className="font-pixel-heading text-[10px] text-zinc-400">PLAN TITLE</label>
        <input
          type="text"
          data-testid="input-plan-title"
          value={title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full bg-[#080910] border border-zinc-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#449bed]"
        />
      </div>

      <div className="space-y-1">
        <label className="font-pixel-heading text-[10px] text-zinc-400">FACTION</label>
        <select
          data-testid="select-plan-faction"
          value={factionId}
          onChange={(e) => onUpdate({ factionId: e.target.value })}
          className="w-full bg-[#080910] border border-zinc-700 px-2 py-1.5 text-xs text-white focus:outline-none"
        >
          <option value="armada">Armada</option>
          <option value="cortex">Cortex</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="font-pixel-heading text-[10px] text-zinc-400">OPENING</label>
        <select
          data-testid="select-plan-opening"
          value={opening}
          onChange={(e) => onUpdate({ opening: e.target.value as never })}
          className="w-full bg-[#080910] border border-zinc-700 px-2 py-1.5 text-xs text-white focus:outline-none"
        >
          <option value="bot">Bot</option>
          <option value="vehicle">Vehicle</option>
          <option value="air">Air</option>
          <option value="sea">Sea</option>
          <option value="hover">Hover</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>
    </div>
  );
}
