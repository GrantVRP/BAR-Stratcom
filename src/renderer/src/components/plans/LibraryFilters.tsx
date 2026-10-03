import React from 'react';
import { Search } from 'lucide-react';

export interface LibraryFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  factionFilter: string;
  onFactionChange: (val: string) => void;
  modeFilter: string;
  onModeChange: (val: string) => void;
  openingFilter: string;
  onOpeningChange: (val: string) => void;
  energyFilter: string;
  onEnergyChange: (val: string) => void;
  skillFilter: string;
  onSkillChange: (val: string) => void;
  sourceFilter: string;
  onSourceChange: (val: string) => void;
}

export function LibraryFilters({
  search,
  onSearchChange,
  factionFilter,
  onFactionChange,
  modeFilter,
  onModeChange,
  openingFilter,
  onOpeningChange,
  energyFilter,
  onEnergyChange,
  skillFilter,
  onSkillChange,
  sourceFilter,
  onSourceChange
}: LibraryFiltersProps): React.JSX.Element {
  return (
    <div className="p-3 pixel-box bg-[#0c0e18] space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2 border-2 border-zinc-800 bg-[#090b14] px-2.5 py-1.5">
        <Search className="size-3.5 text-zinc-500 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search plans by title, tag, map, or author..."
          data-testid="input-library-search"
          className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
        <select
          value={factionFilter}
          onChange={(e) => onFactionChange(e.target.value)}
          data-testid="filter-faction"
          className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
        >
          <option value="all">FACTION: ALL</option>
          <option value="armada">ARMADA</option>
          <option value="cortex">CORTEX</option>
        </select>

        <select
          value={modeFilter}
          onChange={(e) => onModeChange(e.target.value)}
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
          onChange={(e) => onOpeningChange(e.target.value)}
          data-testid="filter-opening"
          className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
        >
          <option value="all">OPENING: ALL</option>
          <option value="bot">BOT</option>
          <option value="vehicle">VEHICLE</option>
          <option value="air">AIR</option>
          <option value="sea">SEA</option>
          <option value="hover">HOVER</option>
          <option value="mixed">MIXED</option>
        </select>

        <select
          value={energyFilter}
          onChange={(e) => onEnergyChange(e.target.value)}
          data-testid="filter-energy"
          className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
        >
          <option value="all">ENERGY: ALL</option>
          <option value="wind">WIND</option>
          <option value="solar">SOLAR</option>
          <option value="tidal">TIDAL</option>
          <option value="mixed">MIXED</option>
        </select>

        <select
          value={skillFilter}
          onChange={(e) => onSkillChange(e.target.value)}
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
          onChange={(e) => onSourceChange(e.target.value)}
          data-testid="filter-source"
          className="pixel-box-inset bg-[#090b14] text-zinc-300 p-1.5 outline-none font-mono text-xs"
        >
          <option value="all">SOURCE: ALL</option>
          <option value="curated">CURATED</option>
          <option value="replay-capture">CAPTURED</option>
          <option value="own-game">OWN GAME</option>
          <option value="manual">MANUAL</option>
          <option value="adapted">ADAPTED</option>
          <option value="ai-draft">AI DRAFT</option>
        </select>
      </div>
    </div>
  );
}
