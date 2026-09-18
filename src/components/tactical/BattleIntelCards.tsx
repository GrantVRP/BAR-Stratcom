"use client";

import React, { useRef, useEffect, useMemo } from "react";
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
  Users,
  Globe,
  Award,
} from "lucide-react";
import { type Faction } from "@/lib/game-data";
import { type TacticalBattleIntel } from "@/hooks/useLiveGame";
import { useBarBattles } from "@/hooks/useBarBattles";

export interface BattleIntelCardsProps {
  faction: Faction;
  gameStatus?: "OFFLINE" | "IN_LOBBY" | "IN_GAME";
  battleIntel?: TacticalBattleIntel;
  accentColor?: string;
  className?: string;
  lobbyName?: string;
  mapName?: string;
}

export function BattleIntelCards({
  faction = "Armada",
  gameStatus = "OFFLINE",
  battleIntel,
  accentColor: customAccent,
  className = "",
  lobbyName,
  mapName,
}: BattleIntelCardsProps) {
  const isArmada = faction === "Armada";
  const accentColor = customAccent || (isArmada ? "#449bed" : "#ff2244");

  const isGame = gameStatus === "IN_GAME";
  const isLobby = gameStatus === "IN_LOBBY";
  const isOffline = !isGame && !isLobby;

  // Live state values with accurate tactical fallbacks (only active in game)
  const friendlyCount = battleIntel?.friendlyUnitsCount ?? 1;
  const friendlyBreakdown = battleIntel?.friendlyBreakdown ?? { raiders: 0, skirmishers: 0, assault: 0, air: 0 };
  const enemyCount = battleIntel?.enemyUnitsCount ?? 0;
  const enemyBreakdown = battleIntel?.enemyBreakdown ?? { raiders: 0, skirmishers: 0, assault: 0, air: 0 };
  const teammates = battleIntel?.teammates ?? [];
  const enemyPush = battleIntel?.enemyPush ?? null;
  const playerName = battleIntel?.playerName || "Commander";
  const enemyName = battleIntel?.enemyName || "Hostile Force";
  const playerMetalIncome = battleIntel?.playerMetalIncome ?? 12.0;
  const playerEnergyIncome = battleIntel?.playerEnergyIncome ?? 210.0;

  // Live competitive BAR API battle scouting (active in lobby)
  const { battles, isLoading: isBattlesLoading } = useBarBattles({
    autoPoll: isLobby,
    pollIntervalMs: 25000,
  });

  const matchedLobby = useMemo(() => {
    if (!isLobby || battles.length === 0) return null;
    // 1. Match by player name if player has non-default username
    if (playerName && playerName !== "Commander") {
      const byPlayer = battles.find((b) =>
        b.players?.some((p) => p.username.toLowerCase() === playerName.toLowerCase())
      );
      if (byPlayer) return byPlayer;
    }
    // 2. Match by lobbyName if provided
    if (lobbyName) {
      const lLower = lobbyName.toLowerCase();
      const byTitle = battles.find(
        (b) => b.title.toLowerCase().includes(lLower) || lLower.includes(b.title.toLowerCase())
      );
      if (byTitle) return byTitle;
    }
    // 3. Match by mapName if provided
    if (mapName) {
      const mLower = mapName.toLowerCase();
      const byMap = battles.find(
        (b) => b.map.toLowerCase().includes(mLower) || mLower.includes(b.map.toLowerCase())
      );
      if (byMap) return byMap;
    }
    // 4. Default to first active lobby with players
    return battles.find((b) => (b.players?.length || 0) > 0) || battles[0] || null;
  }, [isLobby, battles, playerName, lobbyName, mapName]);

  const lobbyScoutedOpponents = useMemo(() => {
    if (!matchedLobby?.players) return [];
    const lowerPlayer = (playerName || "").toLowerCase();
    return [...matchedLobby.players]
      .filter((p) => p.username.toLowerCase() !== lowerPlayer)
      .sort((a, b) => (b.skillNumeric || 0) - (a.skillNumeric || 0));
  }, [matchedLobby, playerName]);

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
          ctx.strokeStyle = isGame ? "rgba(68, 155, 237, 0.12)" : "rgba(100, 116, 139, 0.07)";
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

          // Sweep Line (only active when game or lobby running)
          if (!isOffline) {
            ctx.strokeStyle = isGame ? "rgba(68, 155, 237, 0.35)" : "rgba(100, 116, 139, 0.2)";
            ctx.beginPath();
            const sweepX = (Math.sin(angle) * 0.5 + 0.5) * w;
            ctx.moveTo(sweepX, 0);
            ctx.lineTo(sweepX, h);
            ctx.stroke();
          }

          // Friendly Blips - ONLY WHEN IN ACTIVE GAME!
          if (isGame) {
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
      }

      // Render Enemy Threat Canvas
      if (enemyCanvasRef.current) {
        const ctx = enemyCanvasRef.current.getContext("2d");
        if (ctx) {
          const w = enemyCanvasRef.current.width;
          const h = enemyCanvasRef.current.height;
          ctx.clearRect(0, 0, w, h);

          // Grid
          ctx.strokeStyle = isGame ? "rgba(239, 68, 68, 0.12)" : "rgba(100, 116, 139, 0.07)";
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

          // Threat Vectors / Arrow & Blips - ONLY WHEN IN ACTIVE GAME AND DETECTED THREATS!
          if (isGame && (enemyCount > 0 || enemyPush)) {
            if (enemyPush) {
              ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.lineDashOffset = -angle * 10;
              ctx.beginPath();
              ctx.moveTo(w * 0.85, h * 0.25);
              ctx.lineTo(w * 0.45, h * 0.65);
              ctx.stroke();
              ctx.setLineDash([]);
            }

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
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isGame, isOffline, enemyCount, enemyPush]);

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
        <div className="flex items-center gap-1 text-[8px]">
          {isGame ? (
            <>
              <span className="size-1.5 rounded-full bg-emerald-500 arcade-blink" />
              <span className="text-emerald-400 font-bold">LIVE 60FPS</span>
            </>
          ) : isLobby ? (
            <>
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-300 font-bold">LOBBY STAGING</span>
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-zinc-600" />
              <span className="text-zinc-500">OFFLINE // STANDBY</span>
            </>
          )}
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
        {isGame ? (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 border border-emerald-500/60 text-emerald-400 font-pixel-heading text-[9px] font-bold shadow">
            <ShieldAlert className="size-3" />
            <span>FRIENDLY: {friendlyCount}</span>
          </div>
        ) : isLobby ? (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 border border-zinc-700 text-emerald-400 font-pixel-heading text-[9px] font-bold shadow">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>LOBBY // PRE-MATCH</span>
          </div>
        ) : (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 border border-zinc-800 text-zinc-500 font-pixel-heading text-[9px] font-bold shadow">
            <span className="size-1.5 rounded-full bg-zinc-600" />
            <span>STATUS: OFFLINE</span>
          </div>
        )}

        {/* Content Container */}
        <div className="relative z-10 p-2.5 pt-7 flex flex-col justify-between min-h-[135px] h-auto gap-2">
          {/* Unit Composition Breakdown Pills */}
          {isGame ? (
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
          ) : isLobby ? (
            <div className="flex items-center gap-1.5 flex-wrap font-pixel-heading text-[8px]">
              <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-700 text-zinc-300">
                COMMANDER IN STAGING AREA
              </span>
              <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-500">
                0 COMBAT UNITS DEPLOYED
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap font-pixel-heading text-[8px]">
              <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-500">
                FEED OFFLINE
              </span>
              <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-600">
                AWAITING ENGINE LINK
              </span>
            </div>
          )}

          {/* Teammates Economy or Solo Player Economy Bar */}
          {isGame ? (
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
          ) : isLobby ? (
            <div className="space-y-1.5 mt-auto pb-4">
              <div className="text-[7.5px] font-pixel-heading text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="size-2.5 text-zinc-500" />
                <span>LOBBY TELEMETRY READY</span>
              </div>
              <div className="px-2.5 py-2 rounded bg-black/85 border border-zinc-800 text-[8px] font-pixel-heading space-y-1">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    {playerName}
                  </span>
                  <span className="text-zinc-400 text-[7.5px]">Faction: {faction}</span>
                </div>
                <div className="text-[7px] text-zinc-500 font-pixel-body">
                  Player Commander staged in match lobby. Live economy flow & army census will activate once match starts.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 mt-auto pb-4">
              <div className="text-[7.5px] font-pixel-heading text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Activity className="size-2.5 text-zinc-600" />
                <span>TELEMETRY SENSORS OFFLINE</span>
              </div>
              <div className="px-2.5 py-2 rounded bg-black/85 border border-zinc-800/80 text-[8px] font-pixel-heading space-y-1">
                <div className="text-zinc-400 font-bold flex items-center gap-1.5">
                  <Radio className="size-3 text-zinc-500" />
                  No Live Match Connected
                </div>
                <div className="text-[7px] text-zinc-500 font-pixel-body leading-relaxed">
                  Launch Beyond All Reason or connect bridge daemon to stream real-time unit counts and teammate economy.
                </div>
              </div>
            </div>
          )}

          {/* Bottom Center Streamer Pill Badge */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/80 border border-zinc-700/80 text-[7.5px] font-pixel-heading text-zinc-300 flex items-center gap-1 shadow pointer-events-none max-w-[90%] truncate">
            {isGame ? (
              <>
                <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{playerName} (Commander)</span>
              </>
            ) : isLobby ? (
              <>
                <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{playerName} [In Lobby]</span>
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-zinc-600 shrink-0" />
                <span className="truncate">Telemetry Feed [Offline]</span>
              </>
            )}
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

        {/* Top-Left Status Badge */}
        <div className="absolute top-2 left-2 z-10 size-5 rounded bg-[#1e2029] border border-zinc-700 flex items-center justify-center text-zinc-400 shadow-md">
          <Crosshair className={`size-3 ${isGame ? "text-red-400" : isLobby ? "text-amber-400" : "text-zinc-500"}`} />
        </div>

        {/* Top-Right Enemy Unit Counter */}
        {isGame ? (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 border border-red-500/70 text-red-400 font-pixel-heading text-[9px] font-bold shadow">
            <Swords className="size-3" />
            <span>ENEMY: ~{enemyCount}</span>
          </div>
        ) : isLobby ? (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 border border-zinc-700 text-amber-400 font-pixel-heading text-[9px] font-bold shadow">
            {matchedLobby ? (
              <>
                <Users className="size-3" />
                <span>LOBBY: {matchedLobby.players.length}/{matchedLobby.maxPlayers}</span>
              </>
            ) : (
              <>
                <Eye className="size-3" />
                <span>RADAR: STANDBY</span>
              </>
            )}
          </div>
        ) : (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 border border-zinc-800 text-zinc-500 font-pixel-heading text-[9px] font-bold shadow">
            <Crosshair className="size-3 text-zinc-500" />
            <span>RECON: STANDBY</span>
          </div>
        )}

        {/* Content Container */}
        <div className="relative z-10 p-2.5 pt-7 flex flex-col justify-between min-h-[135px] h-auto gap-2">
          {/* Enemy Breakdown Pills */}
          {isGame ? (
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
          ) : isLobby ? (
            <div className="flex items-center gap-1.5 flex-wrap font-pixel-heading text-[8px]">
              {matchedLobby ? (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-700 text-amber-300">
                    MAP: {matchedLobby.map || "CUSTOM"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-700 text-zinc-300">
                    {matchedLobby.players.length} COMBATANTS
                  </span>
                  {matchedLobby.passworded && (
                    <span className="px-1.5 py-0.5 rounded bg-black/70 border border-amber-800/80 text-amber-400">
                      PRIVATE
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-400">
                    AWAITING MATCH START
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-500">
                    RADAR SWEEP READY
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap font-pixel-heading text-[8px]">
              <span className="px-1.5 py-0.5 rounded bg-black/70 border border-zinc-800 text-zinc-600">
                RADAR SENSORS DISCONNECTED
              </span>
            </div>
          )}

          {/* Dynamic Enemy Push Alert Banner or Standby State */}
          {isGame ? (
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
          ) : isLobby ? (
            <div className="pb-4">
              {matchedLobby && matchedLobby.players.length > 0 ? (
                <div className="p-2 rounded bg-black/85 border border-zinc-800 text-[8px] font-pixel-heading space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-300">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400 truncate max-w-[170px]">
                      <Globe className="size-2.5 shrink-0" />
                      <span className="truncate">{matchedLobby.title}</span>
                    </div>
                    <span className="text-[7px] text-zinc-500 font-mono">
                      ID #{matchedLobby.battleId}
                    </span>
                  </div>

                  {/* Top Scouted Opponents Roster */}
                  <div className="space-y-1">
                    <div className="text-[7px] text-zinc-500 uppercase flex items-center justify-between">
                      <span>OPPONENT SCOUT (TOP RATINGS)</span>
                      <span>OPENSKILL</span>
                    </div>
                    <div className="space-y-0.5 max-h-[56px] overflow-y-auto custom-scrollbar">
                      {lobbyScoutedOpponents.slice(0, 3).map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-1.5 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[7.5px]"
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            {p.country && (
                              <span className="text-[7px] font-mono text-zinc-400">
                                [{p.country.toUpperCase()}]
                              </span>
                            )}
                            <span className="text-zinc-200 font-bold truncate max-w-[95px]">
                              {p.username}
                            </span>
                            {p.status?.rank !== undefined && (
                              <span className="text-[6.5px] px-1 rounded bg-zinc-800 text-zinc-400">
                                R{p.status.rank}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-amber-300">
                            <Award className="size-2 text-amber-400" />
                            <span>
                              {p.skillNumeric
                                ? p.skillNumeric.toFixed(1)
                                : p.skill?.replace(/[[\]?]/g, "").trim() || "--"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-black/80 border border-zinc-800 text-zinc-400 text-center font-pixel-heading text-[8px] space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-zinc-300 font-bold">
                    <span className="size-1.5 rounded-full bg-amber-400" />
                    <span>GLOBAL SCOUTING STANDBY</span>
                  </div>
                  <div className="text-[7.5px] text-zinc-500 font-pixel-body">
                    {isBattlesLoading
                      ? "Connecting to BAR global battle stream..."
                      : "No direct lobby match identified. Hostile radar will activate at match drop."}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="pb-4">
              <div className="p-2.5 rounded bg-black/80 border border-zinc-800 text-zinc-500 text-center font-pixel-heading text-[8px] space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-zinc-400 font-bold">
                  <Crosshair className="size-3 text-zinc-500" />
                  <span>THREAT MATRIX DISCONNECTED</span>
                </div>
                <div className="text-[7.5px] text-zinc-500 font-pixel-body">
                  Radar tracking sensors are offline. Enemy push prediction will engage when an active match begins.
                </div>
              </div>
            </div>
          )}

          {/* Bottom Center Streamer Pill Badge */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/80 border border-zinc-700/80 text-[7.5px] font-pixel-heading text-zinc-300 flex items-center gap-1 shadow pointer-events-none max-w-[90%] truncate">
            {isGame ? (
              <>
                <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="truncate">{enemyName} [Recon / Radar]</span>
              </>
            ) : isLobby ? (
              <>
                <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="truncate">
                  {matchedLobby ? `Scouting: ${matchedLobby.title}` : "Hostile Recon [Awaiting Drop]"}
                </span>
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-zinc-600 shrink-0" />
                <span className="truncate">Hostile Recon [Offline]</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BattleIntelCards;
