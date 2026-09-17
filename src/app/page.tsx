"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { useObject } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Layers,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Zap,
  Activity,
  Crosshair,
  Compass,
  Cpu,
  RefreshCw,
  SquareSquare,
  KeyRound,
  ExternalLink,
  X,
  Wind,
  ShieldAlert,
  Database,
  Waves,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPlanResponseSchema, type Faction } from "@/lib/game-data";
import { parseBuildStep, type ParsedBuildStep } from "@/lib/timeline-parser";
import { BarIcon } from "@/components/tactical/BarIcon";
import { ResourceGraph } from "@/components/tactical/ResourceGraph";
import { WindmillTelemetry } from "@/components/tactical/WindmillTelemetry";
import { MapCombobox } from "@/components/tactical/MapCombobox";
import { type MapData, MAP_DATABASE } from "@/lib/map-data";
import { useLiveGame, type LiveGameState } from "@/hooks/useLiveGame";

// Tournament Strategic Doctrines
const STRATEGY_PRESETS = [
  {
    id: "early-tank-rush",
    title: "Early Tank Raider Rush",
    tag: "T1 // AGGRESSION",
    timingWindow: "02:30 - 03:45",
    description: "Vehicle Plant rush. Flank 4-6 Flash/Blitz into enemy metal extractors.",
    icon: Crosshair,
  },
  {
    id: "bot-swarm-choke",
    title: "Bot Skirmish & LLT Creep",
    tag: "T1 // SKIRMISH",
    timingWindow: "03:15 - 05:00",
    description: "Rocko/Storm rocket bot poke with Light Laser Towers locking down vital chokes.",
    icon: Layers,
  },
  {
    id: "fast-eco",
    title: "Fast Eco & Tech Rush",
    tag: "T2 // GREED",
    timingWindow: "07:00 - 08:30",
    description: "Energy farm greed, commander nanolathe assist, push T2 lab by 7:30.",
    icon: Zap,
  },
  {
    id: "air-opening",
    title: "Air Opening & Surgical Harass",
    tag: "T1 // SURGICAL AIR",
    timingWindow: "03:30 - 04:45",
    description: "Fast Aircraft Plant into gunships to assassinate exposed perimeter constructors.",
    icon: Compass,
  },
  {
    id: "heavy-turtle",
    title: "Fortified Turtle into T2/T3",
    tag: "T2 // HEAVY ARMOR",
    timingWindow: "09:00 - 11:30",
    description: "Defend early mexes with LLT, bank metal for Bulldog or Goliath heavy tanks.",
    icon: ShieldAlert,
  },
];

