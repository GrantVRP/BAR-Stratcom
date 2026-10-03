import React, { useEffect, useMemo, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import type { BuildPlan } from '../../../core/schemas';
import { usePlans } from '../stores';
import { Tag } from '../components/ui/Tag';
import { PlanDetailView } from './PlanDetailView';
import { FactionEmblem } from '../components/ui/FactionEmblem';

function formatProvenanceLine(source: BuildPlan['source']): string {
  if (source.kind === 'curated') {
    return `CURATED // from ${source.player} on ${source.map}, ${source.playedAt.slice(0, 10)}`;
  }
  if (source.kind === 'replay-capture') {
    return `CAPTURED // from ${source.player} on ${source.map}, ${source.capturedAt.slice(0, 10)}`;
  }
  if (source.kind === 'own-game') {
    return `OWN GAME // on ${source.map}, ${source.capturedAt.slice(0, 10)}`;
  }
  if (source.kind === 'adapted') {
    return `ADAPTED // from ${source.fromPlanId}, ${source.createdAt.slice(0, 10)}`;
  }
  if (source.kind === 'ai-draft') {
    return `AI DRAFT // ${source.provider}/${source.model}, ${source.createdAt.slice(0, 10)}`;
  }
  return `MANUAL // ${source.createdAt.slice(0, 10)}`;
}

export function LibraryView(): React.JSX.Element {
  const { plans, activePlanId, loadPlans, loading } = usePlans();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#/library/')) {
      return window.location.hash.slice('#/library/'.length) || null;
    }
    return null;
  });

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
      />
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5" data-testid="view-library">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-pixel-heading text-sm text-white tracking-wider flex items-center gap-2">
            <BookOpen className="size-4 text-[#449bed]" />
            PLAN LIBRARY
          </h2>
          <div className="text-xs text-zinc-400 mt-1">
            Curated openings, captured replays, and custom builds.
          </div>
        </div>
        <div data-num="true" className="font-mono text-xs text-zinc-400 pixel-box-inset px-2 py-1">
          {filteredPlans.length} / {plans.length} PLANS
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 pixel-box bg-[#0c0e18] space-y-3">
        {/* Search */}
        <div className="flex items-center gap-2 border-2 border-zinc-800 bg-[#090b14] px-2.5 py-1.5">
          <Search className="size-3.5 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by title, tag, map, or author..."
            data-testid="input-library-search"
            className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <select
            value={factionFilter}
            onChange={(e) => setFactionFilter(e.target.value)}
            data-testid="filter-faction"
            className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
          >
            <option value="all">FACTION: ALL</option>
            <option value="armada">ARMADA</option>
            <option value="cortex">CORTEX</option>
          </select>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            data-testid="filter-mode"
            className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
          >
            <option value="all">MODE: ALL</option>
            <option value="1v1">1v1</option>
            <option value="small-team">SMALL TEAM</option>
            <option value="large-team">LARGE TEAM</option>
          </select>

          <select
            value={openingFilter}
            onChange={(e) => setOpeningFilter(e.target.value)}
            data-testid="filter-opening"
            className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
          >
            <option value="all">OPEN: ALL</option>
            <option value="bot">BOT</option>
            <option value="vehicle">VEHICLE</option>
            <option value="air">AIR</option>
            <option value="sea">SEA</option>
            <option value="hover">HOVER</option>
            <option value="mixed">MIXED</option>
          </select>

          <select
            value={energyFilter}
            onChange={(e) => setEnergyFilter(e.target.value)}
            data-testid="filter-energy"
            className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
          >
            <option value="all">ENERGY: ALL</option>
            <option value="solar">SOLAR</option>
            <option value="wind">WIND</option>
            <option value="tidal">TIDAL</option>
            <option value="mixed">MIXED</option>
          </select>

          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            data-testid="filter-skill"
            className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
          >
            <option value="all">SKILL: ALL</option>
            <option value="beginner">BEGINNER</option>
            <option value="intermediate">INTERMEDIATE</option>
            <option value="advanced">ADVANCED</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            data-testid="filter-source"
            className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
          >
            <option value="all">SOURCE: ALL</option>
            <option value="curated">CURATED</option>
            <option value="replay-capture">CAPTURED</option>
            <option value="own-game">OWN GAME</option>
            <option value="adapted">ADAPTED</option>
            <option value="ai-draft">AI DRAFT</option>
            <option value="manual">MANUAL</option>
          </select>
        </div>
      </div>

      {/* Plan Cards Grid */}
      {filteredPlans.length === 0 ? (
        <div className="p-8 pixel-box bg-[#0c0e18] text-center space-y-2" data-testid="library-empty">
          <div className="font-pixel-heading text-xs text-zinc-400 uppercase">
            {loading ? 'LOADING PLANS...' : 'NO PLANS MATCH CRITERIA'}
          </div>
          <div className="text-xs text-zinc-500">
            Try adjusting your search query or reset faction, opening, or energy filters.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="plan-cards-grid">
          {filteredPlans.map((plan) => {
            const isActive = activePlanId === plan.id;
            const isArmada = plan.factionId.toLowerCase() === 'armada';
            const provenanceLine = formatProvenanceLine(plan.source);

            return (
              <div
                key={plan.id}
                data-testid={`plan-card-${plan.id}`}
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  window.location.hash = `#/library/${plan.id}`;
                }}
                className={`p-4 pixel-box cursor-pointer transition-none relative group bg-[#0c0e18] hover:bg-[#121524] ${
                  isActive ? 'border-[#4ade80]' : 'hover:border-zinc-500'
                }`}
              >
                {/* Left faction color stripe */}
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

                {/* Tags row */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  <Tag variant={isArmada ? 'armada' : 'cortex'}>{plan.factionId}</Tag>
                  <Tag variant="default">{plan.opening}</Tag>
                  <Tag variant="default">{plan.energyStyle}</Tag>
                  <Tag variant="default">{plan.skill}</Tag>
                  <span
                    data-num="true"
                    className="font-mono text-[10px] text-zinc-400 ml-auto"
                  >
                    {plan.steps.length} STEPS
                  </span>
                </div>

                {/* Provenance footer */}
                <div className="mt-3 pt-2 border-t border-zinc-800 text-[10px] text-zinc-400 font-pixel-heading truncate">
                  {provenanceLine}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
