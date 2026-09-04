"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useObject } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Clock,
  Layers,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Zap,
  Crosshair,
  Compass,
  Cpu,
  RefreshCw,
  SquareSquare,
  Activity,
  Terminal,
  Target,
  KeyRound,
  ExternalLink,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildPlanResponseSchema, type Faction } from "@/lib/game-data";

// Map Presets with rich tactical data
const MAP_PRESETS = [
  {
    id: "small-land",
    name: "Small Land / Chokepoints",
    examples: "Red Comet, Altair Crossing, Comet Catcher",
    description: "High early conflict density. Fast raiders and skirmishers hold choke points.",
    windType: "MODERATE (8-18)",
    terrainTag: "CHOKE-DENSE",
  },
  {
    id: "open-fields",
    name: "Open Plains / High Wind",
    examples: "Open Metal, SpeedMetal, Plains of Hope",
    description: "Vast open expanses. Extremely cost-effective for Wind Generators and tank flanking.",
    windType: "HIGH WIND (12-28)",
    terrainTag: "OPEN-FLANK",
  },
  {
    id: "mountain-hills",
    name: "Mountain / High Altitude",
    examples: "Supreme Strait, Tangerine, High Ground",
    description: "Vertical sightlines. Spider bots and high-arc artillery dominate elevated terrain.",
    windType: "LOW-MOD (4-14)",
    terrainTag: "ELEVATION-BIAS",
  },
  {
    id: "water-coastal",
    name: "Coastal & Island Warfare",
    examples: "DSD Shorelines, Coast to Coast, Shore to Shore",
    description: "Dual-domain logistics. Early sea scout harassment or hovercraft air dominance.",
    windType: "STABLE (10-20)",
    terrainTag: "AMPHIBIOUS",
  },
  {
    id: "large-team",
    name: "Large Team 8v8 (Frontline/Eco)",
    examples: "All That Glitters, Ishtir, Bismuth Valley",
    description: "Specialized roles. Lane holding raiders versus dedicated backline fusion rushers.",
    windType: "VARIABLE (6-22)",
    terrainTag: "SCALE-MACRO",
  },
];

// Strategy Presets with tactical tags
const STRATEGY_PRESETS = [
  {
    id: "early-tank-rush",
    title: "Early Tank Raider Rush",
    tag: "AGGRESSION // T1",
    description: "Fast Vehicle Factory at 1:15. Push 4-6 Flash/Blitz into enemy metal nodes by 2:45.",
    timingWindow: "02:30 - 03:45",
    icon: Crosshair,
  },
  {
    id: "fast-eco",
    title: "Fast Eco & Tech Rush",
    tag: "MACRO-GREED // T2",
    description: "Wind/Solar greed, commander nanolathe assist, push T2 lab by 7:00-8:00.",
    timingWindow: "07:00 - 08:30",
    icon: Zap,
  },
  {
    id: "bot-swarm-choke",
    title: "Bot Skirmish & LLT Creep",
    tag: "CONTROL // SKIRMISH",
    description: "Rocko/Storm rocket bot poke with Light Laser Towers locking down vital chokes.",
    timingWindow: "03:15 - 05:00",
    icon: Layers,
  },
  {
    id: "air-opening",
    title: "Air Opening & Surgical Harass",
    tag: "SURGICAL // AIR",
    description: "Fast Air Plant into Banshee/Tornado gunships to assassinate unescorted builders.",
    timingWindow: "03:30 - 04:45",
    icon: Compass,
  },
  {
    id: "heavy-turtle",
    title: "Fortified Turtle into T2/T3 Armor",
    tag: "DEFENSE // ARMOR",
    description: "Defend early mexes with LLT, bank economy for Bulldog or Goliath heavy armor.",
    timingWindow: "09:00 - 11:30",
    icon: Target,
  },
];

