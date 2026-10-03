import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronDown, Compass } from 'lucide-react';
import type { MapRecord } from '../../../../core/schemas';
import { ipcClient } from '../../lib/ipc-client';
import { MetalIcon } from '../ui/MetalIcon';
import { EnergyIcon } from '../ui/EnergyIcon';
import armadaWindImg from '../../assets/original/armada-wind.png';
import cortexWindImg from '../../assets/original/cortex-wind.png';

export interface MapComboboxProps {
  selectedMap: MapRecord | null;
  onSelectMap: (map: MapRecord) => void;
  maps?: MapRecord[];
  className?: string;
  faction?: string;
}

export function MapCombobox({
  selectedMap,
  onSelectMap,
  maps: externalMaps,
  className = '',
  faction = 'armada'
}: MapComboboxProps): React.JSX.Element {
  const isCortex = faction.toLowerCase() === 'cortex';
  const turbineImg = isCortex ? cortexWindImg : armadaWindImg;

  const [internalMaps, setInternalMaps] = useState<MapRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!externalMaps || externalMaps.length === 0) {
      ipcClient.invoke('maps:list').then((res) => {
        if (res.ok && res.data.length > 0) setInternalMaps(res.data);
      }).catch((err) => {
        console.warn('Failed to load maps for combobox:', err);
      });
    }
  }, [externalMaps]);

  const mapList = externalMaps && externalMaps.length > 0 ? externalMaps : internalMaps;

  const filteredMaps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mapList;
    return mapList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.fileName.toLowerCase().includes(q) ||
        (m.author && m.author.toLowerCase().includes(q)) ||
        `${m.sizeX}x${m.sizeZ}`.includes(q)
    );
  }, [mapList, searchQuery]);

  const safeHighlightedIndex = Math.min(highlightedIndex, Math.max(0, filteredMaps.length - 1));

  const closeCombobox = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(0);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeCombobox();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [closeCombobox]);

  const handleSelect = useCallback(
    (map: MapRecord) => {
      onSelectMap(map);
      closeCombobox();
    },
    [onSelectMap, closeCombobox]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredMaps.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredMaps.length) % Math.max(1, filteredMaps.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredMaps[safeHighlightedIndex]) handleSelect(filteredMaps[safeHighlightedIndex]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      closeCombobox();
    }
  };

  const currentMap = selectedMap;

  return (
    <div
      ref={containerRef}
      className={`relative text-xs ${className}`}
      onKeyDown={handleKeyDown}
      data-testid="map-combobox"
    >
      <button
        type="button"
        id="map-combobox-trigger"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="map-combobox-listbox"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full p-2.5 pixel-box text-left flex items-center justify-between gap-2.5 cursor-pointer bg-[#0c0e18] transition-none ${
          isOpen ? 'border-[#449bed] shadow-[0_0_8px_rgba(68,155,237,0.3)]' : 'hover:border-zinc-500'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 pixel-box-inset flex items-center justify-center shrink-0 text-[#449bed]">
            <Compass className="size-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-pixel-heading text-[10px] text-zinc-100 truncate">
                {currentMap ? currentMap.name : 'CHOOSE A MAP'}
              </span>
              {currentMap && (
                <span data-num="true" className="font-mono text-[10px] px-1.5 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-700 shrink-0">
                  {currentMap.sizeX}×{currentMap.sizeZ}
                </span>
              )}
            </div>
            {currentMap && (
              <div className="flex items-center gap-2 text-zinc-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <img src={turbineImg} alt="Wind" className="size-3.5 object-contain" />
                  <span data-num="true" className="font-mono text-[10px] text-zinc-200">{currentMap.wind.min}–{currentMap.wind.max}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MetalIcon size={12} />
                  <span data-num="true" className="font-mono text-[10px] text-zinc-200">{currentMap.maxMetal.toFixed(2)}</span>
                </span>
                {currentMap.tidalStrength > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#fbbf24]">
                      <EnergyIcon size={12} />
                      <span data-num="true" className="font-mono text-[10px]">+{currentMap.tidalStrength}E</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <ChevronDown
          className={`size-4 text-zinc-400 shrink-0 transition-none ${
            isOpen ? 'rotate-180 text-[#449bed]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 pixel-box bg-[#0c0e18] shadow-[4px_4px_0px_#000] overflow-hidden">
          <div className="p-2 border-b-2 border-zinc-800 flex items-center gap-2 bg-[#090b14]">
            <Search className="size-3.5 text-zinc-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Search theater or dimensions..."
              className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            <span data-num="true" className="font-mono text-[10px] text-zinc-400 shrink-0 px-1">
              {filteredMaps.length}
            </span>
          </div>

          <ul
            id="map-combobox-listbox"
            role="listbox"
            className="max-h-60 overflow-y-auto divide-y divide-zinc-800/60"
          >
            {filteredMaps.map((map, idx) => {
              const isSelected = currentMap?.fileName === map.fileName;
              const isHighlighted = idx === safeHighlightedIndex;
              return (
                <li
                  key={map.fileName}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(map)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`p-2 flex items-center justify-between cursor-pointer transition-none ${
                    isHighlighted ? 'bg-[#182638] text-white' : 'hover:bg-[#121624] text-zinc-300'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel-heading text-[10px] truncate">{map.name}</span>
                      <span data-num="true" className="font-mono text-[10px] text-zinc-400">{map.sizeX}×{map.sizeZ}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400 text-[10px] mt-0.5">
                      <span data-num="true" className="font-mono">wind {map.wind.min}–{map.wind.max}</span>
                      {map.tidalStrength > 0 && (
                        <span data-num="true" className="font-mono text-[#fbbf24]">tidal +{map.tidalStrength}</span>
                      )}
                    </div>
                  </div>
                  {isSelected && <span className="font-pixel-heading text-[10px] text-[#449bed] ml-2">✓</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
