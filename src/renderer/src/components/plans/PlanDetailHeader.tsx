import React from 'react';
import { Check, Copy, Edit, Share2, Trash2, Zap } from 'lucide-react';
import type { BuildPlan } from '../../../../core/schemas';
import { FactionEmblem } from '../ui/FactionEmblem';
import { factionAccent } from '../../lib/faction-style';

export interface PlanDetailHeaderProps {
  plan: BuildPlan;
  isActive: boolean;
  isCurated: boolean;
  provenanceText: string;
  onActivate: () => void;
  onEdit: () => void;
  onEditCopy: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export function PlanDetailHeader({
  plan,
  isActive,
  isCurated,
  provenanceText,
  onActivate,
  onEdit,
  onEditCopy,
  onDelete,
  onShare
}: PlanDetailHeaderProps): React.JSX.Element {
  return (
    <div className="p-4 pixel-box bg-[#0c0e18] space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FactionEmblem faction={plan.factionId} size={36} />
          <div>
            <h2 className="font-pixel-heading text-sm text-white tracking-wide">
              {plan.title}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 text-zinc-400 text-xs flex-wrap">
              <span className="font-pixel-heading text-[10px] uppercase" style={{ color: factionAccent(plan.factionId) }}>
                {plan.factionId}
              </span>
              <span>//</span>
              <span className="font-pixel-heading text-[10px] text-zinc-400 uppercase">
                {plan.opening}
              </span>
              <span>//</span>
              <span className="font-pixel-heading text-[10px] text-zinc-400 uppercase">
                {plan.energyStyle}
              </span>
              <span>//</span>
              <span className="font-pixel-heading text-[10px] text-zinc-400 uppercase">
                {plan.skill}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onActivate}
            data-testid="btn-activate-plan"
            className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-none ${
              isActive
                ? 'border-2 border-[#4ade80] bg-[#0c2e17] text-[#4ade80]'
                : 'border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed] hover:bg-[#122845]'
            }`}
          >
            {isActive ? <Check className="size-3.5" /> : <Zap className="size-3.5" />}
            <span className="font-pixel-heading text-[10px]">
              {isActive ? 'ACTIVE PLAN' : 'ACTIVATE'}
            </span>
          </button>

          {!isCurated ? (
            <button
              type="button"
              onClick={onEdit}
              data-testid="btn-edit-plan"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 cursor-pointer transition-none"
            >
              <Edit className="size-3.5" />
              <span className="font-pixel-heading text-[10px]">EDIT PLAN</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEditCopy}
              data-testid="btn-edit-copy"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 cursor-pointer transition-none"
            >
              <Copy className="size-3.5" />
              <span className="font-pixel-heading text-[10px]">EDIT A COPY</span>
            </button>
          )}

          <button
            type="button"
            onClick={onShare}
            data-testid="btn-share-plan"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 cursor-pointer transition-none"
          >
            <Share2 className="size-3.5" />
            <span className="font-pixel-heading text-[10px]">SHARE</span>
          </button>

          {!isCurated && (
            <button
              type="button"
              onClick={onDelete}
              data-testid="btn-delete-plan"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900 bg-red-950/60 text-red-300 hover:border-red-600 cursor-pointer transition-none"
            >
              <Trash2 className="size-3.5" />
              <span className="font-pixel-heading text-[10px]">DELETE</span>
            </button>
          )}
        </div>
      </div>

      {/* Provenance and description */}
      <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-400 space-y-1">
        <div className="text-[10px] font-pixel-heading text-zinc-400 truncate">
          {provenanceText}
        </div>
        {plan.description && (
          <div className="text-zinc-300 text-xs leading-relaxed">{plan.description}</div>
        )}
      </div>
    </div>
  );
}
