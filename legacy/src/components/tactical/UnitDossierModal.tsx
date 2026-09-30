"use client";

import React, { useEffect } from "react";
import { X, Clock, ShieldAlert, Sparkles, ExternalLink, Zap } from "lucide-react";
import { type ScrapedBARUnit } from "@/lib/game-data";

export interface UnitDossierModalProps {
  unit: ScrapedBARUnit | null;
  onClose: () => void;
}

export function UnitDossierModal({ unit, onClose }: UnitDossierModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!unit) return null;

  const isArmada = unit.faction === "Armada";
  const accentColor = isArmada ? "#449bed" : "#ff2244";
  const secondaryAccent = isArmada ? "#38bdf8" : "#ef4444";

  // Synthesized tactical advice based on unit category, role, and tier
  const getTacticalIntel = () => {
    const lowerRole = (unit.role || "").toLowerCase();
    const lowerName = unit.name.toLowerCase();
    const isEco = unit.category === "Buildings" || lowerRole.includes("producer") || lowerRole.includes("collector") || lowerRole.includes("energy") || lowerRole.includes("metal");
    const isFactory = unit.category === "Factories";
    const isDefense = unit.category === "Defense Buildings";

    if (isEco) {
      if (lowerName.includes("wind")) {
        return "Critical early-to-midgame energy generator. Highly cost-effective on maps with average wind >= 8 m/s. Pair with Energy Storage buffers to prevent rolling power stalls during low-wind lulls.";
      }
      if (lowerName.includes("solar")) {
        return "Fixed, guaranteed +20 E/s baseline energy foundation. Crucial on zero-wind or highly volatile theaters. Keep spaced to prevent devastating chain-reaction explosions when assaulted.";
      }
      if (lowerName.includes("fusion") || lowerName.includes("afus")) {
        return "High-tier energy powerhouse. Essential gateway to exponential Tech 2/3 scaling and mass Advanced Energy Converters. Heavily fortified placement required as destruction creates catastrophic blast damage.";
      }
      if (lowerName.includes("extractor") || lowerName.includes("mex")) {
        return "Primary metal intake point. Prioritize early commander/constructor staking on all localized metal vents. Upgrade to T2 as soon as your power grid reaches +400 E/s stability.";
      }
      return "Essential macro infrastructure. Balance build power investment against metal/energy burn rates to prevent stalled production queues.";
    }

    if (isFactory) {
      return "Core production hub for mechanized armies. Surround with Construction Turrets (Nanos) once your economy supports higher build power expenditure to rapidly surge frontline units.";
    }

    if (isDefense) {
      return "Static defensive anchor. Use strictly at critical terrain chokes, radar crests, or surrounding valuable fusion reactors. Avoid over-investing in static turrets as mobile units offer superior flexibility and flanking denial.";
    }

    if (unit.tier === "T1") {
      if (lowerRole.includes("scout") || lowerRole.includes("raider") || lowerName.includes("tick") || lowerName.includes("flea") || lowerName.includes("flash") || lowerName.includes("pawn") || lowerName.includes("grunt")) {
        return "High-velocity early game skirmisher. Ideal for perimeter scouting, flanking unprotected metal extractors, and denying enemy expansion before defenses arrive.";
      }
      if (lowerRole.includes("rocket") || lowerRole.includes("anti-air")) {
        return "Specialized fire support. Position directly behind frontline skirmish screens to outrange enemy light laser towers and swat early air scouts.";
      }
      return "Versatile Tier 1 combat backbone. Produce in rapid sustained waves to hold map quadrants and pressure enemy constructor expansion paths.";
    }

    if (unit.tier === "T2") {
      return "High-yield Tech 2 shock unit. Boasts heavy armor and punishing firepower. Support with radar coverage, mobile jammer units, and resurrection bots (Lazarus/Graverobber) to reclaim or revive expensive fallen assets.";
    }

    return "Devastating endgame battle asset. Capable of single-handedly breaking fortified turtle bases and dictating match tempo. Maintain escort screens against EMP gunships and artillery snipes.";
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl pixel-box bg-[#0c0e16] border-2 text-zinc-100 shadow-2xl overflow-hidden"
        style={{ borderColor: accentColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Scanning Line */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />

        {/* Modal Header Bar */}
        <div className="flex items-center justify-between p-3.5 border-b border-zinc-800 bg-[#121522]">
          <div className="flex items-center gap-2.5">
            <img
              src={isArmada ? "/armada-logo.png" : "/cortex-logo.png"}
              alt={unit.faction}
              className="size-4.5 object-contain pixelated"
            />
            <div className="font-pixel-heading text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="text-white drop-shadow-[1px_1px_0px_#000]">{unit.name}</span>
              <span className="text-zinc-500 font-normal">[{unit.slug}]</span>
              <span
                className="px-1.5 py-0.5 text-[8.5px] border"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {unit.tier}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 text-[9px] font-pixel-heading bg-red-950/80 border border-red-500 text-red-300 hover:bg-red-900 transition-none active:translate-y-0.5 cursor-pointer flex items-center gap-1"
          >
            <X className="size-3" />
            <span>[ESC]</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: 3D Render & Identity */}
          <div className="flex flex-col items-center justify-between p-4 pixel-box-inset bg-black/60 relative">
            {/* Top Badges */}
            <div className="w-full flex items-center justify-between text-[9px] font-pixel-heading mb-2">
              <span className="text-zinc-400 uppercase tracking-wide">{unit.category}</span>
              {unit.icon && (
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-black/80 border border-zinc-700">
                  <span className="text-[7.5px] text-zinc-400">ICON:</span>
                  <img
                    src={unit.icon}
                    alt="Strat Icon"
                    className="size-4 object-contain pixelated"
                  />
                </div>
              )}
            </div>

            {/* Main 3D Render */}
            <div className="my-auto py-3 w-full flex items-center justify-center min-h-[160px]">
              {unit.image ? (
                <img
                  src={unit.image}
                  alt={unit.name}
                  className="max-h-44 max-w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] filter brightness-105"
                  onError={(e) => {
                    if (unit.icon && e.currentTarget.src !== unit.icon) {
                      e.currentTarget.src = unit.icon;
                    }
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-600">
                  <ShieldAlert className="size-12 mb-2" />
                  <span className="text-[9px] font-pixel-heading uppercase">NO SATELLITE RENDER</span>
                </div>
              )}
            </div>

            {/* Role & Subtitle */}
            <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-800/80">
              <div className="font-pixel-heading text-xs text-white uppercase">{unit.name}</div>
              <div className="font-pixel-body text-xs text-zinc-400 mt-0.5 line-clamp-2">
                {unit.role || "Standard Combat Asset"}
              </div>
            </div>
          </div>

          {/* Right: Technical Stats & Competitive Guidance */}
          <div className="space-y-4 flex flex-col justify-between">
            {/* Requisition Costs */}
            <div className="space-y-1.5">
              <div className="text-[8.5px] font-pixel-heading uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <span style={{ color: accentColor }}>▸</span>
                <span>PRODUCTION REQUISITION COST</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* Metal */}
                <div className="p-2 pixel-box-inset flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1 text-[8.5px] font-pixel-heading text-zinc-400 mb-1">
                    <img src="/metal.png" alt="M" className="size-3.5 object-contain" />
                    <span>METAL</span>
                  </div>
                  <span className="font-pixel-heading text-xs text-zinc-100 font-bold">
                    {unit.metal !== null ? unit.metal.toLocaleString() : "—"}
                  </span>
                </div>

                {/* Energy */}
                <div className="p-2 pixel-box-inset flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1 text-[8.5px] font-pixel-heading text-amber-400 mb-1">
                    <img src="/energy.png" alt="E" className="size-3.5 object-contain" />
                    <span>ENERGY</span>
                  </div>
                  <span className="font-pixel-heading text-xs text-amber-300 font-bold">
                    {unit.energy !== null ? unit.energy.toLocaleString() : "—"}
                  </span>
                </div>

                {/* Build Time */}
                <div className="p-2 pixel-box-inset flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1 text-[8.5px] font-pixel-heading text-cyan-400 mb-1">
                    <Clock className="size-3 text-cyan-400" />
                    <span>WORK</span>
                  </div>
                  <span className="font-pixel-heading text-xs text-cyan-300 font-bold">
                    {unit.buildTime !== null ? unit.buildTime.toLocaleString() : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Intel Guide */}
            <div className="space-y-1.5">
              <div className="text-[8.5px] font-pixel-heading uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="size-3" style={{ color: secondaryAccent }} />
                <span>COMPETITIVE META GUIDELINES</span>
              </div>
              <div className="p-3 pixel-box-inset bg-black/40 border border-zinc-800 text-xs font-pixel-body text-zinc-300 leading-relaxed min-h-[90px]">
                {getTacticalIntel()}
              </div>
            </div>

            {/* Official Wiki / Database Reference Link */}
            <div className="pt-2 flex items-center justify-between text-[9px] font-pixel-heading text-zinc-500 border-t border-zinc-800">
              <span>OFFICIAL BAR DATABASE ENTRY</span>
              <a
                href={`https://www.beyondallreason.info/unit/${unit.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-zinc-300 hover:text-white transition-none"
              >
                <span>WIKI DOSSIER</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
