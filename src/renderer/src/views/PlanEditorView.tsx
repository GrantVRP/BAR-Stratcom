import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import type { Actor, BuildPlan, BuildStep, UnitDefRecord } from '../../../core/schemas';
import { validatePlan } from '../../../core/plans';
import { usePlans, useSnapshot } from '../stores';
import { getClientRegistry } from '../lib/registry';
import { ValidationPanel } from '../components/plans/ValidationPanel';
import { SimGraph } from '../components/SimGraph';
import { UnitPicker } from '../components/plans/UnitPicker';
import { EditorStepRow } from '../components/plans/EditorStepRow';
import { PlanMetaCard } from '../components/plans/PlanMetaCard';

export interface PlanEditorViewProps {
  initialPlan?: BuildPlan | null;
  onBack: () => void;
  onSaved?: (plan: BuildPlan) => void;
}

const createDefaultDraft = (f = 'armada', v = 'Beyond All Reason'): BuildPlan => ({
  schemaVersion: 1, id: `user-${Date.now().toString(36)}`, title: 'New Build Plan',
  factionId: f, gameVersion: v, modes: ['1v1'], role: 'front', skill: 'beginner',
  opening: 'bot', energyStyle: 'wind', source: { kind: 'manual', createdAt: new Date().toISOString() },
  steps: []
});

