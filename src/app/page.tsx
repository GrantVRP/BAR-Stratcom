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
  Waves,
  MonitorUp,
  Swords,
  Trophy,
  History,
  Flame,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPlanResponseSchema, type Faction } from "@/lib/game-data";
import { parseBuildStep, type ParsedBuildStep } from "@/lib/timeline-parser";
import { BarIcon } from "@/components/tactical/BarIcon";
import { ResourceGraph } from "@/components/tactical/ResourceGraph";
import { WindmillTelemetry } from "@/components/tactical/WindmillTelemetry";
import { MapCombobox } from "@/components/tactical/MapCombobox";
import { LiveLinkStatus } from "@/components/tactical/LiveLinkStatus";
import { TacticalOverlay } from "@/components/tactical/TacticalOverlay";
import { LiveBattlesModal } from "@/components/tactical/LiveBattlesModal";
import { LeaderboardModal } from "@/components/tactical/LeaderboardModal";
import { MatchHistoryModal } from "@/components/tactical/MatchHistoryModal";
import { PatchWatchModal } from "@/components/tactical/PatchWatchModal";
import { type MapData, MAP_DATABASE } from "@/lib/map-data";
import { useLiveGame, type LiveGameState } from "@/hooks/useLiveGame";
import { useOverlaySync } from "@/hooks/useOverlaySync";

const EnergyBoltIcon = ({ className }: { className?: string; style?: React.CSSProperties }) => (
  <img
    src="/energy.png"
    alt="Energy"
    className={`${className || "size-3.5"} object-contain pixelated shrink-0 inline-block`}
  />
);

