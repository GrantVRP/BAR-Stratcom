import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileUp, Plus } from 'lucide-react';
import type { BuildPlan } from '../../../core/schemas';
import { usePlans } from '../stores';
import { PlanDetailView } from './PlanDetailView';
import { PlanEditorView } from './PlanEditorView';
import { LibraryFilters } from '../components/plans/LibraryFilters';
import { LibraryPlanCard } from '../components/plans/LibraryPlanCard';
import { ImportPlanDialog } from '../components/plans/ImportPlanDialog';

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
      {/* View Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-pixel-heading text-sm text-white tracking-wider flex items-center gap-2">
            <BookOpen className="size-4 text-[#449bed]" />
            PLAN LIBRARY
          </h2>
          <div className="text-xs text-zinc-400 mt-1">
            Curated openings, captured replays, and custom builds.
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            data-testid="btn-import-plan"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white font-pixel-heading text-[10px] cursor-pointer transition-none"
          >
            <FileUp className="size-3.5" />
            <span>IMPORT</span>
          </button>

          <button
            type="button"
            onClick={() => setEditingPlan('new')}
            data-testid="btn-create-plan"
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed] hover:bg-[#122845] font-pixel-heading text-[10px] cursor-pointer transition-none"
          >
            <Plus className="size-3.5" />
            <span>+ NEW PLAN</span>
          </button>

          <div data-num="true" className="font-mono text-xs text-zinc-400 pixel-box-inset px-2.5 py-1">
            {filteredPlans.length} / {plans.length} PLANS
          </div>
        </div>
      </div>

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
          <div className="font-pixel-heading text-xs text-zinc-400">NO PLANS MATCH YOUR CRITERIA</div>
          <div className="text-xs text-zinc-500">Try adjusting your filters or import a build plan.</div>
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
    </div>
  );
}
