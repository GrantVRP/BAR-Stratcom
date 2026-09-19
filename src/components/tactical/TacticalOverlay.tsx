"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Minus,
  Maximize2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Compass,
  Wind,
  Layers,
  Check,
  Sparkles,
  Sliders,
  Move,
  Tv,
  Swords,
  ShieldAlert,
} from "lucide-react";
import { type Faction } from "@/lib/game-data";
import { type MapData } from "@/lib/map-data";
import { type ParsedBuildStep, parseBuildStep } from "@/lib/timeline-parser";
import { type LiveGameState } from "@/hooks/useLiveGame";
import { LiveLinkStatus } from "@/components/tactical/LiveLinkStatus";
import { BarIcon } from "@/components/tactical/BarIcon";
import { BattleIntelCards } from "@/components/tactical/BattleIntelCards";
import { useBarBalance } from "@/hooks/useBarBalance";

export interface TacticalOverlayProps {
  faction: Faction;
  selectedMap: MapData;
  steps: ParsedBuildStep[];
  liveState: LiveGameState | null;
  strategyTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
  className?: string;
}

// Built-in battle-tested opening presets for Armada & Cortex
interface PresetDefinition {
  title: string;
  badge: string;
  steps: string[];
}

const DEFAULT_PRESETS: Record<Faction, Record<string, PresetDefinition>> = {
  Armada: {
    bot_skirmish: {
      title: "Bot Skirmish (Standard Frontline)",
      badge: "BOT",
      steps: [
        "[00:00] Commander: 1x Solar Collector (Base power generation)",
        "[00:25] Commander: 2x Metal Extractor (Initial metal supply)",
        "[00:50] Commander: 1x Bot Lab (Infantry factory)",
        "[01:15] Commander: 1x Solar Collector (Power stabilizer)",
        "[01:35] Factory: 1x Pawn (Early radar scout)",
        "[01:50] Factory: 1x Construction Bot (Expansion builder)",
        "[02:10] Factory: 3x Rocko (Skirmish rocket artillery)",
        "[02:40] Constructor: 2x Metal Extractor (Perimeter mex expansion)",
        "[03:10] Constructor: 1x Light Laser Tower (Chokepoint defense)",
      ],
    },
    raider_rush: {
      title: "Raider Rush (Fast Vehicle Harass)",
      badge: "RAID",
      steps: [
        "[00:00] Commander: 1x Solar Collector (Fast power grid)",
        "[00:20] Commander: 2x Metal Extractor (Early metal stream)",
        "[00:45] Commander: 1x Vehicle Plant (Light vehicle factory)",
        "[01:05] Commander: 1x Solar Collector (Factory power reserve)",
        "[01:25] Factory: 2x Blitz (Rapid harassment raiders)",
        "[01:50] Factory: 1x Beaver (Con vehicle for expand)",
        "[02:15] Factory: 4x Flash (Fast assault tanks)",
        "[02:50] Constructor: 1x Light Laser Tower (Forward outpost)",
      ],
    },
    fast_eco: {
      title: "Fast Wind Eco & T2 Rush",
      badge: "ECO",
      steps: [
        "[00:00] Commander: 1x Solar Collector (Starting power)",
        "[00:20] Commander: 3x Metal Extractor (Base metal tri-mex)",
        "[00:45] Commander: 3x Wind Generator (Wind grid scaling)",
        "[01:15] Commander: 1x Bot Lab (Infantry & con production)",
        "[01:40] Factory: 2x Construction Bot (Dual eco expanders)",
        "[02:10] Constructor: 1x Energy Converter (Metal overdrive conversion)",
        "[02:45] Constructor: 1x Energy Storage (Wind spike buffer)",
        "[03:30] Factory: 1x Bot Lab (Secondary expansion lab)",
      ],
    },
  },
  Cortex: {
    bot_skirmish: {
      title: "Bot Skirmish (Standard Frontline)",
      badge: "BOT",
      steps: [
        "[00:00] Commander: 1x Solar Collector (Base power generation)",
        "[00:25] Commander: 2x Metal Extractor (Initial metal supply)",
        "[00:50] Commander: 1x Bot Lab (Infantry factory)",
        "[01:15] Commander: 1x Solar Collector (Power stabilizer)",
        "[01:35] Factory: 1x Grunt (Forward raider scout)",
        "[01:50] Factory: 1x Construction Bot (Expansion builder)",
        "[02:10] Factory: 3x Storm (Skirmish rocket artillery)",
        "[02:40] Constructor: 2x Metal Extractor (Perimeter mex expansion)",
        "[03:10] Constructor: 1x Light Laser Tower (Chokepoint defense)",
      ],
    },
    raider_rush: {
      title: "Raider Rush (Fast Vehicle Harass)",
      badge: "RAID",
      steps: [
        "[00:00] Commander: 1x Solar Collector (Fast power grid)",
        "[00:20] Commander: 2x Metal Extractor (Early metal stream)",
        "[00:45] Commander: 1x Vehicle Plant (Light vehicle factory)",
        "[01:05] Commander: 1x Solar Collector (Factory power reserve)",
        "[01:25] Factory: 2x Raider (Fast raiding tanks)",
        "[01:50] Factory: 1x Construction Vehicle (Con vehicle for expand)",
        "[02:15] Factory: 4x Stumpy (Medium assault tanks)",
        "[02:50] Constructor: 1x Light Laser Tower (Forward outpost)",
      ],
    },
    fast_eco: {
      title: "Fast Wind Eco & T2 Rush",
      badge: "ECO",
      steps: [
        "[00:00] Commander: 1x Solar Collector (Starting power)",
        "[00:20] Commander: 3x Metal Extractor (Base metal tri-mex)",
        "[00:45] Commander: 3x Wind Generator (Wind grid scaling)",
        "[01:15] Commander: 1x Bot Lab (Infantry & con production)",
        "[01:40] Factory: 2x Construction Bot (Dual eco expanders)",
        "[02:10] Constructor: 1x Energy Converter (Metal overdrive conversion)",
        "[02:45] Constructor: 1x Energy Storage (Wind spike buffer)",
        "[03:30] Factory: 1x Bot Lab (Secondary expansion lab)",
      ],
    },
  },
};