export default function BeyondAllReasonConsole() {
  // Console state
  const [faction, setFaction] = useState<Faction>("Armada");
  const [selectedMap, setSelectedMap] = useState<MapData>(MAP_DATABASE[0]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("early-tank-rush");
  const [activeTab, setActiveTab] = useState<"timeline" | "unitComp" | "notes" | "briefing">("timeline");
  const [showEcoRunway, setShowEcoRunway] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Track last detected match state from daemon to prevent recurring overwrite of manual user selections
  const lastDetectedRef = useRef<{
    mapName?: string;
    faction?: string;
    isInitialized: boolean;
  }>({
    isInitialized: false,
  });

  // Auto-sync detected match / lobby state into console from external daemon
  const handleLiveStateChange = useCallback((state: LiveGameState) => {
    if (!state.isRunning) return;

    // Initial match link: sync map and faction once on game discovery
    if (!lastDetectedRef.current.isInitialized) {
      lastDetectedRef.current.isInitialized = true;
      lastDetectedRef.current.mapName = state.mapName;
      lastDetectedRef.current.faction = state.faction;

      if (state.mapName) {
        const query = state.mapName.toLowerCase();
        const matched = MAP_DATABASE.find(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            query.includes(m.name.toLowerCase()) ||
            query.includes(m.id)
        );
        if (matched) setSelectedMap(matched);
      }

      if (state.faction === "Armada" || state.faction === "Cortex") {
        setFaction(state.faction);
      }
      return;
    }

    // Subsequent updates: ONLY change console selection if the game's detected map or faction changed externally
    if (state.mapName && state.mapName !== lastDetectedRef.current.mapName) {
      lastDetectedRef.current.mapName = state.mapName;
      const query = state.mapName.toLowerCase();
      const matched = MAP_DATABASE.find(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          query.includes(m.name.toLowerCase()) ||
          query.includes(m.id)
      );
      if (matched) setSelectedMap(matched);
    }

    if (
      (state.faction === "Armada" || state.faction === "Cortex") &&
      state.faction !== lastDetectedRef.current.faction
    ) {
      lastDetectedRef.current.faction = state.faction;
      setFaction(state.faction);
    }
  }, []);

  // Live game telemetry bridge hook
  const { liveState } = useLiveGame({ onStateChange: handleLiveStateChange });

  // Explicit sync action to pull active match state on demand
  const syncWithLiveMatch = useCallback(() => {
    if (!liveState?.isRunning) return;
    if (liveState.mapName) {
      const query = liveState.mapName.toLowerCase();
      const matched = MAP_DATABASE.find(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          query.includes(m.name.toLowerCase()) ||
          query.includes(m.id)
      );
      if (matched) setSelectedMap(matched);
    }
    if (liveState.faction === "Armada" || liveState.faction === "Cortex") {
      setFaction(liveState.faction);
      lastDetectedRef.current.faction = liveState.faction;
    }
  }, [liveState]);

  // API Key modal (lazy initialize from localStorage to eliminate mount-time effect)
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bar_gemini_api_key") || "";
    }
    return "";
  });
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bar_gemini_api_key") || "";
    }
    return "";
  });

  const saveApiKey = () => {
    const trimmed = keyInput.trim();
    setApiKey(trimmed);
    localStorage.setItem("bar_gemini_api_key", trimmed);
    setShowKeyModal(false);
  };

  const clearApiKey = () => {
    setApiKey("");
    setKeyInput("");
    localStorage.removeItem("bar_gemini_api_key");
    setShowKeyModal(false);
  };

  const currentStrategy = useMemo(
    () => STRATEGY_PRESETS.find((s) => s.id === selectedStrategyId) || STRATEGY_PRESETS[0],
    [selectedStrategyId]
  );

  // Vercel AI SDK useObject pointing to /api/generate-build
  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/generate-build",
    schema: buildPlanResponseSchema,
    onError: (err) => {
      console.error("AI SDK Stream Error:", err);
    },
  });

  const handleGenerate = useCallback(() => {
    submit({
      faction,
      mapType: `${selectedMap.name} (${selectedMap.dimensions}) - Metal: ${selectedMap.metalDensity.toUpperCase()}, Wind: ${selectedMap.wind.min}-${selectedMap.wind.max} m/s (avg ${selectedMap.wind.avg}), Tidal: +${selectedMap.tidal}E, Chokes: ${selectedMap.chokePoints.join("; ")}`,
      strategyStyle: `${currentStrategy.title} (${currentStrategy.description})`,
      apiKey: apiKey || undefined,
    });
    setActiveTab("timeline");
  }, [faction, selectedMap, currentStrategy, apiKey, submit]);

  // Export macro to clipboard
  const handleCopy = useCallback(() => {
    if (!object) return;
    const text = [
      `=== BEYOND ALL REASON TACTICAL MACRO: ${faction.toUpperCase()} ===`,
      `Theater: ${selectedMap.name} [${selectedMap.dimensions}, Wind: ${selectedMap.wind.min}–${selectedMap.wind.max} m/s, Metal: ${selectedMap.metalDensity.toUpperCase()}]`,
      `Choke Points: ${selectedMap.chokePoints.join(" | ")}`,
      `Doctrine: ${currentStrategy.title} [Timing: ${currentStrategy.timingWindow}]`,
      "",
      "--- [01] OPENING BUILD TIMELINE ---",
      ...(object.openingBuildOrder || []).map((step, idx) => `[${idx + 1}] ${step}`),
      "",
      "--- [02] FORCE REQUISITION ---",
      ...(object.unitComposition || []).map((u) => `• ${u}`),
      "",
      "--- [03] OPERATIONAL TELEMETRY ---",
      object.strategyNotes || "",
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [object, faction, selectedMap, currentStrategy]);

  // Global Keyboard Shortcuts (Ctrl+C for Macro Copy, Enter for Generate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (object?.openingBuildOrder && object.openingBuildOrder.length > 0) {
          e.preventDefault();
          handleCopy();
        }
      } else if (e.key === "Enter" && !isLoading) {
        e.preventDefault();
        handleGenerate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [object, handleCopy, handleGenerate, isLoading]);

  // Parse structured timeline steps from raw string array
  const parsedSteps: ParsedBuildStep[] = useMemo(() => {
    if (!object?.openingBuildOrder) return [];
    return object.openingBuildOrder
      .filter((step): step is string => Boolean(step && step.trim()))
      .map((step, idx) => parseBuildStep(step, idx, faction));
  }, [object, faction]);

  const isArmada = faction === "Armada";

  // Faction Accent Color Tokens (Armada Blue #48a2ef vs Cortex Crimson #ff2a2a)
  const accentColor = isArmada ? "#48a2ef" : "#ff2a2a";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0c10] text-zinc-100 font-sans select-none antialiased">
      {/* ========================================================================= */}
      {/* 1. TOP BAR: PRACTICAL RTS TELEMETRY & HOTKEYS                             */}
      {/* ========================================================================= */}
      <header className="h-14 shrink-0 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between text-xs font-mono z-30">
        {/* Left: Brand & Faction Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 pr-3 border-r border-zinc-800/60">
            <div className="relative size-6 flex items-center justify-center shrink-0">
              <Image
                src={isArmada ? "/armada-logo.png" : "/cortex-logo.png"}
                alt={faction}
                width={22}
                height={22}
                priority
                className="object-contain"
              />
            </div>
            <div className="font-mono font-bold text-sm text-zinc-100 tracking-wider">
              BAR STRATCOM{" "}
              <span style={{ color: accentColor }}>
                {"// TACTICAL ADVISOR"}
              </span>
            </div>
          </div>

          {/* Practical RTS Stats: Benchmark Estimates */}
          <div className="hidden xl:flex items-center gap-3 text-zinc-400 text-[11px]">
            <div>
              <span>BENCHMARK: </span>
              <span className="text-amber-400 font-semibold">1,000 E</span>
              <span className="text-zinc-600"> / </span>
              <span className="text-zinc-200 font-semibold">1,000 M</span>
            </div>
            <span className="text-zinc-600">•</span>
            <div className="text-zinc-400">
              EXPANSION: <span className="text-zinc-200 font-medium">3-4 Mex @ 01:30</span>
            </div>
          </div>
        </div>

        {/* Right: Dynamic Wind Widget wired to current map state, Live Memory Bridge, and Actions */}
        <div className="flex items-center gap-3">
          {/* Live Game Memory Bridge Status Indicator */}
          <div
            onClick={syncWithLiveMatch}
            title={
              liveState?.isRunning
                ? "Live game link active. Click to sync console with live game."
                : "Live game link standby. Start Beyond All Reason to link."
            }
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-sm border font-mono text-xs transition-all select-none ${
              liveState?.gameStatus === "IN_GAME"
                ? "bg-cyan-950/20 border-cyan-500/40 text-cyan-200 cursor-pointer hover:bg-cyan-900/30 hover:border-cyan-400/60"
                : liveState?.gameStatus === "IN_LOBBY"
                ? "bg-amber-950/20 border-amber-500/40 text-amber-200 cursor-pointer hover:bg-amber-900/30 hover:border-amber-400/60"
                : "bg-zinc-950 border-zinc-800 text-zinc-500"
            }`}
          >
            {liveState?.gameStatus === "IN_GAME" ? (
              <>
                <span className="relative flex size-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-cyan-400" />
                </span>
                <span className="text-cyan-400 font-bold tracking-tight whitespace-nowrap">
                  [MEMORY LINK: IN-GAME]
                </span>
                <span className="text-cyan-600">•</span>
                <span className="text-cyan-100 font-semibold tracking-wider tabular-nums whitespace-nowrap">
                  {Math.floor(liveState.gameTimeSeconds / 60)}:
                  {String(liveState.gameTimeSeconds % 60).padStart(2, "0")}
                </span>
              </>
            ) : liveState?.gameStatus === "IN_LOBBY" ? (
              <>
                <span className="size-2 rounded-full bg-amber-400 shrink-0 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                <span className="text-amber-400 font-bold tracking-tight whitespace-nowrap">
                  [MEMORY LINK: LOBBY]
                </span>
                <span className="text-amber-600">•</span>
                <span className="text-amber-200/90 font-medium whitespace-nowrap">
                  {liveState.lobbyName || "Chobby Active"}
                </span>
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-zinc-600 shrink-0" />
                <span className="text-zinc-500 font-medium tracking-tight whitespace-nowrap">
                  [MEMORY LINK: STANDBY]
                </span>
              </>
            )}
          </div>

          {/* Dynamic Wind Widget wired to current map and faction state */}
          <WindmillTelemetry
            faction={faction}
            currentWind={selectedMap.wind.avg}
            minWind={selectedMap.wind.min}
            maxWind={selectedMap.wind.max}
          />
          {/* AI Key Link Badge */}
          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 transition-colors"
          >
            <KeyRound className="size-3 text-zinc-400" />
            <span className="hidden lg:inline text-zinc-400">LINK:</span>
            {apiKey ? (
              <span className="text-emerald-400 font-bold">GEMINI 1.5 PRO</span>
            ) : (
              <span className="text-zinc-400">TACTICAL RULES</span>
            )}
          </button>

          {/* Copy Macro Shortcut Button */}
          {object?.openingBuildOrder && object.openingBuildOrder.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-200 transition-colors"
              title="Copy build macro to clipboard (Ctrl + C)"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="size-3 text-zinc-400" />
                  <span>COPY MACRO</span>
                  <kbd className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Ctrl+C
                  </kbd>
                </>
              )}
            </button>
          )}

          {/* Abort CTA when streaming */}
          {isLoading && (
            <Button
              variant="destructive"
              size="sm"
              onClick={stop}
              className="h-7 px-2.5 text-[11px] font-mono bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 gap-1.5"
            >
              <SquareSquare className="size-3" />
              ABORT
            </Button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONSOLE STAGE: 2-PANEL EDGE-TO-EDGE LAYOUT                        */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ======================================================================= */}
        {/* LEFT PANEL: DOCKED SIDEBAR (~360px) ALL-IN-ONE LOADOUT CONSOLE         */}
        {/* ======================================================================= */}
        <aside className="w-[360px] shrink-0 h-full flex flex-col border-r border-zinc-800/60 bg-[#0d0f15] overflow-y-auto scrollbar-thin">
          
          {/* Section: Faction Selector (Tactile Radio Tabs) */}
          <div className="p-3.5 border-b border-zinc-800/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="tracking-wider">01 // FACTION ALLEGIANCE</span>
              <span className="text-[10px]" style={{ color: accentColor }}>
                ACTIVE: {faction.toUpperCase()}
              </span>
            </div>

            {/* Compact Tactile Radio Tabs */}
            <div className="grid grid-cols-2 gap-1.5 bg-[#0a0c10] p-1 rounded border border-zinc-800/60">
              {/* ARMADA TAB */}
              <button
                type="button"
                onClick={() => setFaction("Armada")}
                className={`relative flex items-center gap-2.5 p-2 rounded transition-all text-left ${
                  faction === "Armada"
                    ? "bg-zinc-900/90 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                }`}
                style={
                  faction === "Armada"
                    ? { borderLeft: `2px solid ${accentColor}` }
                    : { borderLeft: "2px solid transparent" }
                }
              >
                <div
                  className="size-7 rounded bg-zinc-950 flex items-center justify-center shrink-0 border transition-all"
                  style={{
                    borderColor: faction === "Armada" ? accentColor : "#27272a",
                    boxShadow: faction === "Armada" ? `0 0 10px ${accentColor}40` : "none",
                  }}
                >
                  <Image
                    src="/armada-logo.png"
                    alt="Armada"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <div>
                  <div
                    className="font-mono text-xs font-bold leading-tight"
                    style={{ color: faction === "Armada" ? accentColor : undefined }}
                  >
                    ARMADA
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Laser & Skirmish</div>
                </div>
              </button>

              {/* CORTEX TAB */}
              <button
                type="button"
                onClick={() => setFaction("Cortex")}
                className={`relative flex items-center gap-2.5 p-2 rounded transition-all text-left ${
                  faction === "Cortex"
                    ? "bg-zinc-900/90 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                }`}
                style={
                  faction === "Cortex"
                    ? { borderLeft: "2px solid #ff2a2a" }
                    : { borderLeft: "2px solid transparent" }
                }
              >
                <div
                  className="size-7 rounded bg-zinc-950 flex items-center justify-center shrink-0 border transition-all"
                  style={{
                    borderColor: faction === "Cortex" ? "#ff2a2a" : "#27272a",
                    boxShadow: faction === "Cortex" ? "0 0 10px rgba(255,42,42,0.25)" : "none",
                  }}
                >
                  <Image
                    src="/cortex-logo.png"
                    alt="Cortex"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <div>
                  <div
                    className="font-mono text-xs font-bold leading-tight"
                    style={{ color: faction === "Cortex" ? "#ff2a2a" : undefined }}
                  >
                    CORTEX
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Heavy Armor & Riot</div>
                </div>
              </button>
            </div>
          </div>

          {/* Section: Theater of War (Map Combobox & Tactical Topography) */}
          <div className="p-3.5 border-b border-zinc-800/60 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="tracking-wider">02 // THEATER // TOPOGRAPHY</span>
              <span className="text-[10px] text-zinc-500 font-mono">SEARCH DATABASE</span>
            </div>

            <MapCombobox
              selectedMap={selectedMap}
              onSelectMap={setSelectedMap}
            />

            {/* Quick Choke Points & Tactical Preview */}
            <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="text-zinc-500">PRIMARY CHOKES ({selectedMap.chokePoints.length})</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("briefing")}
                  className="text-cyan-400 hover:underline flex items-center gap-0.5 text-[10px] font-bold"
                >
                  FULL BRIEFING →
                </button>
              </div>
              <ul className="space-y-1">
                {selectedMap.chokePoints.slice(0, 3).map((cp, idx) => (
                  <li key={idx} className="text-[10px] text-zinc-400 flex items-start gap-1.5 leading-tight">
                    <span className="text-cyan-400 text-[9px] shrink-0 mt-0.5">▸</span>
                    <span className="line-clamp-1">{cp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section: Strategic Doctrine Selector */}
          <div className="p-3.5 border-b border-zinc-800/60 space-y-2 flex-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="tracking-wider">03 // OPERATIONAL DOCTRINE</span>
              <span className="text-[10px] text-zinc-500 font-mono">ATTACK TIMING</span>
            </div>

            <div className="space-y-1">
              {STRATEGY_PRESETS.map((style) => {
                const isSelected = selectedStrategyId === style.id;
                const Icon = style.icon;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStrategyId(style.id)}
                    className={`w-full text-left p-2 rounded transition-colors ${
                      isSelected
                        ? "bg-zinc-900/80 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                    }`}
                    style={
                      isSelected
                        ? { borderLeft: `2px solid ${accentColor}` }
                        : { borderLeft: "2px solid transparent" }
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          className="size-3.5"
                          style={{ color: isSelected ? accentColor : "#71717a" }}
                        />
                        <span
                          className="font-mono text-xs font-semibold"
                          style={{ color: isSelected ? accentColor : undefined }}
                        >
                          {style.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {style.timingWindow.split(" - ")[0]}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                      {style.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Footer: Sticky CTA Button */}
          <div className="p-3.5 border-t border-zinc-800/60 bg-[#0d0f15] space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>ACTIVE PROFILE:</span>
              <span className="text-zinc-300 truncate max-w-[180px]">
                {currentStrategy.title.split(" ")[0]} {"//"} {selectedMap.name.split(" ")[0]}
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGenerate}
              className={`w-full py-2.5 px-4 rounded font-mono text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isLoading
                  ? "opacity-80 cursor-wait"
                  : "hover:brightness-110 active:scale-[0.99]"
              }`}
              style={{
                backgroundColor: accentColor,
                color: isArmada ? "#0a0c10" : "#ffffff",
                boxShadow: `0 0 20px ${accentColor}33`,
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>CALIBRATING TIMELINE...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>GENERATE BUILD ORDER</span>
                  <kbd
                    className={`text-[9px] px-1 py-0.2 rounded border font-mono ml-1 ${
                      isArmada
                        ? "bg-[#0a0c10]/20 border-[#0a0c10]/40 text-[#0a0c10]"
                        : "bg-white/20 border-white/40 text-white"
                    }`}
                  >
                    Enter
                  </kbd>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: MAIN STAGE (flex-1) FULL-VIEWPORT TACTICAL TIMELINE       */}
        {/* ======================================================================= */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0a0c10]">
          
          {/* Main Stage Navigation Tabs */}
          <div className="h-10 shrink-0 border-b border-zinc-800/60 bg-[#0c0e14] px-4 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 ${
                  activeTab === "timeline"
                    ? "bg-zinc-900 text-zinc-100 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                style={
                  activeTab === "timeline"
                    ? { borderBottom: `2px solid ${accentColor}` }
                    : { borderBottom: "2px solid transparent" }
                }
              >
                <Clock className="size-3.5" style={{ color: activeTab === "timeline" ? accentColor : undefined }} />
                <span style={{ color: activeTab === "timeline" ? accentColor : undefined }}>BUILD ORDER TIMELINE</span>
                {parsedSteps.length > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
                    style={{
                      backgroundColor: activeTab === "timeline" ? `${accentColor}22` : "#27272a",
                      color: activeTab === "timeline" ? accentColor : "#d4d4d8",
                    }}
                  >
                    {parsedSteps.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("unitComp")}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 ${
                  activeTab === "unitComp"
                    ? "bg-zinc-900 text-zinc-100 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                style={
                  activeTab === "unitComp"
                    ? { borderBottom: `2px solid ${accentColor}` }
                    : { borderBottom: "2px solid transparent" }
                }
              >
                <Layers className="size-3.5" style={{ color: activeTab === "unitComp" ? accentColor : undefined }} />
                <span style={{ color: activeTab === "unitComp" ? accentColor : undefined }}>FORCE REQUISITION</span>
                {object?.unitComposition && (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
                    style={{
                      backgroundColor: activeTab === "unitComp" ? `${accentColor}22` : "#27272a",
                      color: activeTab === "unitComp" ? accentColor : "#d4d4d8",
                    }}
                  >
                    {object.unitComposition.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 ${
                  activeTab === "notes"
                    ? "bg-zinc-900 text-zinc-100 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                style={
                  activeTab === "notes"
                    ? { borderBottom: `2px solid ${accentColor}` }
                    : { borderBottom: "2px solid transparent" }
                }
              >
                <Cpu className="size-3.5" style={{ color: activeTab === "notes" ? accentColor : undefined }} />
                <span style={{ color: activeTab === "notes" ? accentColor : undefined }}>OPERATIONAL TELEMETRY</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("briefing")}
                className={`px-3 py-1.5 rounded transition-colors flex items-center gap-2 ${
                  activeTab === "briefing"
                    ? "bg-zinc-900 text-zinc-100 font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                style={
                  activeTab === "briefing"
                    ? { borderBottom: `2px solid ${accentColor}` }
                    : { borderBottom: "2px solid transparent" }
                }
              >
                <Compass className="size-3.5" style={{ color: activeTab === "briefing" ? accentColor : undefined }} />
                <span style={{ color: activeTab === "briefing" ? accentColor : undefined }}>MAP BRIEFING</span>
              </button>
            </div>

            {/* Faction and Doctrine Label + Eco Runway Toggle */}
            <div className="flex items-center gap-3 text-[11px] text-zinc-400">
              {activeTab === "timeline" && parsedSteps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowEcoRunway((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border text-[10px] font-mono transition-colors"
                  style={{
                    borderColor: showEcoRunway ? accentColor : "#27272a",
                    color: showEcoRunway ? accentColor : "#d4d4d8",
                  }}
                >
                  <Activity className="size-3" style={{ color: accentColor }} />
                  <span>{showEcoRunway ? "HIDE ECO RUNWAY" : "SHOW ECO RUNWAY"}</span>
                </button>
              )}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-zinc-500">ENGAGEMENT:</span>
                <span className="text-zinc-300 font-semibold">{faction.toUpperCase()}</span>
                <span className="text-zinc-600">{"//"}</span>
                <span className="text-zinc-400">{selectedMap.name}</span>
              </div>
            </div>
          </div>

          {/* Main Stage Content Viewport with Custom Scrollbars */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            
            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 rounded bg-red-950/40 border border-red-800/60 text-xs font-mono text-red-300 flex items-start gap-2.5">
                <AlertTriangle className="size-4 shrink-0 mt-0.5 text-red-400" />
                <div>
                  <div className="font-bold uppercase tracking-wider">Telemetry Stream Disrupted</div>
                  <div className="text-zinc-300 mt-0.5">{error.message || "Failed to stream build."}</div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 1: STRUCTURED BUILD ORDER TIMELINE (DATA-FIRST GANTT STYLE)    */}
            {/* =================================================================== */}
            {activeTab === "timeline" && (
              <div className="max-w-4xl mx-auto space-y-4">
                
                {/* Projected Resource Economy Runway Graph (Metal & Energy Curves) */}
                {parsedSteps.length > 0 && showEcoRunway && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ResourceGraph
                      steps={parsedSteps}
                      mapWindAvg={selectedMap.wind.avg}
                      faction={faction}
                    />
                  </motion.div>
                )}
                
                {/* Empty State */}
                {parsedSteps.length === 0 && !isLoading && (
                  <div className="h-[460px] flex flex-col items-center justify-center text-center p-8">
                    <div className="relative size-14 mb-4 opacity-40 flex items-center justify-center">
                      <Image
                        src={isArmada ? "/armada-logo.png" : "/cortex-logo.png"}
                        alt={faction}
                        width={56}
                        height={56}
                        className="object-contain"
                      />
                    </div>
                    <h3 className="font-mono text-sm font-bold text-zinc-300 tracking-wider uppercase">
                      STANDBY // AWAITING COMMAND PROTOCOL
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-md mt-1.5 font-mono">
                      Configure your Faction, Theater, and Doctrine in the left panel, then hit{" "}
                      <strong className="text-zinc-300">GENERATE BUILD ORDER</strong> (or press Enter) to synthesize
                      an opening queue.
                    </p>
                  </div>
                )}

                {/* Loading Skeletons */}
                {isLoading && parsedSteps.length === 0 && (
                  <div className="space-y-3 py-4">
                    <div className="flex items-center gap-2 text-xs font-mono mb-4 text-zinc-400">
                      <RefreshCw className="size-3.5 animate-spin" style={{ color: accentColor }} />
                      <span>SYNTHESIZING TOURNAMENT OPENING QUEUE...</span>
                    </div>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="p-3 rounded bg-zinc-900/40 border border-zinc-800/40 flex items-center gap-4"
                      >
                        <Skeleton className="h-4 w-14 bg-zinc-800" />
                        <Skeleton className="h-4 w-12 bg-zinc-800" />
                        <Skeleton className="h-4 w-44 bg-zinc-800" />
                        <Skeleton className="h-4 w-20 bg-zinc-800 ml-auto" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Vertical Gantt-Style Timeline */}
                {parsedSteps.length > 0 && (
                  <div className="relative pl-6 space-y-2">
                    {/* Vertical Guideline / Timeline Rail */}
                    <div className="absolute left-[47px] top-4 bottom-4 w-px bg-zinc-800/80 pointer-events-none" />

                    {parsedSteps.map((step, idx) => {
                      const lowerName = step.itemName.toLowerCase();
                      const isStructure =
                        lowerName.includes("solar") ||
                        lowerName.includes("wind") ||
                        lowerName.includes("extractor") ||
                        lowerName.includes("mex") ||
                        lowerName.includes("factory") ||
                        lowerName.includes("lab") ||
                        lowerName.includes("plant") ||
                        lowerName.includes("shipyard") ||
                        lowerName.includes("storage") ||
                        lowerName.includes("converter") ||
                        lowerName.includes("tower") ||
                        lowerName.includes("llt");

                      return (
                        <motion.div
                          key={step.id || idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.18, delay: idx * 0.02 }}
                          className="relative flex items-center gap-3.5 p-2.5 rounded hover:bg-zinc-900/60 transition-colors group border-b border-zinc-800/40 min-h-[64px]"
                        >
                          {/* Monospace Timestamp Pill pinned to the guideline */}
                          <div className="relative shrink-0 flex items-center gap-2 z-10 w-[62px] justify-between">
                            <span className="w-[48px] py-0.5 rounded font-mono text-[11px] font-bold bg-[#0d0f15] border border-zinc-800 text-zinc-300 text-center">
                              {step.timestamp}
                            </span>
                            {/* Guideline Node Marker */}
                            <span
                              className="size-2 rounded-full ring-4 ring-[#0a0c10] shrink-0"
                              style={{
                                backgroundColor: idx === 0 ? accentColor : "#52525b",
                              }}
                            />
                          </div>

                          {/* Large Prominent RTS Unit/Structure Portrait Frame (w-12 h-12 / min-w-[48px]) */}
                          <div
                            className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-sm shrink-0 border flex items-center justify-center p-2 relative overflow-hidden transition-all ${
                              isArmada
                                ? "border-[#48a2ef]/40 shadow-[0_0_12px_rgba(72,162,239,0.15)]"
                                : "border-red-500/40 shadow-[0_0_12px_rgba(255,42,42,0.08)]"
                            } ${
                              isStructure
                                ? "bg-amber-950/20 group-hover:bg-amber-950/30"
                                : "bg-zinc-900/90 group-hover:bg-zinc-850/90"
                            }`}
                          >
                            {/* Tactical Military Corner Accent */}
                            <div
                              className="absolute top-0 right-0 size-1.5 border-t border-r pointer-events-none"
                              style={{ borderColor: accentColor }}
                            />
                            <BarIcon
                              name={step.itemName}
                              faction={faction}
                              size={28}
                              className="w-full h-full object-contain"
                            />
                          </div>

                          {/* Text Stack: Vertical flex column with Entity, Title, and Strategic Description */}
                          <div className="flex flex-col justify-center gap-0.5 min-w-0 flex-1">
                            {/* Top Line: Entity badge, count, and bold unit/building name */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                  step.entityBadge === "[CDR]"
                                    ? "bg-zinc-800 text-zinc-200 border border-zinc-700/60"
                                    : step.entityBadge === "[FAC]"
                                    ? "bg-blue-950/60 text-blue-300 border border-blue-800/40"
                                    : step.entityBadge === "[CON]"
                                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                                    : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/40"
                                }`}
                              >
                                {step.entityBadge}
                              </span>

                              <span className="font-mono text-xs font-bold text-zinc-100">
                                {step.count} {step.itemName}
                              </span>
                            </div>

                            {/* Bottom Line: Subdued Strategic Description */}
                            {step.explanation && (
                              <p className="text-xs text-zinc-400 font-sans leading-normal line-clamp-2">
                                {step.explanation}
                              </p>
                            )}
                          </div>

                          {/* Resource Delta Badges pushed to the far right */}
                          <div className="ml-auto shrink-0 flex items-center gap-2 font-mono text-[10px]">
                            {step.energyDelta && (
                              <span
                                className={`px-2 py-0.5 rounded border flex items-center gap-1 font-semibold ${
                                  step.energyDelta.startsWith("+")
                                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                    : "bg-zinc-900 text-zinc-400 border-zinc-800"
                                }`}
                              >
                                <Zap className="size-3 text-amber-400" />
                                {step.energyDelta}
                              </span>
                            )}
                            {step.metalDelta && (
                              <span
                                className={`px-2 py-0.5 rounded border flex items-center gap-1 font-semibold ${
                                  step.metalDelta.startsWith("+")
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                    : "bg-zinc-900 text-zinc-400 border-zinc-800"
                                }`}
                              >
                                <span className="text-[11px]">⛊</span>
                                {step.metalDelta}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}


                    {/* Active streaming pulse indicator */}
                    {isLoading && (
                      <div className="p-3 flex items-center gap-2 text-xs font-mono text-zinc-400">
                        <span className="size-2 rounded-full animate-ping" style={{ backgroundColor: accentColor }} />
                        <span>Streaming factory queue from tactical advisory core...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 2: FORCE REQUISITION // TARGET ARMY COMPOSITION MATRIX         */}
            {/* =================================================================== */}
            {activeTab === "unitComp" && (
              <div className="max-w-4xl mx-auto space-y-4">
                {!object?.unitComposition && !isLoading && (
                  <div className="h-[400px] flex flex-col items-center justify-center text-center p-8">
                    <Layers className="size-10 text-zinc-600 mb-3" />
                    <div className="font-mono text-xs font-bold text-zinc-300 uppercase">
                      NO FORCE REQUISITION RECORDED
                    </div>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1 font-mono">
                      Target unit ratios and production caps will populate here upon simulation.
                    </p>
                  </div>
                )}

                {isLoading && (!object?.unitComposition || object.unitComposition.length === 0) && (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-between"
                      >
                        <Skeleton className="h-4 w-48 bg-zinc-800" />
                        <Skeleton className="h-4 w-16 bg-zinc-800" />
                      </div>
                    ))}
                  </div>
                )}

                {object?.unitComposition && object.unitComposition.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-1 border-b border-zinc-800/60">
                      <span>TARGET COMBAT SQUADRON</span>
                      <span>FACTION: {faction.toUpperCase()}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {object.unitComposition.map((comp, idx) => {
                        if (!comp) return null;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: idx * 0.03 }}
                            className="p-3 rounded bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/50 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-0.5 rounded bg-zinc-950 border border-zinc-800 shrink-0 flex items-center justify-center">
                                <BarIcon name={comp} faction={faction} size={15} className="size-3.5" />
                              </div>
                              <span className="font-mono text-xs font-bold text-zinc-100">
                                {comp}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400 uppercase">
                              {faction}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 3: OPERATIONAL TELEMETRY // TIMING & ECONOMY NOTES             */}
            {/* =================================================================== */}
            {activeTab === "notes" && (
              <div className="max-w-4xl mx-auto space-y-4">
                {!object?.strategyNotes && !isLoading && (
                  <div className="h-[400px] flex flex-col items-center justify-center text-center p-8">
                    <Cpu className="size-10 text-zinc-600 mb-3" />
                    <div className="font-mono text-xs font-bold text-zinc-300 uppercase">
                      NO STRATEGIC TELEMETRY GENERATED
                    </div>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1 font-mono">
                      Economy thresholds, power spike benchmarks, and timing attack windows will stream here.
                    </p>
                  </div>
                )}

                {isLoading && !object?.strategyNotes && (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-5 w-48 bg-zinc-800" />
                    <Skeleton className="h-4 w-full bg-zinc-800" />
                    <Skeleton className="h-4 w-5/6 bg-zinc-800" />
                    <Skeleton className="h-20 w-full bg-zinc-800/60" />
                  </div>
                )}

                {object?.strategyNotes && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-5 rounded bg-zinc-900/40 border border-zinc-800/60 space-y-4 text-xs font-mono text-zinc-300 leading-relaxed"
                  >
                    {object.strategyNotes.split("\n\n").map((paragraph, pIdx) => {
                      const isHeading = paragraph.startsWith("#");
                      const isBulletList = paragraph.includes("- ") || paragraph.includes("* ");

                      if (isHeading) {
                        const cleanHeading = paragraph.replace(/^#+\s*/, "");
                        return (
                          <div
                            key={pIdx}
                            className="font-mono font-bold text-sm text-zinc-100 pt-2 pb-1 border-b border-zinc-800/60 flex items-center gap-2"
                          >
                            <span style={{ color: accentColor }}>▸</span>
                            <span>{cleanHeading}</span>
                          </div>
                        );
                      }

                      if (isBulletList) {
                        const lines = paragraph.split("\n").filter((l) => l.trim().length > 0);
                        return (
                          <ul key={pIdx} className="space-y-1.5 pl-2">
                            {lines.map((l, lIdx) => (
                              <li key={lIdx} className="flex items-start gap-2 text-zinc-300 font-sans text-xs">
                                <span className="text-zinc-500 font-mono">▪</span>
                                <span>{l.replace(/^[-*]\s*/, "")}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      }

                      return (
                        <p key={pIdx} className="text-zinc-300 font-sans text-xs leading-normal">
                          {paragraph}
                        </p>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            )}

            {/* View 4: MAP BRIEFING */}
            {activeTab === "briefing" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 max-w-5xl"
              >
                {/* Header Card */}
                <div className="p-6 rounded-lg bg-[#0d0f15]/90 border border-zinc-800 shadow-xl relative overflow-hidden backdrop-blur-md">
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-[11px] font-mono uppercase tracking-widest text-zinc-500">
                        <Compass className="size-3.5" style={{ color: accentColor }} />
                        <span>TACTICAL THEATER INTEL // SECTOR BRIEFING</span>
                      </div>
                      <h2 className="text-2xl font-bold font-mono text-zinc-100 tracking-tight flex items-center gap-3">
                        {selectedMap.name}
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] tracking-wider uppercase border-zinc-700 bg-zinc-900/80 text-zinc-300"
                        >
                          {selectedMap.dimensions}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] tracking-wider uppercase ${
                            selectedMap.metalDensity === "all-metal"
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                              : selectedMap.metalDensity === "high"
                              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                              : "border-zinc-700 bg-zinc-900/80 text-zinc-300"
                          }`}
                        >
                          {selectedMap.metalDensity.toUpperCase()} METAL
                        </Badge>
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded bg-zinc-950/80 border border-zinc-800 font-mono text-xs flex items-center gap-2">
                        <span className="text-zinc-500">CURRENT FACTION:</span>
                        <span
                          className="font-bold uppercase"
                          style={{ color: accentColor }}
                        >
                          {faction}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    <div className="p-3 rounded bg-zinc-950/60 border border-zinc-800/80">
                      <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
                        <SquareSquare className="size-3 text-zinc-400" />
                        Dimensions
                      </div>
                      <div className="text-sm font-bold font-mono text-zinc-200 mt-1">
                        {selectedMap.dimensions}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">Standard Grid</div>
                    </div>

                    <div className="p-3 rounded bg-zinc-950/60 border border-zinc-800/80">
                      <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
                        <Wind className="size-3 text-cyan-400" />
                        Wind Velocity
                      </div>
                      <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
                        {selectedMap.wind.min} – {selectedMap.wind.max} <span className="text-xs text-zinc-500 font-normal">m/s</span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">Avg: {selectedMap.wind.avg} m/s</div>
                    </div>

                    <div className="p-3 rounded bg-zinc-950/60 border border-zinc-800/80">
                      <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
                        <Waves className="size-3 text-blue-400" />
                        Tidal Energy
                      </div>
                      <div className="text-sm font-bold font-mono text-zinc-200 mt-1">
                        {selectedMap.tidal > 0 ? `+${selectedMap.tidal} E/s` : "0 E/s"}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {selectedMap.tidal > 0 ? "Oceanic tidal yield" : "Landlocked / Dry"}
                      </div>
                    </div>

                    <div className="p-3 rounded bg-zinc-950/60 border border-zinc-800/80">
                      <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
                        <Database className="size-3 text-amber-400" />
                        Metal Extraction
                      </div>
                      <div className="text-sm font-bold font-mono text-amber-300 mt-1 capitalize">
                        {selectedMap.metalDensity}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">Deposit density</div>
                    </div>
                  </div>
                </div>

                {/* Tactical Briefing Narrative */}
                <div className="p-5 rounded-lg bg-[#0d0f15]/70 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
                    <span style={{ color: accentColor }}>▸</span>
                    <span>THEATER NARRATIVE & OPERATIONAL ENVIRONMENT</span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed font-sans pl-4 border-l-2 border-zinc-800">
                    {selectedMap.tacticalBriefing}
                  </p>
                </div>

                {/* Choke Points Grid */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
                    <ShieldAlert className="size-3.5 text-amber-400" />
                    <span>CRITICAL CHOKE POINTS & TERRAIN ANOMALIES ({selectedMap.chokePoints.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedMap.chokePoints.map((choke, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded bg-zinc-900/50 border border-zinc-800/80 hover:border-amber-500/40 transition-colors flex items-start gap-2.5"
                      >
                        <div className="size-5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-amber-400">
                            {idx + 1}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-mono font-semibold text-zinc-200">
                            {choke}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                            Priority radar coverage & early warning boundary
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Doctrines */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
                      <Crosshair className="size-3.5" style={{ color: accentColor }} />
                      <span>RECOMMENDED STRATEGIC DOCTRINES</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Tailored for competitive play
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {selectedMap.recommendedDoctrines.map((doc, idx) => {
                      const isFactionMatch =
                        doc.faction === "both" ||
                        doc.faction.toLowerCase() === faction.toLowerCase();

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded border transition-all ${
                            isFactionMatch
                              ? "bg-zinc-900/60 border-zinc-700/80 shadow-md"
                              : "bg-zinc-950/40 border-zinc-800/40 opacity-70"
                          }`}
                          style={
                            isFactionMatch
                              ? { borderLeft: `3px solid ${accentColor}` }
                              : undefined
                          }
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-bold text-zinc-100">
                                {doc.name}
                              </span>
                              {isFactionMatch && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-mono uppercase tracking-wider py-0 px-1.5"
                                  style={{
                                    borderColor: `${accentColor}50`,
                                    backgroundColor: `${accentColor}15`,
                                    color: accentColor,
                                  }}
                                >
                                  OPTIMAL FIT
                                </Badge>
                              )}
                            </div>

                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${
                                doc.faction === "armada"
                                  ? "text-sky-400 bg-sky-950/30 border-sky-800/50"
                                  : doc.faction === "cortex"
                                  ? "text-red-400 bg-red-950/30 border-red-800/50"
                                  : "text-zinc-300 bg-zinc-800/50 border-zinc-700/50"
                              }`}
                            >
                              {doc.faction.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                            {doc.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. API KEY MODAL DIALOG                                                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md rounded bg-[#0d0f15] border border-zinc-800 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4" style={{ color: accentColor }} />
                  <h4 className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-wider">
                    Google Gemini 1.5 Pro AI Link
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono text-zinc-400">
                <p>
                  Link your Gemini API key to activate live reasoning with{" "}
                  <strong className="text-zinc-200">Gemini 1.5 Pro</strong>.
                </p>
                <p className="text-[11px] text-zinc-500">
                  Keys are stored exclusively in your local browser storage. If empty, the console
                  seamlessly uses the built-in Grandmaster ruleset.
                </p>
                <div className="pt-2">
                  <Input
                    type="password"
                    placeholder="AIzaSy..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="font-mono text-xs bg-[#0a0c10] border-zinc-800 text-zinc-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono hover:underline flex items-center gap-1"
                  style={{ color: accentColor }}
                >
                  Get free API key <ExternalLink className="size-3" />
                </a>
                <div className="flex items-center gap-2">
                  {apiKey && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearApiKey}
                      className="font-mono text-xs border-zinc-800 text-zinc-400"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveApiKey}
                    className="font-mono text-xs font-bold"
                    style={{
                      backgroundColor: accentColor,
                      color: isArmada ? "#0a0c10" : "#ffffff",
                    }}
                  >
                    Save Key
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
