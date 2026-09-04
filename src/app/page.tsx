"use client";

import { useState } from "react";
import { useObject } from "@ai-sdk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Flame,
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
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildPlanResponseSchema, type Faction } from "@/lib/game-data";

// Map Presets
const MAP_PRESETS = [
  {
    id: "small-land",
    name: "Small Land / Chokepoints",
    examples: "Red Comet, Altair Crossing, Comet Catcher",
    description: "Tight lanes and early conflict. Fast raiders and skirmishers dominate.",
    windType: "Moderate (8-18)",
  },
  {
    id: "open-fields",
    name: "Open Plains / High Wind",
    examples: "Open Metal, SpeedMetal, Plains of Hope",
    description: "Vast build space. Highly lucrative for Wind Generators and vehicle flanking.",
    windType: "High (12-28)",
  },
  {
    id: "mountain-hills",
    name: "Mountain / High Altitude",
    examples: "Supreme Strait, Tangerine, High Ground",
    description: "Rough elevation. Spider bots and high-arc artillery hold key plateaus.",
    windType: "Low-Moderate (4-14)",
  },
  {
    id: "water-coastal",
    name: "Coastal & Sea / Island",
    examples: "DSD Shorelines, Coast to Coast, Shore to Shore",
    description: "Mixed amphibious terrain. Shipyard control or air dominance is vital.",
    windType: "Consistent (10-20)",
  },
  {
    id: "large-team",
    name: "Large Team 8v8 (Lane / Eco Roles)",
    examples: "All That Glitters, Ishtir, Bismuth Valley",
    description: "Dedicated frontline vs backline eco/tech roles. Scaled fusion timings.",
    windType: "Variable (6-22)",
  },
];