// Unit matching helpers for automatic in-game checkoff
function parseStepCount(countStr?: string): number {
  if (!countStr) return 1;
  const m = countStr.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

function normalizeUnitKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const UNIT_KEY_ALIASES: Record<string, string[]> = {
  solarcollector: ["solarcollector", "armsolar", "corsolar", "solar", "solar collector"],
  metalextractor: ["metalextractor", "armmex", "cormex", "mex", "metal extractor"],
  windgenerator: ["windgenerator", "windturbine", "armwin", "corwin", "wind", "wind generator"],
  botlab: ["botlab", "armlab", "corlab", "lab", "bot lab", "infantry factory"],
  vehicleplant: ["vehicleplant", "armvp", "corvp", "plant", "factory", "vehicle plant", "light vehicle factory"],
  aircraftplant: ["aircraftplant", "armap", "corap", "airplant", "air plant", "aircraft plant"],
  lightlasertower: ["lightlasertower", "lightlasertowerllt", "armllt", "corllt", "llt", "light laser tower", "laser tower"],
  pawn: ["pawn", "armpw", "pw"],
  grunt: ["grunt", "corak", "ak"],
  rocko: ["rocko", "armrock", "rock"],
  storm: ["storm", "corstorm"],
  flash: ["flash", "armflash"],
  blitz: ["blitz", "armblitz"],
  stumpy: ["stumpy", "corstump", "stump"],
  raider: ["raider", "corraider"],
  constructionbot: ["constructionbot", "armck", "corck", "conbot", "construction bot"],
  constructionvehicle: ["constructionvehicle", "armcv", "corcv", "convehicle", "beaver", "construction vehicle"],
  energyconverter: ["energyconverter", "armmakr", "cormakr", "converter", "energy converter"],
  energystorage: ["energystorage", "armestor", "corestor", "estor", "energy storage"],
  lazarus: ["lazarus", "armlatnk", "necro", "cornecro", "resurrection bot"],
  hound: ["hound", "armfido", "sheldon", "corsheld"],
  centurion: ["centurion", "sumo", "corsumo"],
  sharpshooter: ["sharpshooter", "armsnipe"],
  brawler: ["brawler", "armbraw"],
  blade: ["blade", "armblade"],
};

function getCompletedCountForUnit(
  itemName: string,
  completedUnits: Record<string, number>
): number {
  if (!itemName || !completedUnits) return 0;
  const norm = normalizeUnitKey(itemName);

  // Exact direct match
  if (completedUnits[itemName] !== undefined) return completedUnits[itemName];
  if (completedUnits[norm] !== undefined) return completedUnits[norm];

  // Normalized key match
  for (const [key, count] of Object.entries(completedUnits)) {
    if (normalizeUnitKey(key) === norm) {
      return count;
    }
  }

  // Alias lookup
  for (const [canon, aliases] of Object.entries(UNIT_KEY_ALIASES)) {
    const isTarget = norm === canon || aliases.some((a) => normalizeUnitKey(a) === norm || norm.includes(normalizeUnitKey(a)));
    if (isTarget) {
      for (const [key, count] of Object.entries(completedUnits)) {
        const keyNorm = normalizeUnitKey(key);
        if (keyNorm === canon || aliases.some((a) => normalizeUnitKey(a) === keyNorm || keyNorm.includes(normalizeUnitKey(a)))) {
          return count;
        }
      }
    }
  }
  return 0;
}

// Convert timestamp "[01:30]" to total seconds (90)
function parseTimeToSeconds(timestamp?: string): number {
  if (!timestamp) return 0;
  const match = timestamp.match(/\[?(\d+):(\d+)\]?/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function TacticalOverlay({
  faction,
  selectedMap,
  steps,
  liveState,
  strategyTitle = "Opening Strategy",
  isOpen,
  onClose,
  accentColor: customAccent,
  className = "",
}: TacticalOverlayProps) {
  const isArmada = faction === "Armada";
  const accentColor = customAccent || (isArmada ? "#449bed" : "#ff2244");

  // Overlay customization states
  const [opacity, setOpacity] = useState<number>(0.92);
  const [isMini, setIsMini] = useState<boolean>(false);
  const [corner, setCorner] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("top-right");
  const [audioAlerts, setAudioAlerts] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"INTEL" | "QUEUE" | "SPLIT">("INTEL");

  // Automated in-game step completion checking (enabled by default)
  const [autoCheckEnabled, setAutoCheckEnabled] = useState<boolean>(true);
  // Manual overrides for steps where user explicitly clicked to check or uncheck
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({});

  // Electron Desktop Environment detection & Pass-Through mode tracking
  const isElectron = typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);
  const [isClickThrough, setIsClickThrough] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI?.on) {
      window.electronAPI.on("click-through-changed", (enabled: boolean) => {
        setIsClickThrough(Boolean(enabled));
      });
    }
  }, []);

  // Active preset state: "custom" (if steps supplied), or "bot_skirmish", "raider_rush", "fast_eco"
  const [selectedPreset, setSelectedPreset] = useState<string>(
    steps && steps.length > 0 ? "custom" : "bot_skirmish"
  );

  // Live BAR Unit Balance Patch Checker
  const { findChangesForUnit } = useBarBalance(40);

  // If new steps are supplied dynamically (e.g. StratCom playbook generated)
  useEffect(() => {
    if (steps && steps.length > 0) {
      setSelectedPreset("custom");
    }
  }, [steps]);

  // In-Game Widget Reload Macro
  const [isReloadingGame, setIsReloadingGame] = useState<boolean>(false);
  const [reloadSuccess, setReloadSuccess] = useState<boolean>(false);

  const executeGameReloadMacro = async () => {
    try {
      setIsReloadingGame(true);
      setReloadSuccess(false);
      const res = await fetch("/api/overlay/macro-reload", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setReloadSuccess(true);
        setTimeout(() => setReloadSuccess(false), 4000);
      } else {
        console.warn("Macro error:", data.error);
      }
    } catch (e) {
      console.error("Macro failed:", e);
    } finally {
      setIsReloadingGame(false);
    }
  };

  // Reset manual overrides when switching presets
  const handleSelectPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    setManualOverrides({});
  };

  // Derive effective steps from active preset or custom steps
  const effectiveSteps = useMemo(() => {
    if (selectedPreset === "custom" && steps && steps.length > 0) {
      return steps;
    }
    const factionPresets = DEFAULT_PRESETS[faction] || DEFAULT_PRESETS.Armada;
    const presetKey = (selectedPreset in factionPresets ? selectedPreset : "bot_skirmish") as keyof typeof factionPresets;
    const preset = factionPresets[presetKey] || factionPresets.bot_skirmish;
    return preset.steps.map((s, idx) => parseBuildStep(s, idx, faction));
  }, [selectedPreset, steps, faction]);

  // Calculate cumulative required count for each step's item
  const cumulativeRequirements = useMemo(() => {
    const totals: Record<string, number> = {};
    return effectiveSteps.map((step) => {
      const norm = normalizeUnitKey(step.itemName || "unit");
      const stepCount = parseStepCount(step.count);
      totals[norm] = (totals[norm] || 0) + stepCount;
      return {
        normKey: norm,
        requiredCount: totals[norm],
      };
    });
  }, [effectiveSteps]);

  // Sync effective build order to Beyond All Reason in-game overlay
  useEffect(() => {
    if (!effectiveSteps || effectiveSteps.length === 0) return;
    const formattedSteps = effectiveSteps.map((s, idx) => {
      const req = cumulativeRequirements[idx];
      return {
        time: s.timestamp ? s.timestamp.replace(/\[|\]/g, "") : "00:00",
        builder: s.entityType || "Commander",
        unit: s.itemName || "Unit",
        count: parseStepCount(s.count),
        cumulative: req?.requiredCount || parseStepCount(s.count),
        note: s.explanation || "",
      };
    });

    const activeTitle =
      selectedPreset === "custom"
        ? strategyTitle
        : (DEFAULT_PRESETS[faction]?.[selectedPreset]?.title || strategyTitle);

    fetch("/api/overlay/sync-strategy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategyTitle: activeTitle,
        faction,
        steps: formattedSteps,
      }),
    }).catch(() => {});
  }, [effectiveSteps, faction, selectedPreset, strategyTitle, cumulativeRequirements]);

  // Parse steps with numerical seconds for live matching
  const stepsWithTime = useMemo(() => {
    return effectiveSteps.map((step, idx) => ({
      ...step,
      stepSeconds: parseTimeToSeconds(step.timestamp),
      idx,
    }));
  }, [effectiveSteps]);

  // Current match time from live memory bridge
  const currentSeconds = liveState?.gameStatus === "IN_GAME" ? liveState.gameTimeSeconds : 0;
  const completedUnits = liveState?.battleIntel?.completedUnits || {};
  const isLiveInGame = liveState?.gameStatus === "IN_GAME";

  // Evaluates whether a build step is finished in game strictly via live unit census
  const isStepCompletedInGame = (idx: number): boolean => {
    if (!isLiveInGame) return false;

    const step = stepsWithTime[idx];
    if (!step || !step.itemName) return false;

    // Direct unit telemetry check: ONLY check off if the game data proves it was built!
    const req = cumulativeRequirements[idx];
    if (req && completedUnits && Object.keys(completedUnits).length > 0) {
      const builtCount = getCompletedCountForUnit(step.itemName, completedUnits);
      if (builtCount >= req.requiredCount) {
        return true;
      }
    }

    // STRICT: If the unit has NOT been completed in the game, it is NOT checked off!
    return false;
  };

  // Effective checked status for a step
  const isStepChecked = (idx: number): boolean => {
    // Explicit manual click takes highest precedence
    if (manualOverrides[idx] !== undefined) {
      return manualOverrides[idx];
    }
    // Auto-check if enabled and completed in game
    if (autoCheckEnabled && isStepCompletedInGame(idx)) {
      return true;
    }
    return false;
  };

  // Toggle step completion (manual user action)
  const toggleStep = (idx: number) => {
    const current = isStepChecked(idx);
    setManualOverrides((prev) => ({
      ...prev,
      [idx]: !current,
    }));
  };

  // Identify active step and next upcoming step based strictly on in-game completion
  const { activeStepIndex, nextStep } = useMemo(() => {
    if (stepsWithTime.length === 0) return { activeStepIndex: 0, nextStep: null };

    // The active target to execute is the first step that is NOT completed in the game
    const firstUncheckedIdx = stepsWithTime.findIndex((s) => !isStepChecked(s.idx));
    const activeIdx = firstUncheckedIdx !== -1 ? firstUncheckedIdx : stepsWithTime.length - 1;
    const next = firstUncheckedIdx !== -1 ? stepsWithTime[firstUncheckedIdx] : null;

    return { activeStepIndex: activeIdx, nextStep: next };
  }, [stepsWithTime, autoCheckEnabled, manualOverrides, completedUnits, isLiveInGame]);

  // Next step countdown in seconds
  const secondsToNext = nextStep ? Math.max(0, nextStep.stepSeconds - currentSeconds) : 0;

  const [isLaunchingDesktop, setIsLaunchingDesktop] = useState(false);

  // Launch Native Electron Desktop Overlay (NVIDIA-Style, stays pinned on top of BAR)
  const launchDesktopOverlay = async () => {
    try {
      setIsLaunchingDesktop(true);
      const res = await fetch("/api/overlay/launch", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        // Fallback to PiP if desktop launcher fails
        launchPictureInPicture();
      }
    } catch {
      launchPictureInPicture();
    } finally {
      setIsLaunchingDesktop(false);
    }
  };

  // Launch Always-on-Top OS-Level Document Picture-in-Picture Window
  const launchPictureInPicture = async () => {
    if (typeof window !== "undefined" && "documentPictureInPicture" in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 390,
          height: 640,
        });

        // Ensure pipWindow body is solid dark - NEVER white
        pipWindow.document.body.style.backgroundColor = "#0a0c14";
        pipWindow.document.body.style.margin = "0";
        pipWindow.document.body.style.padding = "0";
        pipWindow.document.body.style.overflow = "hidden";
        pipWindow.document.body.style.colorScheme = "dark";

        // Copy all stylesheets from main document into PiP window
        document.querySelectorAll("link[rel='stylesheet'], style").forEach((elem) => {
          pipWindow.document.head.appendChild(elem.cloneNode(true));
        });

        // Add font definitions
        const fontLink = document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap";
        pipWindow.document.head.appendChild(fontLink);

        // Render standalone overlay container inside PiP window
        const pipRoot = pipWindow.document.createElement("div");
        pipRoot.className = "h-full w-full bg-[#0a0c14] text-zinc-100 font-pixel-body";
        pipRoot.style.backgroundColor = "#0a0c14";
        pipWindow.document.body.appendChild(pipRoot);

        // Open standalone route in PiP with dark canvas
        const iframe = pipWindow.document.createElement("iframe");
        iframe.src = "/overlay";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.style.backgroundColor = "#0a0c14";
        pipRoot.appendChild(iframe);

        return;
      } catch (err) {
        console.warn("Document PiP failed, falling back to window.open", err);
      }
    }

    // Fallback: window.open popup window
    window.open(
      "/overlay",
      "bar_overlay_window",
      "width=390,height=640,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  // Corner positioning coordinates
  const cornerClasses = {
    "top-right": "top-20 right-4",
    "top-left": "top-20 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  }[corner];

  if (!isOpen) return null;

  // =========================================================================
  // 1. MINIMIZED DISCORD PILL HUD (Compact Float)
  // =========================================================================
  if (isMini) {
    const enemyPush = liveState?.battleIntel?.enemyPush;
    const friendlyCount = liveState?.battleIntel?.friendlyUnitsCount;
    const enemyCount = liveState?.battleIntel?.enemyUnitsCount;

    return (
      <div
        className={`fixed ${cornerClasses} z-50 select-none`}
        style={{ opacity }}
      >
        <div
          onClick={() => setIsMini(false)}
          className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0a0d14]/95 border-2 rounded-none shadow-[2px_2px_0px_#000] cursor-pointer active:translate-y-0.5"
          style={{ borderColor: accentColor }}
        >
          {/* Faction Emblem */}
          <span className="size-2 rounded-none" style={{ backgroundColor: accentColor }} />
          
          <span
            className="text-[10px] font-pixel-heading font-bold uppercase"
            style={{ color: accentColor }}
          >
            {faction}
          </span>

          <span className="text-zinc-600">•</span>

          {/* Current Game Clock */}
          <span className="text-white font-pixel-heading text-[10px] tabular-nums">
            {liveState?.gameStatus === "IN_GAME" ? (
              `${String(Math.floor(currentSeconds / 60)).padStart(2, "0")}:${String(currentSeconds % 60).padStart(2, "0")}`
            ) : (
              "STANDBY"
            )}
          </span>

          <span className="text-zinc-600">•</span>

          {/* Dynamic Intel Alert / Push Warning or Next Action Ticker */}
          {enemyPush && isLiveInGame ? (
            <span className="text-red-400 font-pixel-heading text-[9px] line-clamp-1 max-w-[150px] animate-pulse">
              [PUSH]: {enemyPush.unitCount}x {enemyPush.unitType}
            </span>
          ) : (isLiveInGame && friendlyCount !== undefined && enemyCount !== undefined) ? (
            <span className="text-zinc-300 font-pixel-heading text-[9px] line-clamp-1 max-w-[150px] flex items-center gap-1">
              <span className="text-emerald-400 font-bold">{friendlyCount}U</span>
              <span className="text-zinc-500">vs</span>
              <span className="text-red-400 font-bold">~{enemyCount}U</span>
            </span>
          ) : (
            <span className="text-zinc-300 font-pixel-body text-xs line-clamp-1 max-w-[140px]">
              {liveState?.gameStatus === "IN_LOBBY" ? "LOBBY STAGING" : !liveState?.isRunning ? "ENGINE OFFLINE" : (nextStep ? `NEXT: ${nextStep.raw.replace(/^\[\d+:\d+\]\s*/, "")}` : "MACRO RUNWAY")}
            </span>
          )}

          {/* Expand Trigger */}
          <Maximize2 className="size-3 text-zinc-400 ml-1 hover:text-white" />

          {/* Close / Hide Trigger from Mini Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close / Hide Overlay (Esc or Alt+O to reopen)"
            className="p-0.5 text-zinc-500 hover:text-red-400 transition-none ml-1 cursor-pointer"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. EXPANDED DISCORD TACTICAL OVERLAY PANEL
  // =========================================================================
  return (
    <div
      className={`fixed ${cornerClasses} w-[360px] sm:w-[380px] max-w-[calc(100vw-24px)] z-50 select-none flex flex-col font-pixel-body shadow-[3px_3px_0px_#000] border-2 rounded-none ${className}`}
      style={{
        backgroundColor: "rgba(10, 12, 18, 0.95)",
        borderColor: accentColor,
        opacity,
      }}
    >
      {/* --- TOP DRAG HANDLE & DISCORD OVERLAY HEADER --- */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b border-zinc-800 bg-[#121520]/90 cursor-move"
        style={{ borderBottomColor: `${accentColor}40`, WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-1.5 min-w-0 mr-2 overflow-hidden">
          <Move className="size-3 text-zinc-500 shrink-0" />
          <div className="flex items-center gap-1 min-w-0">
            <span className="size-2 rounded-none shrink-0" style={{ backgroundColor: accentColor }} />
            <span
              className="font-pixel-heading text-[9px] font-bold uppercase shrink-0"
              style={{ color: accentColor }}
            >
              BAR
            </span>
            <span className="text-zinc-600 text-[8px] shrink-0">•</span>
            <span className="text-zinc-400 font-pixel-heading text-[8px] truncate max-w-[80px]">
              {selectedMap.name}
            </span>
          </div>
        </div>

        {/* Top Action Controls: Desktop Overlay, PiP, Corner, Minimize, Close */}
        <div className="flex items-center gap-1 shrink-0 text-zinc-400" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {/* Native Desktop Mode: Click-Through / Ghost Mode Toggle */}
          {isElectron && (
            <button
              type="button"
              onClick={() => window.electronAPI?.toggleClickThrough?.()}
              title="Toggle Click-Through Ghost Mode [Ctrl+Shift+T or Alt+T]: Mouse clicks pass directly to Beyond All Reason!"
              className={`px-1.5 py-0.5 border rounded-none transition-none active:translate-y-0.5 text-[8px] font-pixel-heading flex items-center gap-1 cursor-pointer ${
                isClickThrough
                  ? "bg-purple-950/90 border-purple-400 text-purple-200"
                  : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white"
              }`}
            >
              <span className={`size-1.5 rounded-none ${isClickThrough ? "bg-purple-400 arcade-blink" : "bg-zinc-500"}`} />
              <span>{isClickThrough ? "GHOST: ON" : "GHOST"}</span>
            </button>
          )}
          {/* 1-Click In-Game Macro: Activates BAR and sends /clear & /luaui reload */}
          <button
            type="button"
            onClick={executeGameReloadMacro}
            disabled={isReloadingGame}
            title="1-Click In-Game Macro: Automatically switches to Beyond All Reason and inputs /luaui reload to activate the in-game HUD!"
            className="px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-500/80 text-cyan-300 hover:bg-cyan-900/90 rounded-none transition-none active:translate-y-0.5 text-[8.5px] font-pixel-heading flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className={`size-2.5 ${isReloadingGame ? "animate-spin text-cyan-400" : reloadSuccess ? "text-emerald-400" : "text-cyan-400"}`} />
            <span>{isReloadingGame ? "RELOADING..." : reloadSuccess ? "ACTIVE! ✓" : "⚡ BAR HUD"}</span>
          </button>

          {!isElectron && (
            /* Browser Mode: Native Desktop Overlay Launcher */
            <button
              type="button"
              onClick={launchDesktopOverlay}
              disabled={isLaunchingDesktop}
              title="Launch Native Always-On-Top Game Overlay (NVIDIA Broadcast Style: Stays pinned above Beyond All Reason even when clicking the game!)"
              className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/90 rounded-none transition-none active:translate-y-0.5 text-[8.5px] font-pixel-heading flex items-center gap-1 cursor-pointer"
            >
              <span className={`size-1.5 rounded-none bg-emerald-400 ${isLaunchingDesktop ? "animate-spin" : "arcade-blink"}`} />
              <span>NVIDIA OVERLAY</span>
            </button>
          )}

          {/* Browser Mode: PiP Launcher */}
          {!isElectron && (
            <button
              type="button"
              onClick={launchPictureInPicture}
              title="Pop out Always-on-Top Picture-in-Picture window (Hovers over game)"
              className="p-1 hover:text-white hover:bg-zinc-800 rounded-none transition-none active:translate-y-0.5 cursor-pointer"
            >
              <ExternalLink className="size-3.5" />
            </button>
          )}

          {/* Browser Mode: Corner Cycle Selector */}
          {!isElectron && (
            <button
              type="button"
              onClick={() => {
                const corners: ("top-left" | "top-right" | "bottom-right" | "bottom-left")[] = [
                  "top-right",
                  "bottom-right",
                  "bottom-left",
                  "top-left",
                ];
                const nextIdx = (corners.indexOf(corner) + 1) % corners.length;
                setCorner(corners[nextIdx]);
              }}
              title={`Pin corner: Currently ${corner}`}
              className="p-1 hover:text-white hover:bg-zinc-800 rounded-none transition-none active:translate-y-0.5 text-[9px] font-pixel-heading"
            >
              {corner === "top-right" ? "TR" : corner === "top-left" ? "TL" : corner === "bottom-right" ? "BR" : "BL"}
            </button>
          )}

          {/* Minimize / Hide Electron Window */}
          {isElectron && (
            <button
              type="button"
              onClick={() => window.electronAPI?.minimize?.()}
              title="Minimize to Windows Taskbar"
              className="p-1 hover:text-white hover:bg-zinc-800 rounded-none transition-none active:translate-y-0.5 cursor-pointer"
            >
              <Minus className="size-3.5" />
            </button>
          )}

          {/* Collapse to Mini HUD Pill */}
          <button
            type="button"
            onClick={() => setIsMini(true)}
            title="Collapse to Mini HUD Pill"
            className="p-1 hover:text-white hover:bg-zinc-800 rounded-none transition-none active:translate-y-0.5 cursor-pointer"
          >
            <span className="text-[7.5px] font-pixel-heading px-1 border border-zinc-700 bg-zinc-900 text-zinc-300">HUD</span>
          </button>

          {/* Unmistakable 1-Click Hide Button */}
          <button
            type="button"
            onClick={onClose}
            title="Toggle / Hide Overlay (Press F8 or Insert to toggle anytime)"
            className="px-1.5 py-0.5 bg-red-950/80 border border-red-500/80 text-red-300 hover:bg-red-900 rounded-none transition-none active:translate-y-0.5 cursor-pointer text-[8px] font-pixel-heading flex items-center gap-1"
          >
            <X className="size-2.5" />
            <span>HIDE [F8]</span>
          </button>
        </div>
      </div>

      {/* --- TELEMETRY SUB-HEADER (Faction, Link, Wind Speed) --- */}
      <div className="px-3 py-2 bg-[#0d0f17] border-b border-zinc-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Live Link Badge */}
          <LiveLinkStatus
            liveState={liveState}
            faction={faction}
            accentColor={accentColor}
          />
        </div>

        {/* Live Wind Speed Readout */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#141622] border border-zinc-700/80 text-[10px] font-pixel-heading">
          <Wind className="size-2.5 text-[#449bed]" />
          <span className="text-zinc-400">WIND:</span>
          <span className="text-zinc-100 font-bold">{selectedMap.wind.avg} <span className="text-[8px] text-zinc-500">M/S</span></span>
        </div>
      </div>

      {/* --- TACTICAL VIEW NAVIGATION TABS --- */}
      <div className="flex items-center border-b border-zinc-800 bg-[#0d0f17] text-[8.5px] font-pixel-heading">
        <button
          type="button"
          onClick={() => setActiveTab("INTEL")}
          className={`flex-1 py-1.5 px-2 text-center transition-none flex items-center justify-center gap-1.5 border-b-2 ${
            activeTab === "INTEL"
              ? "bg-[#141824] font-bold"
              : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/40"
          }`}
          style={activeTab === "INTEL" ? { borderColor: accentColor, color: accentColor } : {}}
        >
          <Tv className="size-3" />
          <span>INTEL FEEDS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("QUEUE")}
          className={`flex-1 py-1.5 px-2 text-center transition-none flex items-center justify-center gap-1.5 border-b-2 ${
            activeTab === "QUEUE"
              ? "bg-[#142033] font-bold"
              : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/40"
          }`}
          style={activeTab === "QUEUE" ? { borderColor: accentColor, color: accentColor } : {}}
        >
          <Layers className="size-3" />
          <span>BUILD QUEUE</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SPLIT")}
          className={`flex-1 py-1.5 px-2 text-center transition-none flex items-center justify-center gap-1.5 border-b-2 ${
            activeTab === "SPLIT"
              ? "bg-[#141824] font-bold"
              : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/40"
          }`}
          style={activeTab === "SPLIT" ? { borderColor: accentColor, color: accentColor } : {}}
        >
          <Sparkles className="size-3" />
          <span>SPLIT</span>
        </button>
      </div>

      {/* --- VIEW 1: INTEL STREAM FEEDS --- */}
      {activeTab === "INTEL" && (
        <div className="p-2 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          <BattleIntelCards
            faction={faction}
            gameStatus={liveState?.gameStatus ?? "OFFLINE"}
            battleIntel={liveState?.gameStatus === "IN_GAME" ? liveState?.battleIntel : undefined}
            accentColor={accentColor}
            lobbyName={liveState?.lobbyName}
            mapName={liveState?.mapName || selectedMap?.name}
          />
        </div>
      )}

      {/* --- VIEW 2: BUILD ORDER QUEUE --- */}
      {activeTab === "QUEUE" && (
        <>
          {/* Preset Selector & Auto-Check Bar */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0b0e16] border-b border-zinc-800 text-[8px] font-pixel-heading overflow-x-auto custom-scrollbar">
            <span className="text-zinc-400 shrink-0 uppercase">Preset:</span>
            {steps.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectPreset("custom")}
                className={`px-2 py-0.5 rounded-none border transition-none active:translate-y-0.5 shrink-0 flex items-center gap-1 ${
                  selectedPreset === "custom"
                    ? "bg-[#142033] border-[#449bed] text-white"
                    : "bg-black/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
                style={selectedPreset === "custom" ? { borderColor: accentColor, color: accentColor } : {}}
              >
                <span>[ACTIVE: {steps.length}]</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelectPreset("bot_skirmish")}
              className={`px-2 py-0.5 rounded-none border transition-none active:translate-y-0.5 shrink-0 flex items-center gap-1 ${
                selectedPreset === "bot_skirmish"
                  ? "bg-[#142033] border-[#449bed] text-white"
                  : "bg-black/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              style={selectedPreset === "bot_skirmish" ? { borderColor: accentColor, color: accentColor } : {}}
            >
              <span>[BOT]</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("raider_rush")}
              className={`px-2 py-0.5 rounded-none border transition-none active:translate-y-0.5 shrink-0 flex items-center gap-1 ${
                selectedPreset === "raider_rush"
                  ? "bg-[#142033] border-[#449bed] text-white"
                  : "bg-black/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              style={selectedPreset === "raider_rush" ? { borderColor: accentColor, color: accentColor } : {}}
            >
              <span>[RAID]</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("fast_eco")}
              className={`px-2 py-0.5 rounded-none border transition-none active:translate-y-0.5 shrink-0 flex items-center gap-1 ${
                selectedPreset === "fast_eco"
                  ? "bg-[#142033] border-[#449bed] text-white"
                  : "bg-black/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
              style={selectedPreset === "fast_eco" ? { borderColor: accentColor, color: accentColor } : {}}
            >
              <span>[ECO]</span>
            </button>

            <span className="text-zinc-700 mx-0.5">|</span>

            {/* In-Game Auto-Check Toggle */}
            <button
              type="button"
              onClick={() => setAutoCheckEnabled((prev) => !prev)}
              title={autoCheckEnabled ? "Auto-check enabled: Items check off automatically when built in-game" : "Auto-check disabled"}
              className={`px-2 py-0.5 rounded-none border transition-none active:translate-y-0.5 shrink-0 flex items-center gap-1 font-bold ${
                autoCheckEnabled
                  ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                  : "bg-black/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className={`size-1.5 rounded-none ${autoCheckEnabled ? "bg-emerald-400 arcade-blink" : "bg-zinc-600"}`} />
              <span>AUTO: {autoCheckEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Active Step Prompt & Countdown Banner */}
          {nextStep && (
            <div
              className="p-2.5 bg-[#141824] border-b border-zinc-800 flex items-center justify-between gap-2"
              style={{ borderLeft: `3px solid ${accentColor}` }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[8px] font-pixel-heading uppercase text-zinc-400 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-none arcade-blink" style={{ backgroundColor: accentColor }} />
                  UPCOMING AT {nextStep.timestamp}:
                </div>
                <div className="text-xs font-pixel-heading text-white truncate mt-0.5">
                  {nextStep.raw.replace(/^\[\d+:\d+\]\s*/, "")}
                </div>
              </div>

              {secondsToNext > 0 && (
                <div className="text-right shrink-0">
                  <div className="text-[8px] font-pixel-heading text-zinc-500 uppercase">IN</div>
                  <div
                    className="text-xs font-pixel-heading font-bold tabular-nums"
                    style={{ color: accentColor }}
                  >
                    {secondsToNext}s
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scrollable Build Order Queue */}
          <div className="p-2 max-h-[calc(100vh-210px)] min-h-[140px] overflow-y-auto space-y-1 text-xs custom-scrollbar">
            {effectiveSteps.length === 0 ? (
              <div className="p-4 text-center text-zinc-400 font-pixel-heading text-[10px]">
                NO ACTIVE BUILD ORDER DETECTED.
                <div className="text-zinc-300 text-xs mt-1 font-pixel-body">
                  Select a preset above to load an opening build queue.
                </div>
              </div>
            ) : (
              stepsWithTime.map((step, idx) => {
                const isDone = isStepChecked(idx);
                const isAutoDone = autoCheckEnabled && isStepCompletedInGame(idx) && manualOverrides[idx] === undefined;
                const isActive = idx === activeStepIndex;

                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`p-2 border transition-none cursor-pointer flex items-center justify-between gap-2 ${
                      isActive && !isDone
                        ? "bg-[#142033] border-[#449bed] text-white shadow-[1px_1px_0px_#000]"
                        : isDone
                        ? "bg-[#0b0d14] border-zinc-800/80 text-zinc-400 opacity-60"
                        : "bg-[#0e1018] border-zinc-800 text-zinc-200 hover:border-zinc-700"
                    }`}
                    style={isActive && !isDone ? { borderColor: accentColor } : undefined}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Step Completion Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStep(idx);
                        }}
                        className={`size-4 border rounded-none flex items-center justify-center shrink-0 ${
                          isDone
                            ? "bg-emerald-950 border-emerald-500 text-emerald-400"
                            : isActive
                            ? "border-[#449bed] bg-[#0c1626]"
                            : "border-zinc-700 bg-zinc-900"
                        }`}
                      >
                        {isDone && <Check className="size-3" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-pixel-heading text-[9px] text-zinc-400">
                            {step.timestamp}
                          </span>
                          {step.itemName && (
                            <BarIcon name={step.itemName} faction={faction} className="size-3.5 shrink-0" size={14} />
                          )}
                          {isAutoDone && (
                            <span className="text-[7.5px] px-1 py-0.2 rounded-none bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold font-pixel-heading">
                              ✓ IN-GAME
                            </span>
                          )}
                          {(() => {
                            const patches = step.itemName ? findChangesForUnit(step.itemName) : [];
                            if (patches.length === 0) return null;
                            return (
                              <span
                                className="text-[7px] px-1 py-0.2 rounded-none bg-amber-950/80 text-amber-300 border border-amber-600/70 font-bold font-pixel-heading cursor-help shrink-0"
                                title={`Recent Balance Adjustment (${patches[0].date?.substring(0, 10) || "Patch"}): ${patches[0].message}`}
                              >
                                PATCH
                              </span>
                            );
                          })()}
                        </div>
                        <div className={`font-pixel-body text-xs line-clamp-1 ${isDone ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                          {step.raw.replace(/^\[\d+:\d+\]\s*/, "")}
                        </div>
                      </div>
                    </div>

                    {/* Resource Cost Badges (Metal & Energy icons) */}
                    <div className="flex items-center gap-1.5 shrink-0 font-pixel-heading text-[8px]">
                      {step.energyDelta && (
                        <span className="px-1.5 py-0.5 bg-black/60 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                          <img src="/energy.png" alt="E" className="size-2.5 object-contain pixelated shrink-0 inline-block" />
                          {step.energyDelta}
                        </span>
                      )}
                      {step.metalDelta && (
                        <span className="px-1.5 py-0.5 bg-black/60 border border-zinc-700 text-zinc-300 flex items-center gap-1">
                          <img src="/metal.png" alt="M" className="size-2.5 object-contain pixelated shrink-0 inline-block" />
                          {step.metalDelta}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* --- VIEW 3: SPLIT VIEW (INTEL + QUEUE) --- */}
      {activeTab === "SPLIT" && (
        <div className="p-2 overflow-y-auto max-h-[calc(100vh-140px)] space-y-2.5 custom-scrollbar">
          <BattleIntelCards
            faction={faction}
            gameStatus={liveState?.gameStatus ?? "OFFLINE"}
            battleIntel={liveState?.gameStatus === "IN_GAME" ? liveState?.battleIntel : undefined}
            accentColor={accentColor}
            lobbyName={liveState?.lobbyName}
            mapName={liveState?.mapName || selectedMap?.name}
          />

          <div className="border-t border-zinc-800 pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-[8.5px] font-pixel-heading text-zinc-400 px-1">
              <span className="flex items-center gap-1">
                <Layers className="size-2.5 text-zinc-500" />
                BUILD QUEUE ({effectiveSteps.length} STEPS)
              </span>
              {nextStep && (
                <span className="text-amber-400 font-bold">
                  NEXT: {nextStep.timestamp} ({secondsToNext}s)
                </span>
              )}
            </div>

            <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
              {effectiveSteps.length === 0 ? (
                <div className="p-2 text-center text-zinc-500 font-pixel-heading text-[8px]">
                  NO ACTIVE BUILD ORDER DETECTED.
                </div>
              ) : (
                stepsWithTime.map((step, idx) => {
                  const isDone = isStepChecked(idx);
                  const isAutoDone = autoCheckEnabled && isStepCompletedInGame(idx) && manualOverrides[idx] === undefined;
                  const isActive = idx === activeStepIndex;

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className={`p-1.5 border transition-none cursor-pointer flex items-center justify-between gap-1.5 text-xs ${
                        isActive && !isDone
                          ? "bg-[#142033] border-[#449bed] text-white"
                          : isDone
                          ? "bg-[#0b0d14] border-zinc-800/80 text-zinc-500 opacity-60"
                          : "bg-[#0e1018] border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                      style={isActive && !isDone ? { borderColor: accentColor } : undefined}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStep(idx);
                          }}
                          className={`size-3.5 border rounded-none flex items-center justify-center shrink-0 ${
                            isDone
                              ? "bg-emerald-950 border-emerald-500 text-emerald-400"
                              : isActive
                              ? "border-[#449bed] bg-[#0c1626]"
                              : "border-zinc-700 bg-zinc-900"
                          }`}
                        >
                          {isDone && <Check className="size-2.5" />}
                        </button>
                        <span className="font-pixel-heading text-[8px] text-zinc-400 shrink-0">
                          {step.timestamp}
                        </span>
                        {isAutoDone && (
                          <span className="text-[7px] px-1 py-0.1 rounded-none bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold font-pixel-heading">
                            ✓
                          </span>
                        )}
                        {step.itemName && findChangesForUnit(step.itemName).length > 0 && (
                          <span
                            className="text-[6.5px] px-0.5 rounded-none bg-amber-950 text-amber-300 border border-amber-600/70 font-bold font-pixel-heading shrink-0 cursor-help"
                            title={`Recent Balance Adjustment: ${findChangesForUnit(step.itemName)[0].message}`}
                          >
                            P
                          </span>
                        )}
                        <span className={`font-pixel-body text-[11px] line-clamp-1 ${isDone ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                          {step.raw.replace(/^\[\d+:\d+\]\s*/, "")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- BOTTOM CONTROLS & OPACITY ADJUSTER --- */}
      <div className="p-2 border-t border-zinc-800/80 bg-[#0c0e16] flex items-center justify-between text-[9px] font-pixel-heading text-zinc-400">
        <div className="flex items-center gap-2">
          <Sliders className="size-3 text-zinc-500" />
          <span>OPACITY:</span>
          {[0.5, 0.75, 0.92, 1.0].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setOpacity(val)}
              className={`px-1 py-0.5 border text-[8px] ${
                opacity === val
                  ? "bg-zinc-700 text-white border-zinc-500"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {Math.round(val * 100)}%
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 font-pixel-heading text-[8px]">
          <button
            type="button"
            onClick={onClose}
            title="Hide Overlay (Press F8 or Insert to toggle anytime)"
            className="px-1.5 py-0.5 bg-red-950/60 border border-red-800 text-red-300 hover:bg-red-900/80 transition-none active:translate-y-0.5 cursor-pointer flex items-center gap-1"
          >
            <span>✕ HIDE [F8 / INSERT]</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TacticalOverlay;
