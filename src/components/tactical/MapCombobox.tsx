"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, ChevronDown, Check, Compass, Wind, Waves } from "lucide-react";
import { type MapData, MAP_DATABASE } from "@/lib/map-data";

export interface MapComboboxProps {
  selectedMap: MapData;
  onSelectMap: (map: MapData) => void;
  className?: string;
}

export function MapCombobox({
  selectedMap,
  onSelectMap,
  className = "",
}: MapComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Filter maps by name, dimensions, metal density, chokepoints, author, or terrains
  const filteredMaps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return MAP_DATABASE;
    return MAP_DATABASE.filter(
      (map) =>
        map.name.toLowerCase().includes(query) ||
        map.dimensions.toLowerCase().includes(query) ||
        map.metalDensity.toLowerCase().includes(query) ||
        map.chokePoints.some((cp) => cp.toLowerCase().includes(query)) ||
        (map.author && map.author.toLowerCase().includes(query)) ||
        (map.terrains && map.terrains.some((t) => t.toLowerCase().includes(query)))
    );
  }, [searchQuery]);

  // Safe derived highlighted index
  const safeHighlightedIndex = Math.min(
    highlightedIndex,
    Math.max(0, filteredMaps.length - 1)
  );

  const closeCombobox = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(0);
  }, []);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Dismiss on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeCombobox();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [closeCombobox]);

  // Handle item selection
  const handleSelect = useCallback(
    (map: MapData) => {
      onSelectMap(map);
      closeCombobox();
    },
    [onSelectMap, closeCombobox]
  );

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
        setHighlightedIndex((prev) => (prev + 1) % filteredMaps.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filteredMaps.length) % filteredMaps.length);
        break;
      case "Enter":
        e.preventDefault();
        if (filteredMaps[safeHighlightedIndex]) {
          handleSelect(filteredMaps[safeHighlightedIndex]);
        }
        break;
      case "Escape":
      case "Tab":
        e.preventDefault();
        closeCombobox();
        break;
    }
  };

  const getMetalBadgeColor = (density: MapData["metalDensity"]) => {
    switch (density) {
      case "all-metal":
        return "bg-purple-950/80 text-purple-300 border-purple-800/80";
      case "high":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-800/80";
      case "medium":
        return "bg-amber-950/80 text-amber-300 border-amber-800/80";
      case "low":
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative font-pixel-body text-xs ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Combobox Trigger Button */}
      <button
        type="button"
        id="map-combobox-trigger"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="map-combobox-listbox"
        onClick={() => {
          if (isOpen) {
            closeCombobox();
          } else {
            setIsOpen(true);
          }
        }}
        className={`w-full p-2.5 pixel-box text-left flex items-center justify-between gap-2.5 group cursor-pointer transition-none ${
          isOpen
            ? "border-[#449bed] shadow-[0_0_12px_rgba(68,155,237,0.25)]"
            : "hover:border-zinc-500"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 pixel-box-inset flex items-center justify-center shrink-0 text-[#449bed] group-hover:border-[#449bed]/40">
            <Compass className="size-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-pixel-heading text-[10px] text-zinc-100 truncate">
                {selectedMap.name}
              </span>
              <span className="text-[9px] font-pixel-heading px-1.5 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-700 shrink-0">
                {selectedMap.dimensions}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 font-pixel-body">
              <span className="flex items-center gap-1">
                <Wind className="size-3 text-zinc-500" />
                {selectedMap.wind.min}–{selectedMap.wind.max} M/S
              </span>
              <span>•</span>
              <span
                className={`px-1 py-0.2 text-[9px] font-pixel-heading uppercase border flex items-center gap-1 ${getMetalBadgeColor(
                  selectedMap.metalDensity
                )}`}
              >
                <img
                  src="/metal.png"
                  alt="Metal"
                  className="size-2.5 object-contain pixelated shrink-0 inline-block"
                />
                {selectedMap.metalDensity}
              </span>
              {selectedMap.tidal > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[#fbbf24] flex items-center gap-1">
                    <img
                      src="/energy.png"
                      alt="Energy"
                      className="size-2.5 object-contain pixelated shrink-0 inline-block"
                    />
                    +{selectedMap.tidal}E
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <ChevronDown
          className={`size-4 text-zinc-400 shrink-0 transition-none ${
            isOpen ? "rotate-180 text-[#449bed]" : "group-hover:text-zinc-200"
          }`}
        />
      </button>

      {/* Floating Tactical Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 pixel-box shadow-[6px_6px_0px_#000] overflow-hidden">
          {/* Tactical Search Input Bar */}
          <div className="p-2 border-b-2 border-black flex items-center gap-2 bg-[#09090f]">
            <Search className="size-3.5 text-zinc-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Filter theaters by name, dimensions, or metal..."
              className="w-full bg-transparent text-sm font-pixel-body text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            <span className="text-[9px] text-zinc-400 font-pixel-heading shrink-0 px-1">
              {filteredMaps.length}
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setHighlightedIndex(0);
                }}
                className="text-[8px] font-pixel-heading text-zinc-400 hover:text-white px-1 cursor-pointer"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Map Options List */}
          <ul
            id="map-combobox-listbox"
            ref={listRef}
            role="listbox"
            aria-labelledby="map-combobox-trigger"
            className="max-h-72 overflow-y-auto py-1 divide-y divide-black/60 focus:outline-none"
          >
            {filteredMaps.length === 0 ? (
              <li className="p-4 text-center text-sm text-zinc-500 font-pixel-body">
                NO THEATERS MATCH &quot;{searchQuery}&quot;
              </li>
            ) : (
              filteredMaps.map((map, index) => {
                const isSelected = selectedMap.id === map.id;
                const isHighlighted = index === safeHighlightedIndex;

                return (
                  <li
                    key={map.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(map)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`p-2.5 cursor-pointer transition-none flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-[#0a1c32] text-[#449bed]"
                        : isHighlighted
                        ? "bg-[#161926] text-white"
                        : "hover:bg-[#12131a] text-zinc-300"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-pixel-heading text-[10px] truncate" style={{ color: isSelected ? "#449bed" : undefined }}>
                          {map.name}
                        </span>
                        <span className="text-[8px] font-pixel-heading px-1.5 py-0.5 pixel-box-inset text-zinc-300">
                          {map.dimensions}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-pixel-body text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Wind className="size-2.5 text-zinc-500" />
                          {map.wind.min}–{map.wind.max} m/s (avg {map.wind.avg})
                        </span>
                        <span>•</span>
                        <span
                          className={`px-1 py-0.2 text-[8px] font-pixel-heading uppercase border flex items-center gap-1 ${getMetalBadgeColor(
                            map.metalDensity
                          )}`}
                        >
                          <img
                            src="/metal.png"
                            alt="Metal"
                            className="size-2.5 object-contain pixelated shrink-0 inline-block"
                          />
                          {map.metalDensity}
                        </span>
                        {map.tidal > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-[#fbbf24] flex items-center gap-1">
                              <img
                                src="/energy.png"
                                alt="Energy"
                                className="size-2.5 object-contain pixelated shrink-0 inline-block"
                              />
                              +{map.tidal}E
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected && (
                        <Check className="size-3.5 text-[#449bed]" />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {/* Quick Footer Summary */}
          <div className="px-2.5 py-1.5 bg-[#09090f] border-t-2 border-black text-[8px] font-pixel-heading text-zinc-500 flex items-center justify-between">
            <span>{filteredMaps.length} THEATERS</span>
            <span>↑↓ NAVIGATE • ↵ SELECT</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapCombobox;