// Strategy Presets
const STRATEGY_PRESETS = [
  {
    id: "early-tank-rush",
    title: "Early Tank Raider Rush",
    tag: "High Aggression",
    description: "Fast Vehicle Factory at 1:15. Push 4-6 Flash/Blitz into enemy metal nodes by 2:45.",
    icon: Crosshair,
  },
  {
    id: "fast-eco",
    title: "Fast Eco & Tech Rush",
    tag: "Greedy Macro",
    description: "Scale Wind/Solar greed, assist Commander nanolathe, push T2 lab by 7:00-8:00.",
    icon: Zap,
  },
  {
    id: "bot-swarm-choke",
    title: "Bot Skirmish & LLT Creep",
    tag: "Territory Control",
    description: "Rocko/Storm rocket bot poke with Light Laser Towers locking down vital chokes.",
    icon: Shield,
  },
  {
    id: "air-opening",
    title: "Air Opening & Surgical Harass",
    tag: "Surgical Strike",
    description: "Fast Air Plant into Banshee/Tornado gunships to assassinate unescorted builders.",
    icon: Compass,
  },
  {
    id: "heavy-turtle",
    title: "Fortified Turtle into T2/T3 Armor",
    tag: "Heavy Armor",
    description: "Defend early mexes with LLT, bank economy for Bulldog or Goliath heavy armor.",
    icon: Layers,
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

  // Vercel AI SDK useObject pointing to /api/generate-build
  const { object, submit, isLoading, stop, error } = useObject({
    api: "/api/generate-build",
    schema: buildPlanResponseSchema,
  });

  const handleGenerate = () => {
    submit({
      faction,
      mapType,
      strategyStyle,
    });
    // Auto-switch to build order tab
    setActiveTab("buildOrder");
  };

  const handleCopy = () => {
    if (!object) return;
    const text = [
      `=== BEYOND ALL REASON TACTICAL BUILD: ${faction.toUpperCase()} ===`,
      `Map: ${mapType}`,
      `Strategy: ${strategyStyle}`,
      "",
      "--- OPENING BUILD ORDER ---",
      ...(object.openingBuildOrder || []).map((step, idx) => `${idx + 1}. ${step}`),
      "",
      "--- TARGET UNIT COMPOSITION ---",
      ...(object.unitComposition || []).map((u) => `• ${u}`),
      "",
      "--- TIMING & ECONOMY NOTES ---",
      object.strategyNotes || "",
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isArmada = faction === "Armada";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-cyan-500 selection:text-black">
      {/* Background RTS Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#1e293b_0%,transparent_70%)] opacity-30" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#09090b_1px,transparent_1px),linear-gradient(to_bottom,#09090b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

      {/* Main Header */}
      <header className="relative z-10 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Radio className="size-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-wider uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400">
                  BAR STRATCOM // TACTICAL ADVISOR
                </h1>
                <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400 bg-emerald-950/30 font-mono">
                  LIVE GRID
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 font-mono tracking-tight">
                BEYOND ALL REASON • TOURNAMENT AI BUILD ENGINE • DATA-GROUNDED
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 text-xs font-mono text-zinc-400">
              <span className="text-zinc-500">ENGINE:</span>
              <span className="text-cyan-400 font-semibold">GEMINI 1.5 PRO</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">VER:</span>
              <span className="text-zinc-300">v4.2</span>
            </div>
            {isLoading && (
              <Button
                variant="destructive"
                size="sm"
                onClick={stop}
                className="font-mono text-xs gap-1.5 shadow-sm"
              >
                <SquareSquare className="size-3.5" />
                ABORT STREAM
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: 2-Column RTS Layout */}
      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: MULTI-STEP FORM WIZARD (5 cols on lg)       */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md shadow-xl overflow-hidden">
              {/* Wizard Step Navigation Bar */}
              <div className="border-b border-zinc-800/80 bg-zinc-950/60 p-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  {[
                    { step: 1, label: "FACTION" },
                    { step: 2, label: "MAP TYPE" },
                    { step: 3, label: "DOCTRINE" },
                  ].map((item) => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setCurrentStep(item.step)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                        currentStep === item.step
                          ? isArmada
                            ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                            : "bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                          : currentStep > item.step
                          ? "text-emerald-400 hover:text-emerald-300"
                          : "text-zinc-500 hover:text-zinc-400"
                      }`}
                    >
                      <span className="size-4 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                        {item.step}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <Cpu className="size-3.5 text-zinc-500" />
                    <span>MISSION PARAMETERS // STEP {currentStep} OF 3</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[10px] uppercase ${
                      isArmada
                        ? "border-cyan-500/40 text-cyan-400 bg-cyan-950/20"
                        : "border-amber-500/40 text-amber-400 bg-amber-950/20"
                    }`}
                  >
                    {faction} ACTIVE
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-zinc-100 font-mono tracking-wide">
                  {currentStep === 1 && "Select Command Faction"}
                  {currentStep === 2 && "Select Theater of War"}
                  {currentStep === 3 && "Select Strategic Doctrine"}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  {currentStep === 1 && "Choose your technological allegiance. Units are strictly faction-grounded."}
                  {currentStep === 2 && "Terrain and wind determine energy choice (Wind vs Solar) and chassis path."}
                  {currentStep === 3 && "Define your early-game timing attack and tech transition timetable."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                <AnimatePresence mode="wait">
                  {/* STEP 1: FACTION SELECTION */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-3"
                    >
                      {/* ARMADA CARD */}
                      <div
                        onClick={() => setFaction("Armada")}
                        className={`group relative p-4 rounded-lg border cursor-pointer transition-all ${
                          faction === "Armada"
                            ? "border-cyan-500 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                            : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                              <Shield className="size-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-mono font-bold text-base text-zinc-100 group-hover:text-cyan-400 transition-colors">
                                  ARMADA
                                </h3>
                                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-[10px]">
                                  HIGH MOBILITY
                                </Badge>
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                High-speed raiders, pulsed lasers, lightning/EMP generators, and stealth tech.
                              </p>
                            </div>
                          </div>
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center ${
                              faction === "Armada"
                                ? "border-cyan-400 bg-cyan-500 text-black"
                                : "border-zinc-700"
                            }`}
                          >
                            {faction === "Armada" && <div className="size-1.5 rounded-full bg-black" />}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                          {["Flash (Raider)", "Stump (Tank)", "Rocko (Rocket)", "Tick (EMP)", "Bulldog (T2)"].map((unit) => (
                            <span
                              key={unit}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-300 border border-zinc-700/50"
                            >
                              {unit}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* CORTEX CARD */}
                      <div
                        onClick={() => setFaction("Cortex")}
                        className={`group relative p-4 rounded-lg border cursor-pointer transition-all ${
                          faction === "Cortex"
                            ? "border-amber-500 bg-amber-950/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                            : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Flame className="size-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-mono font-bold text-base text-zinc-100 group-hover:text-amber-400 transition-colors">
                                  CORTEX
                                </h3>
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                                  HEAVY FIREPOWER
                                </Badge>
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                Brute heavy armor, devastating plasma cannons, riot spread, and pyrotechnics.
                              </p>
                            </div>
                          </div>
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center ${
                              faction === "Cortex"
                                ? "border-amber-400 bg-amber-500 text-black"
                                : "border-zinc-700"
                            }`}
                          >
                            {faction === "Cortex" && <div className="size-1.5 rounded-full bg-black" />}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                          {["Blitz (Tank)", "Pyros (Flame)", "Raider (Assault)", "Leveler (Riot)", "Goliath (T2)"].map((unit) => (
                            <span
                              key={unit}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-300 border border-zinc-700/50"
                            >
                              {unit}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: MAP TYPE SELECTION */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-2.5"
                    >
                      <label className="text-xs font-mono text-zinc-400 uppercase tracking-wide">
                        Choose Battlefield Topography:
                      </label>
                      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                        {MAP_PRESETS.map((preset) => {
                          const isSelected = mapType.startsWith(preset.name.split(" ")[0]);
                          return (
                            <div
                              key={preset.id}
                              onClick={() => setMapType(`${preset.name} (${preset.examples})`)}
                              className={`p-3 rounded-md border cursor-pointer transition-all ${
                                isSelected
                                  ? isArmada
                                    ? "border-cyan-500 bg-cyan-950/30"
                                    : "border-amber-500 bg-amber-950/30"
                                  : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/40"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-mono text-xs font-semibold text-zinc-200">
                                  {preset.name}
                                </h4>
                                <Badge variant="secondary" className="text-[9px] font-mono bg-zinc-800/80">
                                  {preset.windType}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-zinc-400 mt-1">{preset.description}</p>
                              <p className="text-[10px] font-mono text-zinc-500 mt-1">
                                Maps: {preset.examples}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: STRATEGY STYLE SELECTION */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-2.5"
                    >
                      <label className="text-xs font-mono text-zinc-400 uppercase tracking-wide">
                        Choose Operational Doctrine:
                      </label>
                      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                        {STRATEGY_PRESETS.map((style) => {
                          const Icon = style.icon;
                          const isSelected = strategyStyle.startsWith(style.title.split(" ")[0]);
                          return (
                            <div
                              key={style.id}
                              onClick={() => setStrategyStyle(`${style.title} (${style.description})`)}
                              className={`p-3 rounded-md border cursor-pointer transition-all ${
                                isSelected
                                  ? isArmada
                                    ? "border-cyan-500 bg-cyan-950/30"
                                    : "border-amber-500 bg-amber-950/30"
                                  : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/40"
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
                                  {style.tag}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-zinc-400 mt-1">{style.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Wizard Controls */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3">
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
                      className={`font-mono text-xs text-black font-semibold ${
                        isArmada ? "bg-cyan-400 hover:bg-cyan-300" : "bg-amber-400 hover:bg-amber-300"
                      }`}
                    >
                      NEXT STEP
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isLoading}
                      onClick={handleGenerate}
                      className={`font-mono text-xs text-black font-bold shadow-lg transition-all ${
                        isArmada
                          ? "bg-cyan-400 hover:bg-cyan-300 shadow-cyan-500/20"
                          : "bg-amber-400 hover:bg-amber-300 shadow-amber-500/20"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                          COMPUTING BUILD...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5 mr-1.5" />
                          GENERATE STRATEGY
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Summary Card */}
            <div className="p-3.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span>FACTION:</span>
                <span className={isArmada ? "text-cyan-400 font-bold" : "text-amber-400 font-bold"}>
                  {faction}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 truncate">
                <span>THEATER:</span>
                <span className="text-zinc-200 truncate ml-2 max-w-[200px]" title={mapType}>
                  {mapType.split(" (")[0]}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 truncate">
                <span>DOCTRINE:</span>
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
            <Card className="border-zinc-800 bg-zinc-900/90 backdrop-blur-md shadow-2xl min-h-[580px] flex flex-col">
              
              {/* Strategic Header */}
              <CardHeader className="border-b border-zinc-800/80 bg-zinc-950/70 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${isLoading ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
                      <span className="text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
                        STRATCOM SIMULATION DOSSIER
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[10px] font-mono ${
                          isArmada
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        }`}
                      >
                        {faction}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-400">
                        {mapType.split(" (")[0]}
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
                        {copied ? "COPIED" : "EXPORT"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Error Message if Generation Fails */}
              {error && (
                <div className="m-4 p-3 rounded-md bg-destructive/15 border border-destructive/40 text-destructive text-xs font-mono flex items-start gap-2.5">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold uppercase">Transmission Interrupted</p>
                    <p className="text-zinc-300">{error.message || "Failed to generate strategy."}</p>
                    <p className="text-[10px] text-zinc-400">
                      Ensure `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` is configured in your `.env.local` file.
                    </p>
                  </div>
                </div>
              )}

              {/* Strategy Tabs Content */}
              <div className="p-4 flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="grid grid-cols-3 bg-zinc-950/80 border border-zinc-800 p-1 mb-4 h-9">
                    <TabsTrigger
                      value="buildOrder"
                      className="font-mono text-xs data-active:bg-zinc-800/90 data-active:text-zinc-100"
                    >
                      <Clock className="size-3.5 mr-1.5 text-cyan-400" />
                      Build Order
                    </TabsTrigger>
                    <TabsTrigger
                      value="unitComp"
                      className="font-mono text-xs data-active:bg-zinc-800/90 data-active:text-zinc-100"
                    >
                      <Layers className="size-3.5 mr-1.5 text-amber-400" />
                      Unit Comp
                    </TabsTrigger>
                    <TabsTrigger
                      value="notes"
                      className="font-mono text-xs data-active:bg-zinc-800/90 data-active:text-zinc-100"
                    >
                      <Cpu className="size-3.5 mr-1.5 text-emerald-400" />
                      Timing & Economy
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: BUILD ORDER */}
                  <TabsContent value="buildOrder" className="flex-1 space-y-3 mt-0">
                    {/* Empty State */}
                    {!object?.openingBuildOrder && !isLoading && !error && (
                      <div className="h-[380px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-lg">
                        <Radio className="size-10 text-zinc-600 mb-3 animate-pulse" />
                        <h4 className="font-mono font-bold text-sm text-zinc-300 uppercase">
                          Awaiting Operational Parameters
                        </h4>
                        <p className="text-xs text-zinc-500 max-w-sm mt-1">
                          Configure your faction, map, and strategy on the left, then trigger `GENERATE STRATEGY` to compute tournament-calibrated build queues.
                        </p>
                      </div>
                    )}

                    {/* Skeletons when Loading and no items yet */}
                    {isLoading && (!object?.openingBuildOrder || object.openingBuildOrder.length === 0) && (
                      <div className="space-y-2.5 p-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 animate-pulse mb-3">
                          <RefreshCw className="size-3 animate-spin" />
                          <span>DECIPHERING OPENING QUEUE & RECLAIM TIMETABLE...</span>
                        </div>
                        {[1, 2, 3, 4, 5].map((idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 flex items-center gap-3"
                          >
                            <Skeleton className="h-5 w-16 bg-zinc-800/80 rounded" />
                            <Skeleton className="h-4 flex-1 bg-zinc-800/60 rounded" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Streamed Build Order Items */}
                    {object?.openingBuildOrder && object.openingBuildOrder.length > 0 && (
                      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-2">
                        {object.openingBuildOrder.map((step, idx) => {
                          if (!step) return null;
                          // Extract timestamp if formatted like "[0:25] Commander: ..."
                          const match = step.match(/^(\[[^\]]+\]|\d+[:.]\d+)\s*(.*)$/);
                          const timestamp = match ? match[1] : `STEP ${idx + 1}`;
                          const description = match ? match[2] : step;

                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className="group p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700/80 hover:bg-zinc-900/40 transition-all flex items-start gap-3"
                            >
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] px-2 py-0.5 border-zinc-700 bg-zinc-900 text-cyan-400 font-semibold shrink-0 mt-0.5"
                              >
                                {timestamp}
                              </Badge>
                              <div className="text-xs text-zinc-200 font-mono leading-relaxed">
                                {description}
                              </div>
                            </motion.div>
                          );
                        })}

                        {isLoading && (
                          <div className="p-2 flex items-center gap-2 text-xs font-mono text-zinc-400 animate-pulse">
                            <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
                            Streaming additional queue commands...
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 2: UNIT COMPOSITION */}
                  <TabsContent value="unitComp" className="flex-1 space-y-3 mt-0">
                    {/* Empty State */}
                    {!object?.unitComposition && !isLoading && !error && (
                      <div className="h-[380px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-lg">
                        <Layers className="size-10 text-zinc-600 mb-3" />
                        <h4 className="font-mono font-bold text-sm text-zinc-300 uppercase">
                          No Unit Requisition Loaded
                        </h4>
                        <p className="text-xs text-zinc-500 max-w-sm mt-1">
                          The strategic composition breakdown will show recommended army ratios and role counters once generated.
                        </p>
                      </div>
                    )}

                    {/* Skeletons when Loading */}
                    {isLoading && (!object?.unitComposition || object.unitComposition.length === 0) && (
                      <div className="space-y-3 p-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 animate-pulse mb-3">
                          <RefreshCw className="size-3 animate-spin" />
                          <span>CALIBRATING FACTORY PRODUCTION RATIOS...</span>
                        </div>
                        {[1, 2, 3, 4].map((idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg border border-zinc-800/60 bg-zinc-950/40 space-y-2"
                          >
                            <Skeleton className="h-4 w-44 bg-zinc-800/80 rounded" />
                            <Skeleton className="h-3 w-full bg-zinc-800/50 rounded" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Streamed Unit Composition Items */}
                    {object?.unitComposition && object.unitComposition.length > 0 && (
                      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-2">
                        {object.unitComposition.map((comp, idx) => {
                          if (!comp) return null;
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700/80 transition-all flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="size-2 rounded-full bg-amber-400" />
                                <span className="font-mono font-bold text-xs text-zinc-100">
                                  {comp}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className="font-mono text-[9px] border-zinc-700 text-zinc-400 shrink-0"
                              >
                                {faction}
                              </Badge>
                            </motion.div>
                          );
                        })}

                        {isLoading && (
                          <div className="p-2 flex items-center gap-2 text-xs font-mono text-zinc-400 animate-pulse">
                            <span className="size-2 rounded-full bg-amber-400 animate-ping" />
                            Calculating remaining army quotas...
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 3: TIMING & ECONOMY NOTES */}
                  <TabsContent value="notes" className="flex-1 space-y-3 mt-0">
                    {/* Empty State */}
                    {!object?.strategyNotes && !isLoading && !error && (
                      <div className="h-[380px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-lg">
                        <Cpu className="size-10 text-zinc-600 mb-3" />
                        <h4 className="font-mono font-bold text-sm text-zinc-300 uppercase">
                          No Tactical Dossier Available
                        </h4>
                        <p className="text-xs text-zinc-500 max-w-sm mt-1">
                          Economy thresholds, energy conversion advice (70E -&gt; 1M), and timing attack execution details will appear here.
                        </p>
                      </div>
                    )}

                    {/* Skeletons when Loading */}
                    {isLoading && !object?.strategyNotes && (
                      <div className="space-y-3 p-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 animate-pulse mb-3">
                          <RefreshCw className="size-3 animate-spin" />
                          <span>SYNTHESIZING TIMING ATTACKS & POWER THRESHOLDS...</span>
                        </div>
                        <Skeleton className="h-4 w-3/4 bg-zinc-800/80 rounded" />
                        <Skeleton className="h-4 w-full bg-zinc-800/60 rounded" />
                        <Skeleton className="h-4 w-5/6 bg-zinc-800/60 rounded" />
                        <Skeleton className="h-20 w-full bg-zinc-800/40 rounded" />
                      </div>
                    )}

                    {/* Streamed Strategy Notes */}
                    {object?.strategyNotes && (
                      <div className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-950/70 max-h-[460px] overflow-y-auto pr-3 font-sans text-xs text-zinc-300 space-y-3 leading-relaxed">
                        {object.strategyNotes.split("\n\n").map((paragraph, pIdx) => {
                          const isHeading = paragraph.startsWith("#");
                          const isBulletList = paragraph.includes("- ") || paragraph.includes("* ");

                          if (isHeading) {
                            const cleanText = paragraph.replace(/^#+\s*/, "");
                            return (
                              <h5
                                key={pIdx}
                                className="font-mono font-bold text-sm text-zinc-100 border-b border-zinc-800 pb-1 pt-2 flex items-center gap-2 text-cyan-300"
                              >
                                <ChevronRight className="size-3 text-cyan-400" />
                                {cleanText}
                              </h5>
                            );
                          }

                          if (isBulletList) {
                            const items = paragraph.split("\n").filter((line) => line.trim().length > 0);
                            return (
                              <ul key={pIdx} className="space-y-1.5 pl-2 font-mono text-xs">
                                {items.map((item, iIdx) => (
                                  <li key={iIdx} className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-0.5">•</span>
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
                          <span className="inline-block size-2 bg-cyan-400 animate-ping ml-1" />
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Footer Status Bar */}
              <div className="border-t border-zinc-800/80 bg-zinc-950/80 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>BAR DATA CONSTRAINTS ENFORCED</span>
                </div>
                <span>
                  {isLoading ? "RECEIVING TELEMETRY STREAM..." : "READY FOR DEPLOYMENT"}
                </span>
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
