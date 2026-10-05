import React, { useEffect, useMemo, useState } from 'react';
import { FileUp, Plus } from 'lucide-react';
import type { BuildPlan } from '../../../core/schemas';
import { usePlans, useSettings } from '../stores';
import { PlanDetailView } from './PlanDetailView';
import { PlanEditorView } from './PlanEditorView';
import { LibraryFilters } from '../components/plans/LibraryFilters';
import { LibraryPlanCard } from '../components/plans/LibraryPlanCard';
import { ImportPlanDialog } from '../components/plans/ImportPlanDialog';
import { AiDraftDialog } from '../components/plans/AiDraftDialog';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';

function formatProvenanceLine(source: BuildPlan['source']): string {
  switch (source.kind) {
    case 'curated': return `PRO // ${source.player}`;
    case 'replay-capture': return `CAPTURED // ${source.player}`;
    case 'own-game': return `SAMPLE // ${source.map}`;
    case 'adapted': return 'ADAPTED';
    case 'ai-draft': return `AI DRAFT // ${source.model}`;
    default: return 'MANUAL';
  }
}

export function LibraryView(): React.JSX.Element {
  const { plans, activePlanId, loadPlans, loading } = usePlans();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#/library/')) {
      return window.location.hash.slice('#/library/'.length) || null;
    }
    return null;
  });

  const [editingPlan, setEditingPlan] = useState<BuildPlan | null | 'new'>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const aiOn = useSettings((s) => (s.settings?.ai.provider ?? 'none') !== 'none');

  const [search, setSearch] = useState('');
  const [factionFilter, setFactionFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [openingFilter, setOpeningFilter] = useState('all');
  const [energyFilter, setEnergyFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  // Sync route hash with selectedPlanId
  useEffect(() => {
    const handleHash = (): void => {
      const hash = window.location.hash;
      if (hash.startsWith('#/library/')) {
        const id = hash.slice('#/library/'.length);
        setSelectedPlanId(id || null);
      } else if (hash === '#/library') {
        setSelectedPlanId(null);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (factionFilter !== 'all' && p.factionId.toLowerCase() !== factionFilter) return false;
      if (modeFilter !== 'all' && !p.modes.includes(modeFilter as never)) return false;
      if (openingFilter !== 'all' && p.opening !== openingFilter) return false;
      if (energyFilter !== 'all' && p.energyStyle !== energyFilter) return false;
      if (skillFilter !== 'all' && p.skill !== skillFilter) return false;
      if (sourceFilter !== 'all' && p.source.kind !== sourceFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q) ?? false;
        const matchesTags = p.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        const prov = formatProvenanceLine(p.source).toLowerCase();
        if (!matchesTitle && !matchesDesc && !matchesTags && !prov.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [plans, factionFilter, modeFilter, openingFilter, energyFilter, skillFilter, sourceFilter, search]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find((p) => p.id === selectedPlanId) ?? null;
  }, [plans, selectedPlanId]);

  if (editingPlan !== null) {
    return (
      <PlanEditorView
        initialPlan={editingPlan === 'new' ? null : editingPlan}
        onBack={() => setEditingPlan(null)}
        onSaved={(saved) => {
          setEditingPlan(null);
          setSelectedPlanId(saved.id);
          window.location.hash = `#/library/${saved.id}`;
        }}
      />
    );
  }

  if (selectedPlan) {
    return (
      <PlanDetailView
        plan={selectedPlan}
        onBack={() => {
          setSelectedPlanId(null);
          window.location.hash = '#/library';
        }}
        onSelectPlan={(p) => {
          setSelectedPlanId(p.id);
          window.location.hash = `#/library/${p.id}`;
        }}
        onEditPlan={(p) => setEditingPlan(p)}
      />
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5" data-testid="view-library">
      <PageHeader
        title="PLAN LIBRARY"
        actions={
          <>
            <span data-num="true" className="font-mono text-xs text-zinc-400">
              {filteredPlans.length} / {plans.length} PLANS
            </span>
            <Button variant="default" size="md" onClick={() => setImportOpen(true)} data-testid="btn-import-plan" className="gap-1.5">
              <FileUp className="size-3.5" />
              IMPORT
            </Button>
            {aiOn && (
              <Button variant="default" size="md" onClick={() => setDraftOpen(true)} data-testid="btn-draft-ai">
                DRAFT WITH AI
              </Button>
            )}
            <Button variant="primary" size="md" onClick={() => setEditingPlan('new')} data-testid="btn-create-plan" className="gap-1.5">
              <Plus className="size-3.5" />
              NEW PLAN
            </Button>
          </>
        }
      />

      {/* Filter Toolbar */}
      <LibraryFilters
        search={search}
        onSearchChange={setSearch}
        factionFilter={factionFilter}
        onFactionChange={setFactionFilter}
        modeFilter={modeFilter}
        onModeChange={setModeFilter}
        openingFilter={openingFilter}
        onOpeningChange={setOpeningFilter}
        energyFilter={energyFilter}
        onEnergyChange={setEnergyFilter}
        skillFilter={skillFilter}
        onSkillChange={setSkillFilter}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
      />

      {/* Plan Grid */}
      {loading ? (
        <div className="p-12 text-center font-pixel-heading text-xs text-zinc-500">
          LOADING PLANS...
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 pixel-box bg-[#0c0e18] text-center space-y-2">
          <div className="font-pixel-heading text-xs text-zinc-400">NO PLANS MATCH</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="plans-grid">
          {filteredPlans.map((plan) => (
            <LibraryPlanCard
              key={plan.id}
              plan={plan}
              isActive={activePlanId === plan.id}
              provenanceLine={formatProvenanceLine(plan.source)}
              onSelect={(p) => {
                setSelectedPlanId(p.id);
                window.location.hash = `#/library/${p.id}`;
              }}
            />
          ))}
        </div>
      )}

      {/* Import Plan Dialog */}
      <ImportPlanDialog
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(plan) => {
          setSelectedPlanId(plan.id);
          window.location.hash = `#/library/${plan.id}`;
        }}
      />

      {draftOpen && (
        <AiDraftDialog
          onClose={() => setDraftOpen(false)}
          onSaved={(plan) => {
            setDraftOpen(false);
            setSelectedPlanId(plan.id);
            window.location.hash = `#/library/${plan.id}`;
          }}
        />
      )}
    </div>
  );
}
