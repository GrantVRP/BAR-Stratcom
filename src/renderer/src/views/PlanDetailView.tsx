import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { BuildPlan, MapRecord } from '../../../core/schemas';
import { validatePlan } from '../../../core/plans';
import { findMapByScriptName } from '../../../core/maps';
import { usePlans, useSettings, useSnapshot } from '../stores';
import { getClientRegistry } from '../lib/registry';
import { ipcClient } from '../lib/ipc-client';
import { MapCombobox } from '../components/tactical/MapCombobox';
import { PlanTimeline } from '../components/plans/PlanTimeline';
import { SimGraph } from '../components/SimGraph';
import { PlanDetailHeader } from '../components/plans/PlanDetailHeader';
import { SharePlanDialog } from '../components/plans/SharePlanDialog';

export interface PlanDetailViewProps {
  plan: BuildPlan;
  onBack: () => void;
  onSelectPlan?: (plan: BuildPlan) => void;
  onEditPlan?: (plan: BuildPlan) => void;
}

function formatProvenanceLine(source: BuildPlan['source']): string {
  const d = (iso: string): string => iso.slice(0, 10);
  switch (source.kind) {
    case 'curated': return `CURATED // from ${source.player} on ${source.map}, ${d(source.playedAt)}`;
    case 'replay-capture': return `CAPTURED // from ${source.player} on ${source.map}, ${d(source.capturedAt)}`;
    case 'own-game': return `SAMPLE // owner game vs AI, ${source.map}, ${d(source.capturedAt)}`;
    case 'adapted': return `ADAPTED // from ${source.fromPlanId}, ${d(source.createdAt)}`;
    case 'ai-draft': return `AI DRAFT // ${source.provider}/${source.model}, ${d(source.createdAt)}`;
    default: return `MANUAL // ${d(source.createdAt)}`;
  }
}

export function PlanDetailView({
  plan,
  onBack,
  onSelectPlan,
  onEditPlan
}: PlanDetailViewProps): React.JSX.Element {
  const { activePlanId, setActivePlanId, savePlan, deletePlan } = usePlans();
  const updateSettings = useSettings((s) => s.update);
  const snapshot = useSnapshot((s) => s.snapshot);
  const [selectedMap, setSelectedMap] = useState<MapRecord | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let active = true;
    ipcClient.invoke('maps:list').then((res) => {
      if (!active || !res.ok) return;
      const maps = res.data;
      if (maps.length === 0) return;

      let resolved: MapRecord | undefined;
      const firstFit = plan.mapFit?.maps?.[0];
      if (firstFit) {
        resolved = findMapByScriptName(maps, firstFit) || maps.find((m) => m.fileName === firstFit);
      }
      const sourceMap = 'map' in plan.source && typeof plan.source.map === 'string' ? plan.source.map : undefined;
      if (!resolved && sourceMap) {
        resolved = findMapByScriptName(maps, sourceMap) || maps.find((m) => m.fileName === sourceMap);
      }
      if (!resolved) {
        const sorted = [...maps].sort((a, b) => {
          const rankA = a.popularity?.rank ?? 999999;
          const rankB = b.popularity?.rank ?? 999999;
          return rankA - rankB;
        });
        resolved = sorted[0];
      }
      if (resolved) {
        setSelectedMap(resolved);
      }
    }).catch((err) => {
      console.warn('Failed to load maps for plan detail:', err);
    });
    return () => {
      active = false;
    };
  }, [plan]);

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
      source: { kind: 'manual', createdAt: new Date().toISOString() }
    };
    const saved = await savePlan(copy);
    if (saved) {
      if (onEditPlan) onEditPlan(saved);
      else if (onSelectPlan) onSelectPlan(saved);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (isCurated) return;
    const ok = await deletePlan(plan.id);
    if (ok) onBack();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5" data-testid="view-plan-detail">
      {/* Top navigation back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          data-testid="btn-back-to-library"
          className="flex items-center gap-2 px-1 py-1 text-zinc-400 hover:text-white cursor-pointer transition-none"
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
      <PlanDetailHeader
        plan={plan}
        isActive={isActive}
        isCurated={isCurated}
        provenanceText={formatProvenanceLine(plan.source)}
        onActivate={handleActivate}
        onEdit={() => onEditPlan?.(plan)}
        onEditCopy={handleEditCopy}
        onDelete={handleDelete}
        onShare={() => setShareOpen(true)}
      />

      {/* Map Selector */}
      <div className="space-y-1.5">
        <div className="font-pixel-heading text-[10px] text-zinc-400 uppercase tracking-wider">
          MAP
        </div>
        <MapCombobox
          selectedMap={selectedMap}
          onSelectMap={setSelectedMap}
          faction={plan.factionId}
        />
      </div>

      {/* Simulation Graph */}
      <div className="space-y-1.5">
        <div className="font-pixel-heading text-[10px] text-zinc-400 uppercase tracking-wider">
          ECONOMY
        </div>
        <SimGraph plan={plan} mapRecord={selectedMap} />
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

      {/* Share Dialog */}
      <SharePlanDialog
        plan={plan}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