// Tournament Strategic Strategies & Playbooks
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
    description: "Rocko/Storm rocket bot poke outranging LLTs, locking down choke points.",
    icon: Layers,
  },
  {
    id: "solar-reclaim-eco",
    title: "Anti-Chain Solars & Reclaim Rush",
    tag: "T1-T2 // RECLAIM META",
    timingWindow: "04:00 - 06:30",
    description: "Spaced solars avoid chain explosions; 100% metal reclaim fuels instant T2 transition.",
    icon: RefreshCw,
  },
  {
    id: "flank-rez-micro",
    title: "Flank Assault & Rez-Bot Scavenge",
    tag: "T1 // FLANK & REZ",
    timingWindow: "03:00 - 05:30",
    description: "Pin frontline while flanking rear (+100% dmg). Lazarus/Necro resurrect battlefield wrecks.",
    icon: Cpu,
  },
  {
    id: "dedicated-eco-afus",
    title: "Dedicated Backline Eco & AFUS",
    tag: "T2-T3 // ECO SLINGSHOT",
    timingWindow: "07:30 - 11:00",
    description: "Fast T2 lab into Advanced Fusion (+1050E/s), 70E:1M converters, dumping metal to frontline.",
    icon: EnergyBoltIcon,
  },
  {
    id: "air-superiority-strike",
    title: "Air Superiority & Surgical Gunships",
    tag: "T1-T2 // AIR DOMINANCE",
    timingWindow: "03:30 - 06:00",
    description: "Sparrow/Swift scouts into fighter screen; Brawler/Blade gunships snipe exposed constructors.",
    icon: Compass,
  },
  {
    id: "airdrop-heavy-armor",
    title: "Automated Air-Drop Heavy Siege",
    tag: "T2 // AIR-FERRY SIEGE",
    timingWindow: "09:00 - 12:30",
    description: "Automated Atlas/Valkyrie ferry routes drop slow heavy armor (Can, Sumo, Bulldog) over cliffs.",
    icon: Waves,
  },
  {
    id: "heavy-turtle",
    title: "Fortified Turtle into T2/T3",
    tag: "T2 // HEAVY ARMOR",
    timingWindow: "09:00 - 11:30",
    description: "Defend early mexes with LLT, bank metal for Bulldog, Goliath, or T3 Behemoths.",
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

  // Competitive BAR APIs Modals
  const [showBattlesModal, setShowBattlesModal] = useState<boolean>(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showPatchModal, setShowPatchModal] = useState<boolean>(false);

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
      `Strategy: ${currentStrategy.title} [Timing: ${currentStrategy.timingWindow}]`,
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

  // Faction Accent Color Tokens (16-Bit Armada Cerulean #449bed vs Cortex Flame #ff2244)
  const accentColor = isArmada ? "#449bed" : "#ff2244";

  // Tactical Overlay state & cross-tab sync
  const { broadcastState } = useOverlaySync(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState<boolean>(false);

  // Sync state to overlay whenever key dependencies change
  useEffect(() => {
    broadcastState({
      faction,
      selectedMap,
      steps: parsedSteps,
      liveState,
      strategyTitle: currentStrategy?.title,
    });
  }, [faction, selectedMap, parsedSteps, liveState, currentStrategy, broadcastState]);

  // Global hotkey: Shift + O or ~ to toggle overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.shiftKey && e.key.toLowerCase() === "o") || e.key === "`" || e.key === "~") {
        e.preventDefault();
        setIsOverlayOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0c0c14] text-zinc-100 font-pixel-body select-none relative">
      {/* Full-Screen 16-bit CRT Scanline Overlay & Tube Vignette */}
      <div className="crt-scanlines pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. TOP BAR: PRACTICAL RTS TELEMETRY & HOTKEYS                             */}
      {/* ========================================================================= */}
      <header className="h-16 shrink-0 border-b-2 border-black bg-[#12131a] px-4 flex items-center justify-between text-xs z-30 shadow-[0_3px_0_0_#000]">
        {/* Left: Brand & Faction Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {/* 16-bit CRT Screen Title */}
            <div className="relative">
              <h1 className="text-sm font-pixel-heading tracking-wider flex items-center gap-2">
                <span className="text-white drop-shadow-[2px_2px_0px_#000]">BAR</span>
                <span
                  className="drop-shadow-[2px_2px_0px_#000]"
                  style={{ color: accentColor }}
                >
                  STRATCOM
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-[#1a1c26] text-zinc-400 border border-[#2a2e42]">
                  v2.5
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Global Competitive Intel & API Hub Navigation Buttons */}
        <div className="hidden md:flex items-center gap-1.5 font-pixel-heading text-[8.5px]">
          <button
            type="button"
            onClick={() => setShowBattlesModal(true)}
            className="pixel-btn py-1 px-2 gap-1 hover:border-[#449bed] transition-colors"
            title="Browse live worldwide games & scout lobby opponents"
          >
            <Swords className="size-2.5 text-[#449bed]" />
            <span>BATTLES</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLeaderboardModal(true)}
            className="pixel-btn py-1 px-2 gap-1 hover:border-amber-400 transition-colors"
            title="Inspect official BAR Season 3 Top 100 Leaderboards"
          >
            <Trophy className="size-2.5 text-amber-400" />
            <span>LEADERBOARD</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="pixel-btn py-1 px-2 gap-1 hover:border-purple-400 transition-colors"
            title="Search player match history, macro efficiency, & pro replays"
          >
            <History className="size-2.5 text-purple-400" />
            <span>REPLAYS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPatchModal(true)}
            className="pixel-btn py-1 px-2 gap-1 hover:border-red-400 transition-colors"
            title="Live unit nerfs, buffs, and engine balance patches"
          >
            <Flame className="size-2.5 text-red-400" />
            <span>PATCH WATCH</span>
          </button>
        </div>

        {/* Right: Dynamic Wind Widget wired to current map state, Live Memory Bridge, and Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Live Game Memory Bridge Status Indicator (Tactical Link HUD) */}
          <LiveLinkStatus
            liveState={liveState}
            faction={faction}
            accentColor={accentColor}
            onSync={syncWithLiveMatch}
          />

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
            className="pixel-btn text-[9px] py-1.5 px-2.5 gap-1.5"
          >
            <KeyRound className="size-3 text-zinc-400" />
            <span className="hidden lg:inline text-zinc-400">AI:</span>
            {apiKey ? (
              <span className="text-[#449bed] font-bold">GEMINI 1.5</span>
            ) : (
              <span className="text-zinc-400">RULES</span>
            )}
          </button>

          {/* Discord-Style Tactical Overlay Toggle Button */}
          <button
            type="button"
            onClick={() => setIsOverlayOpen((prev) => !prev)}
            className={`pixel-btn text-[9px] py-1.5 px-2.5 gap-1.5 ${
              isOverlayOpen
                ? isArmada
                  ? "border-[#449bed] text-[#449bed] bg-[#0a1c32]"
                  : "border-[#ff2244] text-[#ff2244] bg-[#320a0a]"
                : ""
            }`}
            title="Toggle Discord-Style In-Game Tactical Overlay (Shift + O)"
          >
            <MonitorUp className="size-3" />
            <span className="hidden md:inline">OVERLAY</span>
            <kbd className="hidden sm:inline text-[8px] px-1 py-0.5 bg-[#0a0b10] text-zinc-400 border border-zinc-700 font-pixel-heading">
              Shift+O
            </kbd>
          </button>

          {/* Copy Macro Shortcut Button */}
          {object?.openingBuildOrder && object.openingBuildOrder.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              className="pixel-btn text-[9px] py-1.5 px-2.5 gap-1.5"
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
                  <kbd className="hidden sm:inline text-[8px] px-1 py-0.5 bg-[#0a0b10] text-zinc-400 border border-zinc-700 font-pixel-heading">
                    Ctrl+C
                  </kbd>
                </>
              )}
            </button>
          )}

          {/* Abort CTA when streaming */}
          {isLoading && (
            <button
              type="button"
              onClick={stop}
              className="pixel-btn pixel-btn-cortex text-[9px] py-1.5 px-2.5 gap-1.5"
            >
              <SquareSquare className="size-3" />
              ABORT
            </button>
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
        <aside className="w-[360px] shrink-0 h-full flex flex-col border-r-2 border-black bg-[#101118] overflow-y-auto scrollbar-thin z-10 shadow-[3px_0_0_0_#000]">
          
          {/* Section: Faction Selector (Tactile Radio Tabs) */}
          <div className="p-3.5 border-b-2 border-black space-y-2 bg-[#12131a]">
            <div className="flex items-center justify-between text-[10px] font-pixel-heading text-zinc-400">
              <span className="tracking-wider">01 // FACTION</span>
              <span style={{ color: accentColor }}>
                [{faction.toUpperCase()}]
              </span>
            </div>

            {/* Compact Tactile Radio Tabs */}
            <div className="grid grid-cols-2 gap-2 pixel-box-inset p-1.5">
              {/* ARMADA TAB */}
              <button
                type="button"
                onClick={() => setFaction("Armada")}
                className={`flex items-center gap-2 p-2 border-2 transition-none text-left cursor-pointer ${
                  faction === "Armada"
                    ? "bg-[#0a1c32] border-[#449bed] text-[#449bed] shadow-[2px_2px_0px_#000]"
                    : "bg-[#0f1118] border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
                }`}
              >
                <div
                  className={`size-7 bg-black flex items-center justify-center shrink-0 border ${
                    faction === "Armada" ? "border-[#449bed]" : "border-zinc-800"
                  }`}
                >
                  <Image
                    src="/armada-logo.png"
                    alt="Armada"
                    width={20}
                    height={20}
                    className="object-contain pixelated"
                  />
                </div>
                <div>
                  <div className="font-pixel-heading text-[10px] font-bold leading-tight">
                    ARMADA
                  </div>
                  <div className="text-xs text-zinc-400 font-pixel-body">Laser / Skirmish</div>
                </div>
              </button>

              {/* CORTEX TAB */}
              <button
                type="button"
                onClick={() => setFaction("Cortex")}
                className={`flex items-center gap-2 p-2 border-2 transition-none text-left cursor-pointer ${
                  faction === "Cortex"
                    ? "bg-[#380b12] border-[#ff2244] text-[#ff2244] shadow-[2px_2px_0px_#000]"
                    : "bg-[#0f1118] border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
                }`}
              >
                <div
                  className={`size-7 bg-black flex items-center justify-center shrink-0 border ${
                    faction === "Cortex" ? "border-[#ff2244]" : "border-zinc-800"
                  }`}
                >
                  <Image
                    src="/cortex-logo.png"
                    alt="Cortex"
                    width={20}
                    height={20}
                    className="object-contain pixelated"
                  />
                </div>
                <div>
                  <div className="font-pixel-heading text-[10px] font-bold leading-tight">
                    CORTEX
                  </div>
                  <div className="text-xs text-zinc-400 font-pixel-body">Armor / Riot</div>
                </div>
              </button>
            </div>
          </div>

          {/* Section: Theater of War (Map Combobox & Tactical Topography) */}
          <div className="p-3.5 border-b-2 border-black space-y-2.5 bg-[#12131a]">
            <div className="flex items-center justify-between text-[10px] font-pixel-heading text-zinc-400">
              <span className="tracking-wider">02 // THEATER</span>
              <span className="text-zinc-500 font-pixel-body text-xs">DATABASE</span>
            </div>

            {/* Custom Pixel Art Combobox with Search Filter */}
            <MapCombobox
              selectedMap={selectedMap}
              onSelectMap={setSelectedMap}
            />

            {/* Quick Choke Points & Tactical Preview */}
            <div className="p-2.5 pixel-box-inset space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[9px] font-pixel-heading text-zinc-400">
                <span className="text-zinc-500">CHOKES ({selectedMap.chokePoints.length})</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("briefing")}
                  className="hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                  style={{ color: accentColor }}
                >
                  BRIEFING →
                </button>
              </div>
              <ul className="space-y-1">
                {selectedMap.chokePoints.slice(0, 3).map((cp, idx) => (
                  <li key={idx} className="text-sm font-pixel-body text-zinc-300 flex items-start gap-1.5 leading-tight">
                    <span className="font-pixel-heading text-[8px] shrink-0 mt-0.5" style={{ color: accentColor }}>▸</span>
                    <span className="line-clamp-1">{cp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section: Strategic Strategy Selector */}
          <div className="p-3.5 border-b-2 border-black space-y-2 flex-1 bg-[#101118]">
            <div className="flex items-center justify-between text-[10px] font-pixel-heading text-zinc-400">
              <span className="tracking-wider">03 // STRATEGIES</span>
              <span className="text-zinc-500 font-pixel-body text-xs">ATTACK TIMING</span>
            </div>

            <div className="space-y-1.5">
              {STRATEGY_PRESETS.map((style) => {
                const isSelected = selectedStrategyId === style.id;
                const Icon = style.icon;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStrategyId(style.id)}
                    className={`w-full text-left p-2.5 border-2 transition-none cursor-pointer ${
                      isSelected
                        ? isArmada
                          ? "pixel-box-armada"
                          : "pixel-box-cortex"
                        : "bg-[#12131a] border-[#222536] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 shadow-[2px_2px_0px_#000]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          className="size-3.5"
                          style={{ color: isSelected ? accentColor : "#71717a" }}
                        />
                        <span
                          className="font-pixel-heading text-[10px] font-bold"
                          style={{ color: isSelected ? accentColor : undefined }}
                        >
                          {style.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-pixel-heading text-zinc-400">
                        {style.timingWindow.split(" - ")[0]}
                      </span>
                    </div>
                    <p className="text-sm font-pixel-body text-zinc-400 mt-1 line-clamp-1">
                      {style.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Footer: Sticky CTA Button */}
          <div className="p-3.5 border-t-2 border-black bg-[#12131a] space-y-2 shadow-[0_-3px_0_0_#000]">
            <div className="flex items-center justify-between text-[9px] font-pixel-heading text-zinc-500">
              <span>PROFILE:</span>
              <span className="text-zinc-300 truncate max-w-[180px]">
                {currentStrategy.title.split(" ")[0]} {"//"} {selectedMap.name.split(" ")[0]}
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGenerate}
              className={`pixel-btn w-full py-3 px-4 text-xs font-pixel-heading tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer ${
                isArmada ? "pixel-btn-armada" : "pixel-btn-cortex"
              } ${isLoading ? "opacity-75 cursor-wait" : ""}`}
              style={{
                backgroundColor: accentColor,
                color: "#0c0c14",
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>CALIBRATING...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>GENERATE BUILD ORDER</span>
                  <kbd className="text-[8px] px-1 py-0.5 bg-black/30 border border-black/50 text-black font-pixel-heading ml-1">
                    ENTER
                  </kbd>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: MAIN STAGE (flex-1) FULL-VIEWPORT TACTICAL TIMELINE       */}
        {/* ======================================================================= */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0a0c14]">
          
          {/* Main Stage Navigation Tabs (Arcade Cartridges) */}
          <div className="h-11 shrink-0 border-b-2 border-black bg-[#0d0e14] px-4 flex items-center justify-between text-xs font-pixel-heading">
            <div className="flex items-center gap-1.5 h-full pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`pixel-tab h-full flex items-center gap-2 cursor-pointer ${
                  activeTab === "timeline"
                    ? isArmada
                      ? "active-armada"
                      : "active-cortex"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Clock className="size-3.5" />
                <span>TIMELINE</span>
                {parsedSteps.length > 0 && (
                  <span className="pixel-box-inset px-1.5 py-0.5 text-[8px] font-pixel-heading text-zinc-300">
                    {parsedSteps.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("unitComp")}
                className={`pixel-tab h-full flex items-center gap-2 cursor-pointer ${
                  activeTab === "unitComp"
                    ? isArmada
                      ? "active-armada"
                      : "active-cortex"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Layers className="size-3.5" />
                <span>UNITS</span>
                {object?.unitComposition && (
                  <span className="pixel-box-inset px-1.5 py-0.5 text-[8px] font-pixel-heading text-zinc-300">
                    {object.unitComposition.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`pixel-tab h-full flex items-center gap-2 cursor-pointer ${
                  activeTab === "notes"
                    ? isArmada
                      ? "active-armada"
                      : "active-cortex"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Cpu className="size-3.5" />
                <span>TELEMETRY</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("briefing")}
                className={`pixel-tab h-full flex items-center gap-2 cursor-pointer ${
                  activeTab === "briefing"
                    ? isArmada
                      ? "active-armada"
                      : "active-cortex"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Compass className="size-3.5" />
                <span>BRIEFING</span>
              </button>
            </div>

            {/* Faction and Strategy Label + Eco Runway Toggle */}
            <div className="flex items-center gap-3 text-[9px] font-pixel-heading text-zinc-400">
              {activeTab === "timeline" && parsedSteps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowEcoRunway((prev) => !prev)}
                  className={`pixel-btn py-1 px-2.5 text-[8px] gap-1.5 ${
                    showEcoRunway ? (isArmada ? "pixel-btn-armada active" : "pixel-btn-cortex active") : ""
                  }`}
                >
                  <Activity className="size-3" />
                  <span>{showEcoRunway ? "HIDE ECO RUNWAY" : "SHOW ECO RUNWAY"}</span>
                </button>
              )}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-zinc-500">WARZONE:</span>
                <span className="text-zinc-200 font-bold">{faction.toUpperCase()}</span>
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
                  <div className="h-[460px] flex flex-col items-center justify-center text-center p-8 pixel-box-inset">
                    <div className="relative size-16 mb-4 opacity-50 flex items-center justify-center">
                      <Image
                        src={isArmada ? "/armada-logo.png" : "/cortex-logo.png"}
                        alt={faction}
                        width={64}
                        height={64}
                        className="object-contain pixelated drop-shadow-[2px_2px_0px_#000]"
                      />
                    </div>
                    <h3 className="font-pixel-heading text-xs text-zinc-300 tracking-wider uppercase">
                      STANDBY // AWAITING COMMAND PROTOCOL
                    </h3>
                    <p className="text-sm text-zinc-400 max-w-md mt-2 font-pixel-body">
                      Configure your Faction, Theater, and Strategy in the left console, then hit{" "}
                      <strong className="text-white font-pixel-heading text-[10px]">GENERATE BUILD ORDER</strong> (or press Enter) to synthesize
                      an opening queue.
                    </p>
                  </div>
                )}

                {/* Loading Skeletons */}
                {isLoading && parsedSteps.length === 0 && (
                  <div className="space-y-3 py-4">
                    <div className="flex items-center gap-2 text-xs font-pixel-heading mb-4 text-zinc-400">
                      <RefreshCw className="size-3.5 animate-spin" style={{ color: accentColor }} />
                      <span>SYNTHESIZING TOURNAMENT OPENING QUEUE...</span>
                    </div>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="p-3 pixel-box-inset flex items-center gap-4"
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
                  <div className="relative pl-6 space-y-2.5">
                    {/* Vertical Guideline / Timeline Rail */}
                    <div className="absolute left-[47px] top-4 bottom-4 w-[2px] bg-black shadow-[1px_0_0_0_#222536] pointer-events-none" />

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
                          className="relative flex items-center gap-3.5 p-3 pixel-box hover:bg-[#161822] transition-none group min-h-[64px]"
                        >
                          {/* Monospace Timestamp Pill pinned to the guideline */}
                          <div className="relative shrink-0 flex items-center gap-2 z-10 w-[62px] justify-between">
                            <span className="w-[48px] py-1 pixel-box-inset font-pixel-heading text-[9px] text-zinc-300 text-center tracking-tighter">
                              {step.timestamp}
                            </span>
                            {/* Guideline Node Marker (Chunky Square Pixel) */}
                            <span
                              className="size-2.5 border-2 border-black shrink-0"
                              style={{
                                backgroundColor: idx === 0 ? accentColor : "#52525b",
                              }}
                            />
                          </div>

                          {/* Large Prominent RTS Unit/Structure Portrait Frame */}
                          <div
                            className={`w-12 h-12 min-w-[48px] min-h-[48px] pixel-box-inset shrink-0 flex items-center justify-center p-1.5 relative overflow-hidden ${
                              isArmada
                                ? "border-[#449bed]/40 shadow-[2px_2px_0px_#000]"
                                : "border-[#ff2244]/40 shadow-[2px_2px_0px_#000]"
                            } ${
                              isStructure
                                ? "bg-[#18120a]"
                                : "bg-[#0f1118]"
                            }`}
                          >
                            {/* Tactical Military Pixel Corner Accent */}
                            <div
                              className="absolute top-0 right-0 size-2"
                              style={{ backgroundColor: accentColor }}
                            />
                            <BarIcon
                              name={step.itemName}
                              faction={faction}
                              size={28}
                              className="w-full h-full object-contain pixelated"
                            />
                          </div>

                          {/* Text Stack: Vertical flex column with Entity, Title, and Strategic Description */}
                          <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
                            {/* Top Line: Entity badge, count, and bold unit/building name */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-1.5 py-0.5 text-[8px] font-pixel-heading border ${
                                  step.entityBadge === "[CDR]"
                                    ? "bg-[#271d05] text-amber-300 border-amber-600"
                                    : step.entityBadge === "[FAC]"
                                    ? "bg-[#0a1c32] text-[#449bed] border-[#2563eb]"
                                    : step.entityBadge === "[CON]"
                                    ? "bg-[#062c19] text-emerald-300 border-emerald-600"
                                    : "bg-[#181a20] text-zinc-400 border-zinc-700"
                                }`}
                              >
                                {step.entityBadge}
                              </span>

                              <span className="font-pixel-heading text-xs text-white">
                                {step.count} {step.itemName}
                              </span>
                            </div>

                            {/* Bottom Line: Subdued Strategic Description */}
                            {step.explanation && (
                              <p className="text-sm text-zinc-300 font-pixel-body leading-tight line-clamp-2">
                                {step.explanation}
                              </p>
                            )}
                          </div>

                          {/* Resource Delta Badges pushed to the far right */}
                          <div className="ml-auto shrink-0 flex items-center gap-2 font-pixel-heading text-[8px]">
                            {step.energyDelta && (
                              <span
                                className={`px-2 py-1 pixel-box-inset flex items-center gap-1 font-bold ${
                                  step.energyDelta.startsWith("+")
                                    ? "text-[#fbbf24] border-[#fbbf24]/50"
                                    : "text-zinc-400"
                                }`}
                              >
                                <img
                                  src="/energy.png"
                                  alt="Energy"
                                  className="size-3 object-contain pixelated shrink-0 inline-block"
                                />
                                {step.energyDelta}
                              </span>
                            )}
                            {step.metalDelta && (
                              <span
                                className={`px-2 py-1 pixel-box-inset flex items-center gap-1 font-bold ${
                                  step.metalDelta.startsWith("+")
                                    ? "text-[#94a3b8] border-[#94a3b8]/50"
                                    : "text-zinc-400"
                                }`}
                              >
                                <img
                                  src="/metal.png"
                                  alt="Metal"
                                  className="size-3 object-contain pixelated shrink-0 inline-block"
                                />
                                {step.metalDelta}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Active streaming pulse indicator */}
                    {isLoading && (
                      <div className="p-3 flex items-center gap-2 text-xs font-pixel-heading text-zinc-400">
                        <span className="size-2 arcade-blink" style={{ backgroundColor: accentColor }} />
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
                  <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 pixel-box-inset">
                    <Layers className="size-10 text-zinc-600 mb-3" />
                    <div className="font-pixel-heading text-xs text-zinc-300 uppercase">
                      NO FORCE REQUISITION RECORDED
                    </div>
                    <p className="text-sm text-zinc-500 max-w-sm mt-2 font-pixel-body">
                      Target unit ratios and production caps will populate here upon simulation.
                    </p>
                  </div>
                )}

                {isLoading && (!object?.unitComposition || object.unitComposition.length === 0) && (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="p-3.5 pixel-box-inset flex items-center justify-between"
                      >
                        <Skeleton className="h-4 w-48 bg-zinc-800" />
                        <Skeleton className="h-4 w-16 bg-zinc-800" />
                      </div>
                    ))}
                  </div>
                )}

                {object?.unitComposition && object.unitComposition.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-pixel-heading text-zinc-400 pb-2 border-b-2 border-black">
                      <span>TARGET COMBAT SQUADRON</span>
                      <span>FACTION: {faction.toUpperCase()}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {object.unitComposition.map((comp, idx) => {
                        if (!comp) return null;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: idx * 0.03 }}
                            className="p-3 pixel-box flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 pixel-box-inset shrink-0 flex items-center justify-center p-1">
                                <BarIcon name={comp} faction={faction} size={20} className="w-full h-full object-contain pixelated" />
                              </div>
                              <span className="font-pixel-heading text-[11px] text-white">
                                {comp}
                              </span>
                            </div>
                            <span className="text-[8px] font-pixel-heading px-2 py-1 pixel-box-inset text-zinc-400 uppercase">
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
                  <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 pixel-box-inset">
                    <Cpu className="size-10 text-zinc-600 mb-3" />
                    <div className="font-pixel-heading text-xs text-zinc-300 uppercase">
                      NO STRATEGIC TELEMETRY GENERATED
                    </div>
                    <p className="text-sm text-zinc-500 max-w-sm mt-2 font-pixel-body">
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
                    className="p-5 pixel-box space-y-4 font-pixel-body text-base text-zinc-200 leading-relaxed"
                  >
                    {object.strategyNotes.split("\n\n").map((paragraph, pIdx) => {
                      const isHeading = paragraph.startsWith("#");
                      const isBulletList = paragraph.includes("- ") || paragraph.includes("* ");

                      if (isHeading) {
                        const cleanHeading = paragraph.replace(/^#+\s*/, "");
                        return (
                          <div
                            key={pIdx}
                            className="font-pixel-heading text-xs text-white pt-2 pb-1 border-b-2 border-black flex items-center gap-2"
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
                              <li key={lIdx} className="flex items-start gap-2 text-zinc-300 font-pixel-body text-base">
                                <span className="font-pixel-heading text-[8px] mt-1" style={{ color: accentColor }}>▪</span>
                                <span>{l.replace(/^[-*]\s*/, "")}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      }

                      return (
                        <p key={pIdx} className="text-zinc-300 font-pixel-body text-base leading-normal">
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
                className="space-y-6 max-w-5xl mx-auto"
              >
                {/* Header Card */}
                <div className="p-6 pixel-box relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 text-[9px] font-pixel-heading uppercase tracking-widest text-zinc-400">
                        <Compass className="size-3.5" style={{ color: accentColor }} />
                        <span>THEATER INTEL // SECTOR BRIEFING</span>
                      </div>
                      <h2 className="text-lg font-pixel-heading text-white tracking-tight flex items-center gap-3">
                        {selectedMap.name}
                        <span className="pixel-box-inset px-2 py-0.5 text-[9px] font-pixel-heading text-zinc-300">
                          {selectedMap.dimensions}
                        </span>
                        <span
                          className={`pixel-box-inset px-2 py-0.5 text-[9px] font-pixel-heading uppercase flex items-center gap-1.5 ${
                            selectedMap.metalDensity === "all-metal"
                              ? "text-amber-400 border-amber-600"
                              : selectedMap.metalDensity === "high"
                              ? "text-[#449bed] border-[#2563eb]"
                              : "text-zinc-300"
                          }`}
                        >
                          <img
                            src="/metal.png"
                            alt="Metal"
                            className="size-3 object-contain pixelated shrink-0"
                          />
                          {selectedMap.metalDensity.toUpperCase()} METAL
                        </span>
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 pixel-box-inset font-pixel-heading text-[10px] flex items-center gap-2">
                        <span className="text-zinc-500">FACTION:</span>
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
                    <div className="p-3 pixel-box-inset">
                      <div className="text-[8px] font-pixel-heading uppercase text-zinc-500 flex items-center gap-1.5">
                        <SquareSquare className="size-3 text-zinc-400" />
                        Dimensions
                      </div>
                      <div className="text-xs font-pixel-heading text-zinc-200 mt-1">
                        {selectedMap.dimensions}
                      </div>
                      <div className="text-xs font-pixel-body text-zinc-500">Standard Grid</div>
                    </div>

                    <div className="p-3 pixel-box-inset">
                      <div className="text-[8px] font-pixel-heading uppercase text-zinc-500 flex items-center gap-1.5">
                        <Wind className="size-3 text-[#449bed]" />
                        Wind Velocity
                      </div>
                      <div className="text-xs font-pixel-heading text-[#449bed] mt-1">
                        {selectedMap.wind.min}–{selectedMap.wind.max} <span className="text-[9px] font-pixel-body text-zinc-500">m/s</span>
                      </div>
                      <div className="text-xs font-pixel-body text-zinc-500">Avg: {selectedMap.wind.avg} m/s</div>
                    </div>

                    <div className="p-3 pixel-box-inset">
                      <div className="text-[8px] font-pixel-heading uppercase text-zinc-500 flex items-center gap-1.5">
                        <img
                          src="/energy.png"
                          alt="Energy"
                          className="size-3 object-contain pixelated shrink-0"
                        />
                        Tidal Energy
                      </div>
                      <div className="text-xs font-pixel-heading text-zinc-200 mt-1 flex items-center gap-1">
                        {selectedMap.tidal > 0 ? (
                          <>
                            <img
                              src="/energy.png"
                              alt="Energy"
                              className="size-2.5 object-contain pixelated shrink-0 inline-block"
                            />
                            <span>+{selectedMap.tidal} E/s</span>
                          </>
                        ) : (
                          "0 E/s"
                        )}
                      </div>
                      <div className="text-xs font-pixel-body text-zinc-500">
                        {selectedMap.tidal > 0 ? "Oceanic tidal" : "Landlocked"}
                      </div>
                    </div>

                    <div className="p-3 pixel-box-inset">
                      <div className="text-[8px] font-pixel-heading uppercase text-zinc-500 flex items-center gap-1.5">
                        <img
                          src="/metal.png"
                          alt="Metal"
                          className="size-3 object-contain pixelated shrink-0"
                        />
                        Metal Yield
                      </div>
                      <div className="text-xs font-pixel-heading text-amber-300 mt-1 uppercase">
                        {selectedMap.metalDensity}
                      </div>
                      <div className="text-xs font-pixel-body text-zinc-500">Deposit density</div>
                    </div>
                  </div>
                </div>

                {/* Tactical Briefing Narrative */}
                <div className="p-5 pixel-box space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-pixel-heading text-zinc-200 uppercase">
                    <span style={{ color: accentColor }}>▸</span>
                    <span>THEATER NARRATIVE & ENVIRONMENT</span>
                  </div>
                  <p className="text-base text-zinc-300 leading-relaxed font-pixel-body p-3 pixel-box-inset bg-black/40">
                    {selectedMap.tacticalBriefing}
                  </p>
                </div>

                {/* Choke Points Grid */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-pixel-heading text-zinc-300 uppercase">
                    <ShieldAlert className="size-3.5 text-amber-400" />
                    <span>CRITICAL CHOKES & TERRAIN ({selectedMap.chokePoints.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedMap.chokePoints.map((choke, idx) => (
                      <div
                        key={idx}
                        className="p-3 pixel-box flex items-start gap-2.5"
                      >
                        <div className="size-5 pixel-box-inset flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[9px] font-pixel-heading text-amber-400">
                            {idx + 1}
                          </span>
                        </div>
                        <div>
                          <div className="text-[10px] font-pixel-heading text-white">
                            {choke}
                          </div>
                          <div className="text-xs font-pixel-body text-zinc-400 mt-0.5">
                            Priority radar coverage & early warning boundary
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Strategies */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-pixel-heading text-zinc-300 uppercase">
                      <Crosshair className="size-3.5" style={{ color: accentColor }} />
                      <span>RECOMMENDED STRATEGIES</span>
                    </div>
                    <span className="text-xs font-pixel-body text-zinc-500">
                      Competitive meta analysis
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {(selectedMap.recommendedStrategies || selectedMap.recommendedDoctrines).map((strategyItem, idx) => {
                      const isFactionMatch =
                        strategyItem.faction === "both" ||
                        strategyItem.faction.toLowerCase() === faction.toLowerCase();

                      return (
                        <div
                          key={idx}
                          className={`p-4 pixel-box transition-none ${
                            isFactionMatch
                              ? isArmada ? "pixel-box-armada" : "pixel-box-cortex"
                              : "opacity-70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-pixel-heading text-white">
                                {strategyItem.name}
                              </span>
                              {isFactionMatch && (
                                <span className="pixel-box-inset px-2 py-0.5 text-[8px] font-pixel-heading" style={{ color: accentColor }}>
                                  OPTIMAL
                                </span>
                              )}
                            </div>

                            <span
                              className={`text-[8px] font-pixel-heading uppercase px-2 py-0.5 pixel-box-inset ${
                                strategyItem.faction === "armada"
                                  ? "text-[#449bed]"
                                  : strategyItem.faction === "cortex"
                                  ? "text-[#ff2244]"
                                  : "text-zinc-300"
                              }`}
                            >
                              {strategyItem.faction.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-base text-zinc-300 leading-relaxed font-pixel-body">
                            {strategyItem.description}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md pixel-box p-5 shadow-[6px_6px_0px_#000] space-y-4"
            >
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4" style={{ color: accentColor }} />
                  <h4 className="font-pixel-heading text-xs text-white uppercase tracking-wider">
                    GEMINI 1.5 PRO AI LINK
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-2 text-base font-pixel-body text-zinc-300">
                <p>
                  Link your Gemini API key to activate live reasoning with{" "}
                  <strong className="text-white font-pixel-heading text-[10px]">Gemini 1.5 Pro</strong>.
                </p>
                <p className="text-sm text-zinc-400">
                  Keys are stored exclusively in your local browser storage. If empty, the console
                  uses the built-in Grandmaster ruleset directly without configuration.
                </p>
                <div className="pt-2">
                  <Input
                    type="password"
                    placeholder="AIzaSy..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="font-pixel-body text-base pixel-box-inset text-white h-10"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t-2 border-black">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-pixel-body hover:underline flex items-center gap-1"
                  style={{ color: accentColor }}
                >
                  Get free API key <ExternalLink className="size-3" />
                </a>
                <div className="flex items-center gap-2">
                  {apiKey && (
                    <button
                      type="button"
                      onClick={clearApiKey}
                      className="pixel-btn text-[9px] py-1 px-3"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={saveApiKey}
                    className={`pixel-btn text-[9px] py-1 px-3 ${
                      isArmada ? "pixel-btn-armada" : "pixel-btn-cortex"
                    }`}
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Competitive Intelligence Modals */}
      <LiveBattlesModal
        isOpen={showBattlesModal}
        onClose={() => setShowBattlesModal(false)}
        accentColor={accentColor}
      />
      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        accentColor={accentColor}
      />
      <MatchHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        accentColor={accentColor}
        defaultMap={selectedMap?.name}
      />
      <PatchWatchModal
        isOpen={showPatchModal}
        onClose={() => setShowPatchModal(false)}
        accentColor={accentColor}
      />

      {/* Discord-Style In-Game Tactical Overlay */}
      <TacticalOverlay
        faction={faction}
        selectedMap={selectedMap}
        steps={parsedSteps}
        liveState={liveState}
        strategyTitle={currentStrategy?.title}
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
        accentColor={accentColor}
      />
    </div>
  );
}
