import React from 'react';
import type { BuildPlan } from '../../../../core/schemas';
import { Tag } from '../ui/Tag';
import { FactionEmblem } from '../ui/FactionEmblem';

export interface LibraryPlanCardProps {
  plan: BuildPlan;
  isActive: boolean;
  provenanceLine: string;
  onSelect: (plan: BuildPlan) => void;
}

export function LibraryPlanCard({
  plan,
  isActive,
  provenanceLine,
  onSelect
}: LibraryPlanCardProps): React.JSX.Element {
  const isArmada = plan.factionId === 'armada';

  return (
    <div
      data-testid={`plan-card-${plan.id}`}
      onClick={() => onSelect(plan)}
      className={`p-4 pixel-box cursor-pointer transition-none relative group bg-[#0c0e18] hover:bg-[#121524] ${
        isActive ? 'border-[#4ade80]' : 'hover:border-zinc-500'
      }`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          isArmada ? 'bg-[#449bed]' : 'bg-[#ff2244]'
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <FactionEmblem faction={plan.factionId} size={24} />
          <h3 className="font-pixel-heading text-xs text-zinc-100 group-hover:text-white truncate">
            {plan.title}
          </h3>
        </div>

        {isActive && (
          <span className="font-pixel-heading text-[10px] px-1.5 py-0.5 border border-[#4ade80] bg-[#0c2e17] text-[#4ade80] shrink-0">
            ACTIVE
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <Tag variant={isArmada ? 'armada' : 'cortex'}>{plan.factionId}</Tag>
        <Tag variant="default">{plan.opening}</Tag>
        <Tag variant="default">{plan.energyStyle}</Tag>
        <Tag variant="default">{plan.skill}</Tag>
        <span data-num="true" className="font-mono text-[10px] text-zinc-400 ml-auto">
          {plan.steps.length} STEPS
        </span>
      </div>

      <div className="mt-3 pt-2 border-t border-zinc-800 text-[10px] text-zinc-400 font-pixel-heading truncate">
        {provenanceLine}
      </div>
    </div>
  );
}