export default function BeyondAllReasonDashboard() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [faction, setFaction] = useState<Faction>("Armada");
  const [mapType, setMapType] = useState<string>("Small Land / Chokepoints (Red Comet, Altair Crossing)");
  const [strategyStyle, setStrategyStyle] = useState<string>("Early Tank Raider Rush (Fast Flash/Blitz raid at 2:30)");
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("buildOrder");

  // API Key management state
  const [apiKey, setApiKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("bar_gemini_api_key");
    if (saved) {
      setApiKey(saved);
      setKeyInput(saved);
    }
  }, []);

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

  // Vercel AI SDK useObject pointing to /api/generate-build
  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/generate-build",
    schema: buildPlanResponseSchema,
    onError: (err) => {
      console.error("AI SDK Stream Error:", err);
    },
  });

  const handleGenerate = () => {
    submit({
      faction,
      mapType,
      strategyStyle,
      apiKey: apiKey || undefined,
    });
    setActiveTab("buildOrder");
  };

  const handleCopy = () => {
    if (!object) return;
    const text = [
      `=== BEYOND ALL REASON STRATCOM DOSSIER: ${faction.toUpperCase()} ===`,
      `Theater: ${mapType}`,
      `Doctrine: ${strategyStyle}`,
      "",
      "--- [01] OPENING BUILD QUEUE ---",
      ...(object.openingBuildOrder || []).map((step, idx) => `[STEP ${idx + 1}] ${step}`),
      "",
      "--- [02] TARGET UNIT COMPOSITION ---",
      ...(object.unitComposition || []).map((u) => `• ${u}`),
      "",
      "--- [03] TIMING & ECONOMY TELEMETRY ---",
      object.strategyNotes || "",
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isArmada = faction === "Armada";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-600 selection:text-white font-sans relative overflow-x-hidden">
      {/* Background Military Grid & Scanline Ambience */}
      <div
        className={`fixed inset-0 pointer-events-none transition-all duration-700 ${
          isArmada
            ? "bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.18),transparent)]"
            : "bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(220,38,38,0.18),transparent)]"
        }`}
      />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,#000_60%,transparent_100%)] opacity-30" />

      {/* Top Telemetry Ticker Bar */}
      <div className="relative z-20 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur px-4 py-1.5 text-[11px] font-mono text-zinc-400 flex items-center justify-between overflow-x-auto gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-300 font-semibold">SYS.STATUS: OPERATIONAL</span>
          </div>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">DEFCON:</span>
          <span className={isArmada ? "text-blue-400 font-bold" : "text-red-400 font-bold"}>ALPHA-1</span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">GRID:</span>
          <span className="text-zinc-300">44°12&apos;N 88°21&apos;W</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* API Key Status / Configuration Toggle */}
          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 transition-colors text-[10px] font-mono"
          >
            <KeyRound className={`size-3 ${isArmada ? "text-blue-400" : "text-red-400"}`} />
            <span>AI LINK:</span>
            {apiKey ? (
              <span className="text-emerald-400 font-bold">GEMINI 1.5 PRO LINKED</span>
            ) : (
              <span className={isArmada ? "text-blue-300 font-medium" : "text-red-300 font-medium"}>
                TACTICAL ENGINE (ADD KEY)
              </span>
            )}
          </button>

          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">DATA GROUNDING:</span>
          <span className="text-emerald-400 font-semibold">BAR STRICT</span>
        </div>
      </div>

      {/* API Key Modal Dialog */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className={`size-4 ${isArmada ? "text-blue-400" : "text-red-400"}`} />
                  <h4 className="font-mono text-sm font-bold text-zinc-100 uppercase tracking-wider">
                    Google Gemini API Key
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

              <div className="space-y-2 text-xs font-mono text-zinc-300">
                <p>
                  Connect your Google Gemini API key to activate live reasoning with <strong>Gemini 1.5 Pro</strong>.
                </p>
                <p className="text-[11px] text-zinc-400">
                  Your key is stored securely in your browser and used exclusively for streaming build order requests.
                </p>
                <div className="pt-2">
                  <Input
                    type="password"
                    placeholder="AIzaSy..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="font-mono text-xs bg-zinc-950 border-zinc-700 text-zinc-100 focus-visible:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[11px] font-mono hover:underline flex items-center gap-1 ${
                    isArmada ? "text-blue-400" : "text-red-400"
                  }`}
                >
                  Get free key <ExternalLink className="size-3" />
                </a>
                <div className="flex items-center gap-2">
                  {apiKey && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearApiKey}
                      className="font-mono text-xs border-zinc-700 text-zinc-400"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveApiKey}
                    className={`font-mono text-xs text-white font-bold ${
                      isArmada
                        ? "bg-blue-600 hover:bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                        : "bg-red-600 hover:bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                    }`}
                  >
                    Save Key
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Tactical Command Header */}
      <header className="relative z-10 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Faction Emblem in Header */}
            <div className={`relative p-2 rounded-lg border transition-all size-12 flex items-center justify-center ${
              isArmada
                ? "border-blue-500/50 bg-blue-950/40 shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                : "border-red-500/50 bg-red-950/40 shadow-[0_0_20px_rgba(239,68,68,0.35)]"
            }`}>
              {isArmada ? (
                <Image
                  src="/armada-logo.png"
                  alt="Armada Emblem"
                  width={34}
                  height={34}
                  className="object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]"
                />
              ) : (
                <Image
                  src="/cortex-logo.png"
                  alt="Cortex Emblem"
                  width={34}
                  height={34}
                  className="object-contain drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                />
              )}
              <div className={`absolute -top-1 -right-1 size-2 rounded-full ring-2 ring-zinc-950 ${isArmada ? "bg-blue-400" : "bg-red-400"}`} />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black tracking-widest uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400">
                  BAR STRATCOM // TACTICAL ADVISOR
                </h1>
                <Badge
                  variant="outline"
                  className={`text-[10px] tracking-wider uppercase font-mono ${
                    isArmada
                      ? "border-blue-500/50 text-blue-400 bg-blue-950/30"
                      : "border-red-500/50 text-red-400 bg-red-950/30"
                  }`}
                >
                  ACTIVE HUD
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 font-mono tracking-tight flex items-center gap-2 mt-0.5">
                <span>BEYOND ALL REASON</span>
                <span className="text-zinc-600">•</span>
                <span>TOURNAMENT BUILD GENERATOR</span>
                <span className="text-zinc-600">•</span>
                <span className={isArmada ? "text-blue-400 font-semibold" : "text-red-400 font-semibold"}>
                  {faction.toUpperCase()} ACTIVE
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLoading && (
              <Button
                variant="destructive"
                size="sm"
                onClick={stop}
                className="font-mono text-xs gap-1.5 h-8 border border-red-500/40 bg-red-950/60 hover:bg-red-900/80 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
              >
                <SquareSquare className="size-3.5" />
                ABORT TRANSMISSION
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: 2-Column RTS Dashboard */}
      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: MULTI-STEP FORM WIZARD (5 cols on lg)       */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative rounded-lg border border-zinc-800 bg-zinc-900/90 backdrop-blur-md shadow-2xl overflow-hidden">
              {/* Tactical Corner Brackets */}
              <div className={`absolute top-0 left-0 size-2.5 border-t-2 border-l-2 z-20 pointer-events-none ${isArmada ? "border-blue-500/90" : "border-red-500/90"}`} />
              <div className={`absolute top-0 right-0 size-2.5 border-t-2 border-r-2 z-20 pointer-events-none ${isArmada ? "border-blue-500/90" : "border-red-500/90"}`} />
              <div className={`absolute bottom-0 left-0 size-2.5 border-b-2 border-l-2 z-20 pointer-events-none ${isArmada ? "border-blue-500/90" : "border-red-500/90"}`} />
              <div className={`absolute bottom-0 right-0 size-2.5 border-b-2 border-r-2 z-20 pointer-events-none ${isArmada ? "border-blue-500/90" : "border-red-500/90"}`} />

              {/* Wizard Step Progression Bar */}
              <div className="border-b border-zinc-800 bg-zinc-950/70 p-2.5 px-3">
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                  {[
                    { step: 1, label: "01 // FACTION" },
                    { step: 2, label: "02 // THEATER" },
                    { step: 3, label: "03 // DOCTRINE" },
                  ].map((item) => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setCurrentStep(item.step)}
                      className={`relative flex items-center justify-center gap-1.5 py-1.5 rounded transition-all font-semibold ${
                        currentStep === item.step
                          ? isArmada
                            ? "bg-blue-950/80 text-blue-300 border border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                            : "bg-red-950/80 text-red-300 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                          : currentStep > item.step
                          ? "text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 border border-emerald-500/30"
                          : "text-zinc-500 hover:text-zinc-400 bg-zinc-950/40 border border-transparent"
                      }`}
                    >
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step Header */}
              <div className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                    <Terminal className="size-3.5 text-zinc-500" />
                    <span>COMMAND PROTOCOL // STEP {currentStep} OF 3</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[9px] uppercase tracking-wider ${
                      isArmada
                        ? "border-blue-500/50 text-blue-400 bg-blue-950/30"
                        : "border-red-500/50 text-red-400 bg-red-950/30"
                    }`}
                  >
                    {faction}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-zinc-100 font-mono tracking-wide mt-1">
                  {currentStep === 1 && "Choose Faction Allegiance"}
                  {currentStep === 2 && "Select Battlefield Sector"}
                  {currentStep === 3 && "Engage Strategic Doctrine"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {currentStep === 1 && "Armada relies on high agility, pulsed lasers, and EMP arrays. Cortex commands heavy armor and brute artillery."}
                  {currentStep === 2 && "Topography dictates wind stability, choke point defense, and factory routing."}
                  {currentStep === 3 && "Determine your opening aggression window and tech ramp velocity."}
                </p>
              </div>

              {/* Wizard Content */}
              <div className="p-4 pt-2 space-y-4">
                <AnimatePresence mode="wait">
                  {/* STEP 1: FACTION SELECTION */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {/* ARMADA SELECTOR WITH OFFICIAL ARMADA EMBLEM */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setFaction("Armada")}
                        className={`group relative p-4 rounded-lg border cursor-pointer transition-all ${
                          faction === "Armada"
                            ? "border-blue-500 bg-blue-950/40 shadow-[0_0_25px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/40"
                            : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3.5">
                            {/* Official Armada Emblem */}
                            <div className="relative size-12 rounded bg-blue-500/10 p-1 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center shrink-0">
                              <Image
                                src="/armada-logo.png"
                                alt="Armada Faction Logo"
                                width={38}
                                height={38}
                                priority
                                className="object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-mono font-bold text-sm text-zinc-100 group-hover:text-blue-400 transition-colors">
                                  ARMADA
                                </h4>
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[9px] font-mono">
                                  TACTICAL MOBILITY
                                </Badge>
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                High-speed raiders, pulsed red lasers, EMP lightning weapons, and stealth radar jammers.
                              </p>
                            </div>
                          </div>
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${
                              faction === "Armada"
                                ? "border-blue-400 bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.9)]"
                                : "border-zinc-700"
                            }`}
                          >
                            {faction === "Armada" && <div className="size-1.5 rounded-full bg-white" />}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap gap-1.5">
                          {["Flash (Raider)", "Stump (Tank)", "Rocko (Rocket)", "Tick (EMP)", "Bulldog (T2)"].map((unit) => (
                            <span
                              key={unit}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                faction === "Armada"
                                  ? "bg-blue-950/50 text-blue-200 border-blue-500/30"
                                  : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60"
                              }`}
                            >
                              {unit}
                            </span>
                          ))}
                        </div>
                      </motion.div>

                      {/* CORTEX SELECTOR WITH OFFICIAL CORTEX EMBLEM */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setFaction("Cortex")}
                        className={`group relative p-4 rounded-lg border cursor-pointer transition-all ${
                          faction === "Cortex"
                            ? "border-red-500 bg-red-950/40 shadow-[0_0_25px_rgba(239,68,68,0.3)] ring-1 ring-red-500/40"
                            : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3.5">
                            {/* Official Cortex Emblem */}
                            <div className="relative size-12 rounded bg-red-500/10 p-1 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center shrink-0">
                              <Image
                                src="/cortex-logo.png"
                                alt="Cortex Faction Logo"
                                width={38}
                                height={38}
                                priority
                                className="object-contain drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-mono font-bold text-sm text-zinc-100 group-hover:text-red-400 transition-colors">
                                  CORTEX
                                </h4>
                                <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[9px] font-mono">
                                  HEAVY ORDNANCE
                                </Badge>
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                Brute heavy armor plating, high-caliber plasma cannons, riot spread, and pyrotechnics.
                              </p>
                            </div>
                          </div>
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${
                              faction === "Cortex"
                                ? "border-red-400 bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                                : "border-zinc-700"
                            }`}
                          >
                            {faction === "Cortex" && <div className="size-1.5 rounded-full bg-white" />}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap gap-1.5">
                          {["Blitz (Tank)", "Pyros (Flame)", "Raider (Assault)", "Leveler (Riot)", "Goliath (T2)"].map((unit) => (
                            <span
                              key={unit}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                faction === "Cortex"
                                  ? "bg-red-950/50 text-red-200 border-red-500/30"
                                  : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60"
                              }`}
                            >
                              {unit}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* STEP 2: MAP TYPE SELECTION */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span>SELECT THEATER // TOPOGRAPHY</span>
                        <span className="text-zinc-500">5 SECTORS IDENTIFIED</span>
                      </div>
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {MAP_PRESETS.map((preset) => {
                          const isSelected = mapType.startsWith(preset.name.split(" ")[0]);
                          return (
                            <motion.div
                              key={preset.id}
                              whileHover={{ x: 3 }}
                              onClick={() => setMapType(`${preset.name} (${preset.examples})`)}
                              className={`p-3 rounded border cursor-pointer transition-all ${
                                isSelected
                                  ? isArmada
                                    ? "border-blue-500/80 bg-blue-950/40 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
                                    : "border-red-500/80 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                                  : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Target className="size-3.5 text-zinc-500" />
                                  <h4 className="font-mono text-xs font-semibold text-zinc-200">
                                    {preset.name}
                                  </h4>
                                </div>
                                <Badge variant="secondary" className="text-[9px] font-mono bg-zinc-800 text-zinc-300">
                                  {preset.windType}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-zinc-400 mt-1">{preset.description}</p>
                              <p className="text-[10px] font-mono text-zinc-500 mt-1">
                                SAMPLES: {preset.examples}
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: STRATEGY STYLE SELECTION */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span>SELECT DOCTRINE // ATTACK TIMING</span>
                        <span className="text-zinc-500">5 PROFILES ARMED</span>
                      </div>
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {STRATEGY_PRESETS.map((style) => {
                          const Icon = style.icon;
                          const isSelected = strategyStyle.startsWith(style.title.split(" ")[0]);
                          return (
                            <motion.div
                              key={style.id}
                              whileHover={{ x: 3 }}
                              onClick={() => setStrategyStyle(`${style.title} (${style.description})`)}
                              className={`p-3 rounded border cursor-pointer transition-all ${
                                isSelected
                                  ? isArmada
                                    ? "border-blue-500/80 bg-blue-950/40 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
                                    : "border-red-500/80 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                                  : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className="size-4 text-zinc-400" />
                                  <h4 className="font-mono text-xs font-semibold text-zinc-200">
                                    {style.title}
                                  </h4>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-mono border-zinc-700 text-zinc-300"
                                >
                                  {style.timingWindow}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-zinc-400 mt-1">{style.description}</p>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Wizard Controls & CTA Button */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                      className="font-mono text-xs border-zinc-700 hover:bg-zinc-800"
                    >
                      <ChevronLeft className="size-3.5 mr-1" />
                      PREV
                    </Button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 3 ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCurrentStep((prev) => Math.min(3, prev + 1))}
                      className={`font-mono text-xs font-semibold ${
                        isArmada
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                          : "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                      }`}
                    >
                      NEXT STEP
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  ) : (
                    /* PULSING TACTICAL GLOW CTA BUTTON */
                    <motion.button
                      type="button"
                      disabled={isLoading}
                      onClick={handleGenerate}
                      animate={
                        isLoading
                          ? {
                              boxShadow: isArmada
                                ? [
                                    "0 0 10px rgba(59, 130, 246, 0.4)",
                                    "0 0 35px rgba(59, 130, 246, 0.95)",
                                    "0 0 10px rgba(59, 130, 246, 0.4)",
                                  ]
                                : [
                                    "0 0 10px rgba(239, 68, 68, 0.4)",
                                    "0 0 35px rgba(239, 68, 68, 0.95)",
                                    "0 0 10px rgba(239, 68, 68, 0.4)",
                                  ],
                              scale: [1, 1.025, 1],
                            }
                          : {
                              boxShadow: isArmada
                                ? "0 0 18px rgba(59, 130, 246, 0.35)"
                                : "0 0 18px rgba(239, 68, 68, 0.35)",
                            }
                      }
                      transition={{
                        repeat: isLoading ? Infinity : 0,
                        duration: 1.3,
                        ease: "easeInOut",
                      }}
                      whileHover={{ scale: isLoading ? 1 : 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`relative overflow-hidden px-5 py-2 rounded font-mono text-xs font-black tracking-wider uppercase cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        isArmada
                          ? "bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/80 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                          : "bg-red-600 hover:bg-red-500 text-white border border-red-400/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      }`}
                    >
                      {/* Scanning Beam Animation inside Button when Loading */}
                      {isLoading && (
                        <motion.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                        />
                      )}

                      {isLoading ? (
                        <>
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>CALIBRATING BUILD ORDER...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5" />
                          <span>GENERATE BUILD ORDER</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* Tactical Mission Telemetry Card */}
            <div className="relative p-3.5 rounded border border-zinc-800 bg-zinc-900/60 backdrop-blur-md text-xs font-mono space-y-2">
              <div className="text-[10px] text-zinc-500 font-bold tracking-wider flex items-center justify-between border-b border-zinc-800 pb-1.5">
                <span>ACTIVE SIMULATION PARAMETERS</span>
                <Activity className="size-3 text-emerald-400" />
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">FACTION ALLIANCE:</span>
                <span className={isArmada ? "text-blue-400 font-bold" : "text-red-400 font-bold"}>
                  {faction.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">THEATER OF WAR:</span>
                <span className="text-zinc-200 truncate ml-2 max-w-[200px]" title={mapType}>
                  {mapType.split(" (")[0]}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">OPERATIONAL DOCTRINE:</span>
                <span className="text-zinc-200 truncate ml-2 max-w-[200px]" title={strategyStyle}>
                  {strategyStyle.split(" (")[0]}
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: GENERATED STRATEGY CARD (7 cols on lg)     */}
          {/* ======================================================== */}
          <div className="lg:col-span-7">
            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative rounded-lg border border-zinc-800 bg-zinc-900/90 backdrop-blur-md shadow-2xl min-h-[580px] flex flex-col overflow-hidden"
            >
              {/* Tactical Corner Reticle Accents */}
              <div className={`absolute top-0 left-0 size-3 border-t-2 border-l-2 z-20 pointer-events-none ${isArmada ? "border-blue-500" : "border-red-500"}`} />
              <div className={`absolute top-0 right-0 size-3 border-t-2 border-r-2 z-20 pointer-events-none ${isArmada ? "border-blue-500" : "border-red-500"}`} />
              <div className={`absolute bottom-0 left-0 size-3 border-b-2 border-l-2 z-20 pointer-events-none ${isArmada ? "border-blue-500" : "border-red-500"}`} />
              <div className={`absolute bottom-0 right-0 size-3 border-b-2 border-r-2 z-20 pointer-events-none ${isArmada ? "border-blue-500" : "border-red-500"}`} />

              {/* Radar Sweep Scan Line while Loading */}
              {isLoading && (
                <motion.div
                  animate={{ y: ["0%", "500%"] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                  className={`absolute inset-x-0 h-1 z-30 pointer-events-none opacity-80 ${
                    isArmada
                      ? "bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.9)]"
                      : "bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_rgba(239,68,68,0.9)]"
                  }`}
                />
              )}

              {/* Strategic Header */}
              <div className="border-b border-zinc-800 bg-zinc-950/80 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${isLoading ? (isArmada ? "bg-blue-400 animate-ping" : "bg-red-400 animate-ping") : "bg-emerald-400"}`} />
                      <span className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">
                        TACTICAL ENGAGEMENT DOSSIER
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[10px] font-mono tracking-wide flex items-center gap-1.5 ${
                          isArmada
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-red-500/20 text-red-300 border-red-500/40"
                        }`}
                      >
                        <Image
                          src={isArmada ? "/armada-logo.png" : "/cortex-logo.png"}
                          alt={faction}
                          width={13}
                          height={13}
                          className="object-contain inline-block"
                        />
                        <span>{faction.toUpperCase()}</span>
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-400">
                        {mapType.split(" (")[0]}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-400">
                        {strategyStyle.split(" (")[0]}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {object && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="font-mono text-xs border-zinc-700 hover:bg-zinc-800 h-8 gap-1.5"
                      >
                        {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                        {copied ? "COPIED" : "EXPORT DOSSIER"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message if Generation Fails */}
              {error && (
                <div className="m-4 p-3.5 rounded border border-red-500/40 bg-red-950/30 text-red-300 text-xs font-mono flex items-start gap-2.5">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-red-400" />
                  <div className="space-y-1">
                    <p className="font-bold uppercase tracking-wide">Telemetry Disrupted</p>
                    <p className="text-zinc-300">{error.message || "Failed to generate strategy."}</p>
                    <p className="text-[11px] text-zinc-400">
                      Click the &quot;AI LINK&quot; button in the top bar to configure a valid Gemini API key.
                    </p>
                  </div>
                </div>
              )}

              {/* Strategy Tabs Content */}
              <div className="p-4 flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="grid grid-cols-3 bg-zinc-950/90 border border-zinc-800 p-1 mb-4 h-9.5">
                    <TabsTrigger
                      value="buildOrder"
                      className={`font-mono text-xs data-active:bg-zinc-800 data-active:shadow-sm ${
                        isArmada ? "data-active:text-blue-300" : "data-active:text-red-300"
                      }`}
                    >
                      <Clock className={`size-3.5 mr-1.5 ${isArmada ? "text-blue-400" : "text-red-400"}`} />
                      Build Order
                    </TabsTrigger>
                    <TabsTrigger
                      value="unitComp"
                      className={`font-mono text-xs data-active:bg-zinc-800 data-active:shadow-sm ${
                        isArmada ? "data-active:text-blue-300" : "data-active:text-red-300"
                      }`}
                    >
                      <Layers className={`size-3.5 mr-1.5 ${isArmada ? "text-blue-400" : "text-red-400"}`} />
                      Unit Comp
                    </TabsTrigger>
                    <TabsTrigger
                      value="notes"
                      className="font-mono text-xs data-active:bg-zinc-800 data-active:text-emerald-300 data-active:shadow-sm"
                    >
                      <Cpu className="size-3.5 mr-1.5 text-emerald-400" />
                      Timing & Economy
                    </TabsTrigger>
                  </TabsList>

                  {/* ======================================================== */}
                  {/* TAB 1: BUILD ORDER WITH ANIMATED STREAMING ITEMS          */}
                  {/* ======================================================== */}
                  <TabsContent value="buildOrder" className="flex-1 space-y-3 mt-0 outline-none">
                    {/* Empty State */}
                    {!object?.openingBuildOrder && !isLoading && !error && (
                      <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800/80 rounded">
                        <div className="size-12 mb-3 opacity-60 flex items-center justify-center">
                          <Image
                            src={isArmada ? "/armada-logo.png" : "/cortex-logo.png"}
                            alt={faction}
                            width={48}
                            height={48}
                            className="object-contain"
                          />
                        </div>
                        <h4 className="font-mono font-bold text-sm text-zinc-300 uppercase tracking-wide">
                          Awaiting Mission Parameters
                        </h4>
                        <p className="text-xs text-zinc-500 max-w-sm mt-1.5 font-mono">
                          Select your faction, theater, and doctrine on the left, then click &quot;GENERATE BUILD ORDER&quot; to compute tournament-calibrated build sequences.
                        </p>
                      </div>
                    )}

                    {/* Skeletons when Loading and no items yet */}
                    {isLoading && (!object?.openingBuildOrder || object.openingBuildOrder.length === 0) && (
                      <div className="space-y-2.5 p-1">
                        <div className={`flex items-center gap-2 text-xs font-mono animate-pulse mb-3 ${isArmada ? "text-blue-400" : "text-red-400"}`}>
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>SYNTHESIZING OPENING QUEUE & RECLAIM TIMETABLE...</span>
                        </div>
                        {[1, 2, 3, 4, 5].map((idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded border border-zinc-800/80 bg-zinc-950/40 flex items-center gap-3"
                          >
                            <Skeleton className="h-5 w-16 bg-zinc-800/90 rounded" />
                            <Skeleton className="h-4 flex-1 bg-zinc-800/60 rounded" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Streamed Build Order Items with Smooth Fade-in & Slide */}
                    {object?.openingBuildOrder && object.openingBuildOrder.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-2 max-h-[460px] overflow-y-auto pr-2"
                      >
                        {object.openingBuildOrder.map((step, idx) => {
                          if (!step) return null;
                          const match = step.match(/^(\[[^\]]+\]|\d+[:.]\d+)\s*(.*)$/);
                          const timestamp = match ? match[1] : `STEP ${idx + 1}`;
                          const description = match ? match[2] : step;

                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -14, scale: 0.98 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{ duration: 0.2, delay: idx * 0.02 }}
                              className={`group relative p-3 rounded border bg-zinc-950/60 hover:bg-zinc-900/60 transition-all flex items-start gap-3 ${
                                isArmada
                                  ? "border-zinc-800 hover:border-blue-500/50"
                                  : "border-zinc-800 hover:border-red-500/50"
                              }`}
                            >
                              <Badge
                                variant="outline"
                                className={`font-mono text-[10px] px-2 py-0.5 shrink-0 mt-0.5 font-bold ${
                                  isArmada
                                    ? "border-blue-500/40 bg-blue-950/40 text-blue-300"
                                    : "border-red-500/40 bg-red-950/40 text-red-300"
                                }`}
                              >
                                {timestamp}
                              </Badge>
                              <div className="text-xs text-zinc-200 font-mono leading-relaxed flex-1">
                                {description}
                              </div>
                            </motion.div>
                          );
                        })}

                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-2.5 flex items-center gap-2 text-xs font-mono text-zinc-400"
                          >
                            <span className={`size-2 rounded-full animate-ping ${isArmada ? "bg-blue-400" : "bg-red-400"}`} />
                            <span>Decoding incoming factory production stream...</span>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </TabsContent>

                  {/* ======================================================== */}
                  {/* TAB 2: UNIT COMPOSITION WITH ANIMATED CARDS              */}
                  {/* ======================================================== */}
                  <TabsContent value="unitComp" className="flex-1 space-y-3 mt-0 outline-none">
                    {/* Empty State */}
                    {!object?.unitComposition && !isLoading && !error && (
                      <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800/80 rounded">
                        <Layers className="size-10 text-zinc-600 mb-3" />
                        <h4 className="font-mono font-bold text-sm text-zinc-300 uppercase tracking-wide">
                          No Unit Requisition Loaded
                        </h4>
                        <p className="text-xs text-zinc-500 max-w-sm mt-1.5 font-mono">
                          Target army quotas, unit ratios, and factory composition guidelines will appear here upon simulation.
                        </p>
                      </div>
                    )}

                    {/* Skeletons when Loading */}
                    {isLoading && (!object?.unitComposition || object.unitComposition.length === 0) && (
                      <div className="space-y-3 p-1">
                        <div className={`flex items-center gap-2 text-xs font-mono animate-pulse mb-3 ${isArmada ? "text-blue-400" : "text-red-400"}`}>
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>CALIBRATING PRODUCTION RATIOS & COUNTERS...</span>
                        </div>
                        {[1, 2, 3, 4].map((idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded border border-zinc-800/80 bg-zinc-950/40 space-y-2"
                          >
                            <Skeleton className="h-4 w-48 bg-zinc-800/90 rounded" />
                            <Skeleton className="h-3 w-full bg-zinc-800/60 rounded" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Streamed Unit Composition Items */}
                    {object?.unitComposition && object.unitComposition.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-2.5 max-h-[460px] overflow-y-auto pr-2"
                      >
                        {object.unitComposition.map((comp, idx) => {
                          if (!comp) return null;
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, scale: 0.96, y: 6 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ duration: 0.22, delay: idx * 0.03 }}
                              className={`p-3.5 rounded border bg-zinc-950/70 hover:bg-zinc-900/60 transition-all flex items-center justify-between gap-3 ${
                                isArmada
                                  ? "border-zinc-800 hover:border-blue-500/50"
                                  : "border-zinc-800 hover:border-red-500/50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`size-2 rounded-full ${isArmada ? "bg-blue-400" : "bg-red-500"}`} />
                                <span className="font-mono font-bold text-xs text-zinc-100">
                                  {comp}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className={`font-mono text-[9px] border-zinc-700 shrink-0 uppercase ${
                                  isArmada ? "text-blue-300 border-blue-500/40" : "text-red-300 border-red-500/40"
                                }`}
                              >
                                {faction}
                              </Badge>
                            </motion.div>
                          );
                        })}

                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-2.5 flex items-center gap-2 text-xs font-mono text-zinc-400"
                          >
                            <span className={`size-2 rounded-full animate-ping ${isArmada ? "bg-blue-400" : "bg-red-400"}`} />
                            <span>Computing army ratios & chassis quotas...</span>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </TabsContent>

                  {/* ======================================================== */}
                  {/* TAB 3: TIMING & ECONOMY NOTES WITH STREAMING TEXT        */}
                  {/* ======================================================== */}
                  <TabsContent value="notes" className="flex-1 space-y-3 mt-0 outline-none">
                    {/* Empty State */}
                    {!object?.strategyNotes && !isLoading && !error && (
                      <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800/80 rounded">
                        <Cpu className="size-10 text-zinc-600 mb-3" />
                        <h4 className="font-mono font-bold text-sm text-zinc-300 uppercase tracking-wide">
                          No Strategic Telemetry Recorded
                        </h4>
                        <p className="text-xs text-zinc-500 max-w-sm mt-1.5 font-mono">
                          Economy thresholds, power spikes, energy conversion rules (70E -&gt; 1M), and timing attacks will stream here.
                        </p>
                      </div>
                    )}

                    {/* Skeletons when Loading */}
                    {isLoading && !object?.strategyNotes && (
                      <div className="space-y-3 p-1">
                        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 animate-pulse mb-3">
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>DECIPHERING POWER SPIKES & TIMING ATTACKS...</span>
                        </div>
                        <Skeleton className="h-4 w-3/4 bg-zinc-800/90 rounded" />
                        <Skeleton className="h-4 w-full bg-zinc-800/60 rounded" />
                        <Skeleton className="h-4 w-5/6 bg-zinc-800/60 rounded" />
                        <Skeleton className="h-24 w-full bg-zinc-800/40 rounded" />
                      </div>
                    )}

                    {/* Streamed Strategy Notes with live typing effect */}
                    {object?.strategyNotes && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="p-4 rounded border border-zinc-800 bg-zinc-950/70 max-h-[460px] overflow-y-auto pr-3 font-mono text-xs text-zinc-300 space-y-3.5 leading-relaxed"
                      >
                        {object.strategyNotes.split("\n\n").map((paragraph, pIdx) => {
                          const isHeading = paragraph.startsWith("#");
                          const isBulletList = paragraph.includes("- ") || paragraph.includes("* ");

                          if (isHeading) {
                            const cleanText = paragraph.replace(/^#+\s*/, "");
                            return (
                              <h5
                                key={pIdx}
                                className={`font-mono font-bold text-sm border-b pb-1 pt-1.5 flex items-center gap-2 ${
                                  isArmada
                                    ? "text-blue-300 border-blue-500/30"
                                    : "text-red-300 border-red-500/30"
                                }`}
                              >
                                <ChevronRight className="size-3 text-current" />
                                {cleanText}
                              </h5>
                            );
                          }

                          if (isBulletList) {
                            const items = paragraph.split("\n").filter((line) => line.trim().length > 0);
                            return (
                              <ul key={pIdx} className="space-y-1.5 pl-2 font-mono text-xs">
                                {items.map((item, iIdx) => (
                                  <li key={iIdx} className="flex items-start gap-2 text-zinc-200">
                                    <span className={isArmada ? "text-blue-400" : "text-red-400"}>▸</span>
                                    <span>{item.replace(/^[-*]\s*/, "")}</span>
                                  </li>
                                ))}
                              </ul>
                            );
                          }

                          return (
                            <p key={pIdx} className="text-zinc-300 font-mono text-xs">
                              {paragraph}
                            </p>
                          );
                        })}

                        {isLoading && (
                          <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className={`inline-block size-2 ml-1 ${isArmada ? "bg-blue-400" : "bg-red-400"}`}
                          />
                        )}
                      </motion.div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Tactical Status Footer Bar */}
              <div className="border-t border-zinc-800 bg-zinc-950/90 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-400">DATA GROUNDING: ARMADA/CORTEX STRICT</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-600">LINK: 100%</span>
                  <span className={isLoading ? (isArmada ? "text-blue-400 font-bold animate-pulse" : "text-red-400 font-bold animate-pulse") : "text-emerald-400 font-bold"}>
                    {isLoading ? "DOWNLOADING STREAM" : "STANDBY"}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}
