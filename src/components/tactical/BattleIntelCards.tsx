"use client";

import React, { useRef, useEffect } from "react";
import {
  ShieldAlert,
  Swords,
  AlertTriangle,
  TrendingUp,
  Activity,
  Tv,
  Check,
  Radio,
  Eye,
  Crosshair,
} from "lucide-react";
import { type Faction } from "@/lib/game-data";
import { type TacticalBattleIntel } from "@/hooks/useLiveGame";

export interface BattleIntelCardsProps {
  faction: Faction;
  battleIntel?: TacticalBattleIntel;
  accentColor?: string;
  className?: string;
}

export function BattleIntelCards({
  faction = "Armada",
  battleIntel,
  accentColor: customAccent,
  className = "",
}: BattleIntelCardsProps) {
  const isArmada = faction === "Armada";
  const accentColor = customAccent || (isArmada ? "#449bed" : "#ff2244");

  // Live state values with accurate tactical fallbacks
  const friendlyCount = battleIntel?.friendlyUnitsCount ?? 1;
  const friendlyBreakdown = battleIntel?.friendlyBreakdown ?? { raiders: 0, skirmishers: 0, assault: 0, air: 0 };
  const enemyCount = battleIntel?.enemyUnitsCount ?? 0;
  const enemyBreakdown = battleIntel?.enemyBreakdown ?? { raiders: 0, skirmishers: 0, assault: 0, air: 0 };
  const teammates = battleIntel?.teammates ?? [];
  const enemyPush = battleIntel?.enemyPush ?? null;
  const playerName = battleIntel?.playerName || "Grant_P";
  const enemyName = battleIntel?.enemyName || "Hostile Force";
  const playerMetalIncome = battleIntel?.playerMetalIncome ?? 12.0;
  const playerEnergyIncome = battleIntel?.playerEnergyIncome ?? 210.0;

  // Canvas animations for radar sweeps
  const friendlyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const enemyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    let angle = 0;

    const render = () => {
      angle += 0.03;

      // Render Friendly Radar Feed
      if (friendlyCanvasRef.current) {
        const ctx = friendlyCanvasRef.current.getContext("2d");
        if (ctx) {
          const w = friendlyCanvasRef.current.width;
          const h = friendlyCanvasRef.current.height;
          ctx.clearRect(0, 0, w, h);

          // Grid
          ctx.strokeStyle = "rgba(68, 155, 237, 0.12)";
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Sweep Line
          ctx.strokeStyle = "rgba(68, 155, 237, 0.35)";
          ctx.beginPath();
          const sweepX = (Math.sin(angle) * 0.5 + 0.5) * w;
          ctx.moveTo(sweepX, 0);
          ctx.lineTo(sweepX, h);
          ctx.stroke();

          // Friendly Blips
          ctx.fillStyle = "#22c55e";
          const blips = [
            { x: w * 0.3, y: h * 0.45 },
            { x: w * 0.35, y: h * 0.6 },
            { x: w * 0.48, y: h * 0.35 },
            { x: w * 0.55, y: h * 0.5 },
            { x: w * 0.65, y: h * 0.4 },
          ];
          blips.forEach((b) => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      // Render Enemy Threat Canvas
      if (enemyCanvasRef.current) {
        const ctx = enemyCanvasRef.current.getContext("2d");
        if (ctx) {
          const w = enemyCanvasRef.current.width;
          const h = enemyCanvasRef.current.height;
          ctx.clearRect(0, 0, w, h);

          // Dark Red Grid
          ctx.strokeStyle = "rgba(239, 68, 68, 0.12)";
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Threat Vectors / Arrow
          ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -angle * 10;
          ctx.beginPath();
          ctx.moveTo(w * 0.85, h * 0.25);
          ctx.lineTo(w * 0.45, h * 0.65);
          ctx.stroke();
          ctx.setLineDash([]);

          // Enemy Red Pulse Blips
          const pulse = (Math.sin(angle * 2) * 0.5 + 0.5) * 3;
          ctx.fillStyle = "#ef4444";
          const enemyBlips = [
            { x: w * 0.75, y: h * 0.3 },
            { x: w * 0.8, y: h * 0.4 },
            { x: w * 0.65, y: h * 0.5 },
            { x: w * 0.58, y: h * 0.55 },
          ];
          enemyBlips.forEach((b) => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3 + pulse * 0.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className={`flex flex-col gap-2.5 font-pixel-body select-none ${className}`}>
      {/* ========================================================================= */}
      {/* DISCORD SCREENSHARE HEADER BAR                                            */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between text-zinc-400 px-1 text-[9px] font-pixel-heading tracking-wide">
        <div className="flex items-center gap-1.5">
          <Tv className="size-3 text-zinc-400" />
          <span>Screenshare</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300">BATTLE INTEL</span>
        </div>
        <div className="flex items-center gap-1 text-[8px] text-zinc-500">
          <span className="size-1.5 rounded-full bg-emerald-500 arcade-blink" />
          <span>LIVE 60FPS</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARD 1: FRIENDLY FORCES & TEAMMATE ECONOMY STREAM                        */}
      {/* ========================================================================= */}
      <div className="relative rounded-lg overflow-hidden border-2 border-zinc-700/80 bg-[#090b12]/95 shadow-[0_8px_20px_rgba(0,0,0,0.7)] group">
        {/* Animated Background Canvas */}
        <canvas
          ref={friendlyCanvasRef}
          width={320}
          height={160}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40"
        />

        {/* Top-Left Discord Active Checkmark Badge */}
        <div className="absolute top-2 left-2 z-10 size-5 rounded bg-[#4f46e5] flex items-center justify-center text-white shadow-md">
          <Check className="size-3.5 stroke-[3]" />
        </div>

        {/* Top-Right Force Counter Badge */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 border border-emerald-500/60 text-emerald-400 font-pixel-heading text-[9px] font-bold shadow">
          <ShieldAlert className="size-3" />
          <span>FRIENDLY: {friendlyCount}</span>
        </div>

        {/* Content Container */}
        <div className="relative z-10 p-2.5 pt-7 flex flex-col justify-between min-h-[135px] h-auto gap-2">
          {/* Unit Composition Breakdown Pills */}
          <div className="flex items-center gap-1.5 flex-wrap font-pixel-heading text-[8px]">
            {friendlyCount === 1 && friendlyBreakdown.raiders === 0 && friendlyBreakdown.skirmishers === 0 ? (
              <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-700 text-emerald-300">
                1x COMMANDER (ARMOR ACTIVE)
              </span>
            ) : (
              <>
                <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-700 text-zinc-300">
                  {friendlyBreakdown.raiders}x RAIDERS
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-700 text-zinc-300">
                  {friendlyBreakdown.skirmishers}x SKIRMISH
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-700 text-zinc-300">
                  {friendlyBreakdown.assault}x ASSAULT
                </span>
                {friendlyBreakdown.air > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-700 text-[#449bed]">
                    {friendlyBreakdown.air}x AIR
                  </span>
                )}
              </>
            )}
          </div>

          {/* Teammates Economy or Solo Player Economy Bar */}
          <div className="space-y-1 mt-auto pb-4">
            <div className="text-[7.5px] font-pixel-heading text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="size-2.5 text-zinc-500" />
              <span>{teammates.length > 0 ? "TEAMMATES ECONOMY FLOW:" : "PLAYER COMMAND & ECONOMY:"}</span>
            </div>

            {teammates.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {teammates.map((tm, idx) => {
                  const isStall = tm.status === "STALLING_ENERGY" || tm.status === "STALLING_METAL";
                  return (
                    <div
                      key={idx}
                      className={`px-2 py-1 rounded bg-black/85 border text-[8px] font-pixel-heading flex flex-col gap-0.5 ${
                        isStall ? "border-amber-500/80 bg-amber-950/40" : "border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-200 font-bold truncate">{tm.name}</span>
                        <span
                          className={`text-[7px] px-1 py-0.2 rounded font-bold ${
                            tm.techTier === "T2" ? "bg-purple-950 text-purple-300 border border-purple-800" : "text-zinc-400"
                          }`}
                        >
                          {tm.techTier} {tm.role.split(" ")[0]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-bold text-[8px]">
                        <span className="text-[#94a3b8] flex items-center gap-0.5">
                          <img src="/metal.png" alt="M" className="size-2.5 object-contain pixelated inline-block" />
                          +{tm.metalIncome}
                        </span>
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <img src="/energy.png" alt="E" className="size-2.5 object-contain pixelated inline-block" />
                          +{tm.energyIncome}
                        </span>
                      </div>

                      {isStall && (
                        <div className="text-[7px] text-red-400 flex items-center gap-0.5 font-bold animate-pulse">
                          <AlertTriangle className="size-2" />
                          {tm.status === "STALLING_ENERGY" ? "STALLING ENERGY!" : "STALLING METAL!"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-2 py-1 rounded bg-black/85 border border-zinc-800 text-[8px] font-pixel-heading flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                  <span className="text-zinc-200 font-bold truncate">{playerName}</span>
                  <span className="text-[7px] text-zinc-400">({faction})</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-[8px] shrink-0">
                  <span className="text-[#94a3b8] flex items-center gap-0.5">
                    <img src="/metal.png" alt="M" className="size-2.5 object-contain pixelated inline-block" />
                    +{playerMetalIncome}
                  </span>
                  <span className="text-amber-400 flex items-center gap-0.5">
                    <img src="/energy.png" alt="E" className="size-2.5 object-contain pixelated inline-block" />
                    +{playerEnergyIncome}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Center Streamer Pill Badge (Matching user image) */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/80 border border-zinc-700/80 text-[7.5px] font-pixel-heading text-zinc-300 flex items-center gap-1 shadow pointer-events-none max-w-[90%] truncate">
            <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">{playerName} (Commander)</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARD 2: ENEMY RECON & PUSH RADAR STREAM                                   */}
      {/* ========================================================================= */}
      <div className="relative rounded-lg overflow-hidden border-2 border-zinc-700/80 bg-[#0c080a]/95 shadow-[0_8px_20px_rgba(0,0,0,0.7)] group">
        {/* Animated Radar Canvas */}
        <canvas
          ref={enemyCanvasRef}
          width={320}
          height={160}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40"
        />

        {/* Top-Left Status Badge (Matching user image: Dark square camera icon) */}
        <div className="absolute top-2 left-2 z-10 size-5 rounded bg-[#1e2029] border border-zinc-700 flex items-center justify-center text-zinc-400 shadow-md">
          <Crosshair className="size-3 text-red-400" />
        </div>

        {/* Top-Right Enemy Unit Counter */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 border border-red-500/70 text-red-400 font-pixel-heading text-[9px] font-bold shadow">
          <Swords className="size-3" />
          <span>ENEMY: ~{enemyCount}</span>
        </div>

        {/* Content Container */}
        <div className="relative z-10 p-2.5 pt-7 flex flex-col justify-between min-h-[135px] h-auto gap-2">
          {/* Enemy Breakdown Pills */}
          <div className="flex items-center gap-1.5 flex-wrap font-pixel-heading text-[8px]">
            {enemyCount === 0 ? (
              <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-500">
                NO HOSTILE CONTACTS IN SIGHT
              </span>
            ) : (
              <>
                <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-400">
                  ~{enemyBreakdown.raiders}x RAIDERS
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-400">
                  ~{enemyBreakdown.skirmishers}x SKIRMISH
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-400">
                  ~{enemyBreakdown.assault}x ASSAULT
                </span>
              </>
            )}
          </div>

          {/* Dynamic Enemy Push Alert Banner */}
          <div className="pb-4">
            {enemyPush ? (
              <div className="p-2 rounded bg-red-950/80 border-2 border-red-600/90 text-red-200 space-y-1 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[8.5px] font-pixel-heading font-bold text-red-300">
                    <span className="size-2 rounded-full bg-red-500 arcade-blink" />
                    <span>{enemyPush.threatLevel} PUSH ALERT</span>
                  </div>
                  <span className="text-[8px] font-pixel-heading font-bold text-amber-300 px-1 py-0.2 bg-black/60 rounded border border-amber-500/60">
                    ETA: {enemyPush.estimatedArrivalSeconds}s
                  </span>
                </div>

                <div className="text-[9.5px] font-pixel-heading font-bold text-white leading-tight">
                  {enemyPush.headline}
                </div>

                <div className="text-xs font-pixel-body text-red-200/90 line-clamp-1">
                  ⚡ <span className="text-zinc-300">Advice:</span> {enemyPush.tacticalAdvice}
                </div>
              </div>
            ) : (
              <div className="p-2 rounded bg-black/80 border border-zinc-800/90 text-zinc-400 text-center font-pixel-heading text-[8px] space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold">
                  <span className="size-1.5 rounded-full bg-emerald-400 arcade-blink" />
                  <span>FOG OF WAR // RADAR CLEAR</span>
                </div>
                <div className="text-[7.5px] text-zinc-500 font-pixel-body">
                  No hostile combat formations detected in forward sectors.
                </div>
              </div>
            )}
          </div>

          {/* Bottom Center Streamer Pill Badge */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/80 border border-zinc-700/80 text-[7.5px] font-pixel-heading text-zinc-300 flex items-center gap-1 shadow pointer-events-none max-w-[90%] truncate">
            <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
            <span className="truncate">{enemyName} [Recon / Radar]</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BattleIntelCards;