export function PlanEditorView({
  initialPlan,
  onBack,
  onSaved
}: PlanEditorViewProps): React.JSX.Element {
  const { savePlan } = usePlans();
  const snapshot = useSnapshot((s) => s.snapshot);

  const [draft, setDraft] = useState<BuildPlan>(() => {
    return initialPlan ? JSON.parse(JSON.stringify(initialPlan)) : createDefaultDraft();
  });

  const [debouncedPlan, setDebouncedPlan] = useState<BuildPlan>(draft);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPlan(draft), 150);
    return () => clearTimeout(timer);
  }, [draft]);

  const registry = useMemo(() => {
    return snapshot ? getClientRegistry(snapshot) : null;
  }, [snapshot]);

  const validation = useMemo(() => {
    if (!registry) return { errors: [], warnings: [] };
    return validatePlan(draft, registry);
  }, [draft, registry]);

  const getAvailableActors = (stepIdx: number): Actor[] => {
    const actors: Actor[] = [{ kind: 'commander' }];
    if (!registry) return actors;
    const fCounts = new Map<string, number>();
    const bCounts = new Map<string, number>();
    for (let i = 0; i < stepIdx; i++) {
      const s = draft.steps[i];
      if (!s || s.action !== 'build' || !s.unitId) continue;
      const def = registry.get(s.unitId);
      if (!def) continue;
      if (def.isFactory) {
        const cur = fCounts.get(def.id) ?? 0;
        for (let c = 1; c <= s.count; c++) actors.push({ kind: 'factory', unitId: def.id, index: cur + c });
        fCounts.set(def.id, cur + s.count);
      } else if (def.isBuilder && !def.isCommander) {
        const cur = bCounts.get(def.id) ?? 0;
        for (let c = 1; c <= s.count; c++) actors.push({ kind: 'builder', unitId: def.id, index: cur + c });
        bCounts.set(def.id, cur + s.count);
      }
    }
    return actors;
  };

  const handleUnitSelected = (unit: UnitDefRecord, actorOverride?: Actor): void => {
    if (pickerTargetIndex === null) {
      let chosenActor: Actor = actorOverride ?? { kind: 'commander' };
      if (!actorOverride && registry) {
        const available = getAvailableActors(draft.steps.length);
        const b = available.find((a) => {
          const bId = a.kind === 'commander' ? registry.commanderOf(draft.factionId).id : a.unitId;
          return registry.canBuild(bId, unit.id);
        });
        if (b) chosenActor = b;
      }

      const newStep: BuildStep = {
        id: `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        actor: chosenActor,
        action: 'build',
        unitId: unit.id,
        count: 1
      };
      setDraft((d) => ({ ...d, steps: [...d.steps, newStep] }));
    } else {
      setDraft((d) => ({
        ...d,
        steps: d.steps.map((s, i) => (i === pickerTargetIndex ? { ...s, unitId: unit.id } : s))
      }));
    }
  };

  const handleMoveStep = (idx: number, delta: number): void => {
    const target = idx + delta;
    if (target < 0 || target >= draft.steps.length) return;
    setDraft((d) => {
      const next = [...d.steps];
      const [moved] = next.splice(idx, 1);
      if (moved) next.splice(target, 0, moved);
      return { ...d, steps: next };
    });
  };

  const handleStepPatch = (idx: number, patch: Partial<BuildStep>): void => {
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    }));
  };

  const handleSave = async (): Promise<void> => {
    if (validation.errors.length > 0 || !draft.title.trim()) return;
    const saved = await savePlan(draft);
    if (saved && onSaved) onSaved(saved);
    else onBack();
  };

  const activePickerActor: Actor =
    pickerTargetIndex !== null
      ? draft.steps[pickerTargetIndex]?.actor ?? { kind: 'commander' }
      : { kind: 'commander' };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4" data-testid="view-plan-editor">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <button
          type="button"
          onClick={onBack}
          data-testid="btn-back-from-editor"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white font-pixel-heading text-[10px] cursor-pointer transition-none"
        >
          <ArrowLeft className="size-3.5" />
          <span>BACK</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          data-testid="btn-save-plan"
          disabled={validation.errors.length > 0 || !draft.title.trim()}
          className="flex items-center gap-2 px-4 py-2 border-2 border-[#4ade80] bg-[#0c2e17] text-[#4ade80] hover:bg-[#143d20] font-pixel-heading text-xs cursor-pointer transition-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="size-4" />
          <span>SAVE PLAN</span>
        </button>
      </div>

      {/* Plan Meta Card */}
      <PlanMetaCard
        title={draft.title}
        factionId={draft.factionId}
        opening={draft.opening}
        onUpdate={(patch) => setDraft((d) => ({ ...d, ...patch }))}
      />

      {/* Grid: Steps list + Validation/SimGraph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel-heading text-xs text-white tracking-wide">
              BUILD STEPS (<span data-num="true">{draft.steps.length}</span>)
            </h3>
            <button
              type="button"
              onClick={() => {
                setPickerTargetIndex(null);
                setPickerOpen(true);
              }}
              data-testid="btn-add-step"
              className="flex items-center gap-1.5 px-3 py-1 border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed] hover:bg-[#122845] font-pixel-heading text-[10px] cursor-pointer transition-none"
            >
              <Plus className="size-3.5" />
              <span>ADD STEP</span>
            </button>
          </div>

          <div className="space-y-2" data-testid="editor-step-list">
            {draft.steps.length === 0 ? (
              <div className="p-8 pixel-box bg-[#0c0e18] text-center text-xs text-zinc-500">
                No steps yet.
              </div>
            ) : (
              draft.steps.map((step, idx) => (
                <EditorStepRow
                  key={step.id || `step-${idx}`}
                  step={step}
                  idx={idx}
                  totalSteps={draft.steps.length}
                  availableActors={getAvailableActors(idx)}
                  unitName={step.unitId && registry ? registry.get(step.unitId)?.name ?? step.unitId : step.unitId ?? ''}
                  onMove={handleMoveStep}
                  onDelete={(i) => setDraft((d) => ({ ...d, steps: d.steps.filter((_, sIdx) => sIdx !== i) }))}
                  onPickUnit={(i) => {
                    setPickerTargetIndex(i);
                    setPickerOpen(true);
                  }}
                  onChange={handleStepPatch}
                />
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <ValidationPanel validation={validation} />
          <div className="space-y-1.5">
            <div className="font-pixel-heading text-[10px] text-zinc-400 uppercase tracking-wider">
              SIMULATED TRAJECTORY (LIVE)
            </div>
            <SimGraph plan={debouncedPlan} />
          </div>
        </div>
      </div>

      <UnitPicker
        isOpen={pickerOpen}
        actor={activePickerActor}
        availableActors={pickerTargetIndex === null ? getAvailableActors(draft.steps.length) : undefined}
        faction={draft.factionId}
        onSelect={handleUnitSelected}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
