import React from 'react';
import { Check, Copy, Edit, Share2, Trash2, Zap } from 'lucide-react';
import type { BuildPlan } from '../../../../core/schemas';
import { FactionEmblem } from '../ui/FactionEmblem';
import { factionAccent } from '../../lib/faction-style';
import { Button } from '../ui/Button';

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
            <h2 className="font-pixel-heading text-base leading-relaxed tracking-wide text-white">
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

        {/* Actions: ACTIVATE is the main one (filled, faction colour); delete is set apart */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={isActive ? 'default' : 'primary'}
            size="md"
            onClick={onActivate}
            data-testid="btn-activate-plan"
            className={`gap-1.5 ${isActive ? 'text-[#4ade80]' : ''}`}
            style={isActive ? undefined : ({ '--btn-accent': factionAccent(plan.factionId) } as React.CSSProperties)}
          >
            {isActive ? <Check className="size-3.5" /> : <Zap className="size-3.5" />}
            {isActive ? 'ACTIVE PLAN' : 'ACTIVATE'}
          </Button>
          {!isCurated ? (
            <Button variant="default" size="md" onClick={onEdit} data-testid="btn-edit-plan" className="gap-1.5">
              <Edit className="size-3.5" />
              EDIT PLAN
            </Button>
          ) : (
            <Button variant="default" size="md" onClick={onEditCopy} data-testid="btn-edit-copy" className="gap-1.5">
              <Copy className="size-3.5" />
              EDIT A COPY
            </Button>
          )}
          <Button variant="default" size="md" onClick={onShare} data-testid="btn-share-plan" className="gap-1.5">
            <Share2 className="size-3.5" />
            SHARE
          </Button>
          {!isCurated && (
            <Button variant="danger" size="md" onClick={onDelete} data-testid="btn-delete-plan" className="ml-4 gap-1.5">
              <Trash2 className="size-3.5" />
              DELETE
            </Button>
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
