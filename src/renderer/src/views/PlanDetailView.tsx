import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Trash2, Zap } from 'lucide-react';
import type { BuildPlan, MapRecord } from '../../../core/schemas';
import { validatePlan } from '../../../core/plans';
import { usePlans, useSettings, useSnapshot } from '../stores';
import { getClientRegistry } from '../lib/registry';
import { FactionEmblem } from '../components/ui/FactionEmblem';
import { MapCombobox } from '../components/tactical/MapCombobox';
import { PlanTimeline } from '../components/plans/PlanTimeline';

export interface PlanDetailViewProps {
  plan: BuildPlan;
  onBack: () => void;
  onSelectPlan?: (plan: BuildPlan) => void;
}

function formatProvenanceLine(source: BuildPlan['source']): string {
  if (source.kind === 'curated') {
    const date = source.playedAt.slice(0, 10);
    return `CURATED // from ${source.player} on ${source.map}, ${date}`;
  }
  if (source.kind === 'replay-capture') {
    const date = source.capturedAt.slice(0, 10);
    return `CAPTURED // from ${source.player} on ${source.map}, ${date}`;
  }
  if (source.kind === 'own-game') {
    const date = source.capturedAt.slice(0, 10);
    return `OWN GAME // on ${source.map}, ${date}`;
  }
  if (source.kind === 'adapted') {
    const date = source.createdAt.slice(0, 10);
    return `ADAPTED // from ${source.fromPlanId}, ${date}`;
  }
  if (source.kind === 'ai-draft') {
    const date = source.createdAt.slice(0, 10);
    return `AI DRAFT // ${source.provider}/${source.model}, ${date}`;
  }
  return `MANUAL // ${source.createdAt.slice(0, 10)}`;
}

export function PlanDetailView({
  plan,
  onBack,
  onSelectPlan
}: PlanDetailViewProps): React.JSX.Element {
  const { activePlanId, setActivePlanId, savePlan, deletePlan } = usePlans();
  const updateSettings = useSettings((s) => s.update);
  const snapshot = useSnapshot((s) => s.snapshot);
  const [selectedMap, setSelectedMap] = useState<MapRecord | null>(null);

  const isActive = activePlanId === plan.id;
  const isCurated = plan.source.kind === 'curated';

  const validation = useMemo(() => {
    if (!snapshot) return { errors: [], warnings: [] };
    const registry = getClientRegistry(snapshot);
    return validatePlan(plan, registry);
  }, [plan, snapshot]);

  const handleActivate = async (): Promise<void> => {
    setActivePlanId(plan.id);
    await updateSettings({ activePlanId: plan.id });
  };

  const handleEditCopy = async (): Promise<void> => {
    const copyId = `user-${Date.now().toString(36)}`;
    const copy: BuildPlan = {
      ...plan,
      id: copyId,
      title: `${plan.title} (Copy)`,
      source: {
        kind: 'manual',
        createdAt: new Date().toISOString()
      }
    };
    const saved = await savePlan(copy);
    if (saved && onSelectPlan) {
      onSelectPlan(saved);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (isCurated) return;
    const ok = await deletePlan(plan.id);
    if (ok) {
      onBack();
    }
  };

  const provenanceText = formatProvenanceLine(plan.source);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5" data-testid="view-plan-detail">
      {/* Top navigation back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          data-testid="btn-back-to-library"
          className="flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer px-2.5 py-1.5 pixel-box transition-none"
        >
          <ArrowLeft className="size-4" />
          <span className="font-pixel-heading text-[10px]">BACK TO LIBRARY</span>
        </button>

        {/* Validation Badge */}
        <div>
          {validation.errors.length > 0 ? (
            <span
              data-testid="badge-validation-errors"
              className="px-2 py-1 font-pixel-heading text-[10px] border-2 border-red-500 bg-[#2b0c10] text-red-300"
            >
              <span data-num="true">{validation.errors.length}</span> ERRORS
            </span>
          ) : validation.warnings.length > 0 ? (
            <span
              data-testid="badge-validation-warnings"
              className="px-2 py-1 font-pixel-heading text-[10px] border-2 border-amber-500 bg-[#2d1f05] text-amber-300"
            >
              <span data-num="true">{validation.warnings.length}</span> WARNINGS
            </span>
          ) : (
            <span
              data-testid="badge-validation-valid"
              className="px-2 py-1 font-pixel-heading text-[10px] border-2 border-green-500 bg-[#0c2b14] text-green-300"
            >
              VALID
            </span>
          )}
        </div>
      </div>

      {/* Plan Header Card */}
      <div className="p-4 pixel-box bg-[#0c0e18] space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <FactionEmblem faction={plan.factionId} size={36} />
            <div>
              <h2 className="font-pixel-heading text-sm text-white tracking-wide">
                {plan.title}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 text-zinc-400 text-xs flex-wrap">
                <span className="font-pixel-heading text-[10px] text-zinc-300 uppercase">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleActivate}
              data-testid="btn-activate-plan"
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-none ${
                isActive
                  ? 'border-2 border-[#4ade80] bg-[#0c2e17] text-[#4ade80]'
                  : 'border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed] hover:bg-[#122845]'
              }`}
            >
              {isActive ? (
                <>
                  <Check className="size-4" />
                  <span className="font-pixel-heading text-[10px]">ACTIVE PLAN</span>
                </>
              ) : (
                <>
                  <Zap className="size-4" />
                  <span className="font-pixel-heading text-[10px]">ACTIVATE</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleEditCopy}
              data-testid="btn-edit-copy"
              className="flex items-center gap-1.5 px-3 py-2 border-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 cursor-pointer transition-none"
              title="Duplicate into editable user plan"
            >
              <Copy className="size-4" />
              <span className="font-pixel-heading text-[10px]">EDIT A COPY</span>
            </button>

            {!isCurated && (
              <button
                type="button"
                onClick={handleDelete}
                data-testid="btn-delete-plan"
                className="flex items-center gap-1.5 px-3 py-2 border-2 border-red-900 bg-red-950/60 text-red-300 hover:border-red-600 cursor-pointer transition-none"
                title="Delete user plan"
              >
                <Trash2 className="size-4" />
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
            <div className="text-zinc-300 text-xs leading-relaxed">
              {plan.description}
            </div>
          )}
        </div>
      </div>

      {/* Map Selector */}
      <div className="space-y-1.5">
        <div className="font-pixel-heading text-[10px] text-zinc-400 uppercase tracking-wider">
          THEATER / MAP SELECTOR
        </div>
        <MapCombobox
          selectedMap={selectedMap}
          onSelectMap={setSelectedMap}
          faction={plan.factionId}
        />
      </div>

      {/* Plan Timeline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-pixel-heading text-[10px] text-zinc-400 uppercase tracking-wider">
            BUILD TIMELINE (<span data-num="true">{plan.steps.length}</span> STEPS)
          </div>
        </div>
        <PlanTimeline plan={plan} />
      </div>
    </div>
  );
}
