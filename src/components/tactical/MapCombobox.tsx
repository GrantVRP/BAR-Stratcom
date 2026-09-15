"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Compass,
  Wind,
  Waves,
  ChevronDown,
  Check,
  Zap,
  Crosshair,
  Shield,
  X,
} from "lucide-react";
import {
  BAR_MAP_LIST,
  searchMaps,
  type BarMapData,
  type MetalDensity,
} from "@/lib/map-data";

interface MapComboboxProps {
  selectedMap: BarMapData;
  onSelectMap: (map: BarMapData) => void;
  accentColor?: string;
  className?: string;
}

export function MapCombobox({
  selectedMap,
  onSelectMap,
  accentColor = "#48a2ef",
  className = "",
}: MapComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filtered map results based on current search query
  const filteredMaps = useMemo(() => {
    return searchMaps(searchQuery);
  }, [searchQuery]);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Auto-focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredMaps.length - 1 ? prev + 1 : 0
        );
        scrollHighlightedIntoView((highlightedIndex + 1) % filteredMaps.length);
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMaps.length - 1
        );
        scrollHighlightedIntoView(
          highlightedIndex > 0 ? highlightedIndex - 1 : filteredMaps.length - 1
        );
        break;

      case "Enter":
        e.preventDefault();
        if (filteredMaps[highlightedIndex]) {
          handleSelect(filteredMaps[highlightedIndex]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLButtonElement>("[data-map-item]");
    if (items[index]) {
      items[index].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  const handleSelect = (map: BarMapData) => {
    onSelectMap(map);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Metal density color badge
  const getMetalBadge = (density: MetalDensity) => {
    switch (density) {
      case "all-metal":
        return {
          label: "ALL-METAL",
          style: "bg-purple-950/80 text-purple-300 border-purple-800/80",
        };
      case "high":
        return {
          label: "HIGH METAL",
          style: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
        };
      case "medium":
        return {
          label: "MED METAL",
          style: "bg-amber-950/80 text-amber-300 border-amber-800/80",
        };
      case "low":
        return {
          label: "LOW METAL",
          style: "bg-zinc-800 text-zinc-400 border-zinc-700",
        };
    }
  };

  const activeMetalBadge = getMetalBadge(selectedMap.metalDensity);

  return (
    <div ref={containerRef} className={`relative font-mono select-none ${className}`}>
      {/* Combobox Trigger Card */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="w-full text-left p-2.5 rounded bg-zinc-900/90 hover:bg-zinc-850/90 border border-zinc-800 transition-all flex items-center justify-between group shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-700"
        style={{
          borderLeft: `3px solid ${accentColor}`,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div
            className="size-7 shrink-0 rounded flex items-center justify-center bg-zinc-950 border border-zinc-800"
            style={{ color: accentColor }}
          >
            <Compass className="size-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs text-zinc-100 tracking-wide truncate">
                {selectedMap.name}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${activeMetalBadge.style}`}
              >
                {activeMetalBadge.label}
              </span>
              {selectedMap.tidal > 0 && (
                <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 flex items-center gap-0.5">
                  <Waves className="size-2.5" />
                  +{selectedMap.tidal} E
                </span>
              )}
            </div>

            <div className="text-[10px] text-zinc-500 truncate mt-0.5">
              {selectedMap.subtext}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-medium text-zinc-300 flex items-center gap-1 justify-end">
              <Wind className="size-3 text-zinc-500" />
              <span>
                {selectedMap.windRange[0]}–{selectedMap.windRange[1]} m/s
              </span>
            </div>
            <div className="text-[9px] text-zinc-500">
              {selectedMap.terrainTag}
            </div>
          </div>

          <div className="size-6 rounded bg-zinc-950 border border-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200">
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#0c0e14] border border-zinc-800 rounded-sm shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Popover Header & Instant Search Input */}
          <div className="p-2.5 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center gap-2">
            <Search className="size-3.5 text-zinc-500 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="[Type to filter maps by name, terrain, or doctrine...]"
              className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none font-mono py-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="size-5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 flex items-center justify-center shrink-0"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Map List Items */}
          <div
            ref={listRef}
            className="max-h-[300px] overflow-y-auto divide-y divide-zinc-850/60 scrollbar-thin scrollbar-thumb-zinc-800"
          >
            {filteredMaps.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                <Crosshair className="size-5 mx-auto mb-2 opacity-40" />
                No tactical theaters match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredMaps.map((map, idx) => {
                const isSelected = selectedMap.id === map.id;
                const isHighlighted = highlightedIndex === idx;
                const badge = getMetalBadge(map.metalDensity);

                return (
                  <button
                    key={map.id}
                    data-map-item
                    type="button"
                    onClick={() => handleSelect(map)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left p-2.5 transition-colors flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-zinc-850/90 text-zinc-100"
                        : isHighlighted
                        ? "bg-zinc-900/80 text-zinc-200"
                        : "text-zinc-400 hover:bg-zinc-900/40"
                    }`}
                    style={
                      isSelected
                        ? { borderLeft: `3px solid ${accentColor}` }
                        : isHighlighted
                        ? { borderLeft: "3px solid #52525b" }
                        : { borderLeft: "3px solid transparent" }
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-bold text-xs tracking-wide"
                          style={{ color: isSelected ? accentColor : undefined }}
                        >
                          {map.name}
                        </span>

                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${badge.style}`}
                        >
                          {badge.label}
                        </span>

                        {map.tidal > 0 && (
                          <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 flex items-center gap-0.5">
                            <Waves className="size-2.5" />
                            +{map.tidal} E
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                        {map.subtext}
                      </div>

                      {/* Recommended Doctrine Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {map.recommendedDoctrines.slice(0, 3).map((doc) => (
                          <span
                            key={doc}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-950/80 border border-zinc-800 text-zinc-400"
                          >
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0 pt-0.5">
                      <div className="text-[10px] font-mono text-zinc-300 font-medium flex items-center gap-1 justify-end">
                        <Wind className="size-3 text-zinc-500" />
                        <span>
                          {map.windRange[0]}–{map.windRange[1]} m/s
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-zinc-500 mt-0.5">
                        {map.terrainTag}
                      </div>

                      {isSelected && (
                        <div
                          className="mt-1.5 flex items-center justify-end gap-1 text-[10px] font-bold"
                          style={{ color: accentColor }}
                        >
                          <Check className="size-3" />
                          <span>ACTIVE</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Popover Footer Navigation Hints */}
          <div className="p-1.5 px-3 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <div className="flex items-center gap-2">
              <span>
                <kbd className="px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  ↑
                </kbd>
                <kbd className="px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 ml-0.5">
                  ↓
                </kbd>{" "}
                Navigate
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  ↵
                </kbd>{" "}
                Select
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  Esc
                </kbd>{" "}
                Close
              </span>
            </div>
            <span className="text-zinc-600">
              {filteredMaps.length} THEATERS
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapCombobox;
