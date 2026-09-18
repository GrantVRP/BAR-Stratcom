"use client";

import React, { useState } from "react";
import {
  X,
  History,
  Search,
  RefreshCw,
  Trophy,
  Flame,
  Shield,
  Clock,
  Zap,
} from "lucide-react";
import { useBarReplays } from "@/hooks/useBarReplays";
import { type BarReplaySummary, type BarReplayDetail } from "@/lib/bar-api";

export interface MatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
  defaultMap?: string;
}

export function MatchHistoryModal({
  isOpen,
  onClose,
  accentColor = "#449bed",
  defaultMap = "",
}: MatchHistoryModalProps) {
  const {
    playerName,
    setPlayerName,
    mapFilter,
    setMapFilter,
    replays,
    totalResults,
    selectedReplayDetail,
    setSelectedReplayDetail,
    loadReplayDetail,
    isLoading,
    isLoadingDetail,
    error,
    search,
  } = useBarReplays("");

  const [inputPlayer, setInputPlayer] = useState<string>("");

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerName(inputPlayer.trim());
    search(inputPlayer.trim(), mapFilter);
  };

  const handleFilterByCurrentMap = () => {
    const cleanMap = defaultMap.replace(/ v\d+(\.\d+)*$/, "");
    setMapFilter(cleanMap);
    search(playerName, cleanMap);
  };

  const handleClearFilters = () => {
    setInputPlayer("");
    setPlayerName("");
    setMapFilter("");
    search("", "");
  };

  const formatDuration = (ms: number): string => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm font-pixel-body select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[88vh] bg-[#0c0e17] border-2 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.9),_3px_3px_0px_#000] flex flex-col overflow-hidden text-zinc-200"
        style={{ borderColor: accentColor }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 bg-[#131624] border-b flex items-center justify-between"
          style={{ borderColor: `${accentColor}40` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="size-7 rounded flex items-center justify-center text-white shadow"
              style={{ backgroundColor: accentColor }}
            >
              <History className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-pixel-heading text-sm font-bold tracking-wider"
                  style={{ color: accentColor }}
                >
                  MATCH HISTORY & REPLAYS
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700 font-pixel-heading">
                  GLOBAL REPLAY ARCHIVE
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Inspect player match histories, opening performance, metal production, and combat efficiency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => search(playerName, mapFilter)}
              disabled={isLoading}
              title="Refresh replays"
              className="p-1.5 rounded bg-black/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-[#449bed]" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded bg-black/60 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-600 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Quick Map Filters */}
        <div className="p-3 bg-[#0f121d] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={inputPlayer}
                onChange={(e) => setInputPlayer(e.target.value)}
                placeholder="Enter player name (e.g. Grant_P)..."
                className="w-full pl-9 pr-3 py-1.5 bg-black/70 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#449bed] font-pixel-body"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-[#449bed] hover:bg-[#3b85cc] text-white font-pixel-heading text-xs font-bold transition-colors"
            >
              SEARCH
            </button>
          </form>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 text-[9px] font-pixel-heading">
            {defaultMap && (
              <button
                type="button"
                onClick={handleFilterByCurrentMap}
                className={`px-2 py-1 rounded border transition-colors ${
                  mapFilter
                    ? "bg-[#449bed]/20 text-[#449bed] border-[#449bed]"
                    : "bg-black/60 text-zinc-400 border-zinc-700 hover:text-white"
                }`}
              >
                🗺️ PRO REPLAYS: {defaultMap.split(" ")[0]}
              </button>
            )}
            {(playerName || mapFilter) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-2 py-1 rounded bg-black/60 hover:bg-zinc-800 text-zinc-400 border border-zinc-700"
              >
                CLEAR FILTER
              </button>
            )}
          </div>
        </div>

        {/* Main Body: Replays List + Detailed Stats Breakdown */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          {/* Replays List (6 cols) */}
          <div className="md:col-span-6 p-2.5 overflow-y-auto max-h-[50vh] md:max-h-none space-y-2 custom-scrollbar bg-[#090b12]">
            {isLoading ? (
              <div className="p-12 text-center text-zinc-500 text-xs font-pixel-heading">
                Searching Beyond All Reason replay repository...
              </div>
            ) : replays.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs font-pixel-heading">
                No replays found. Try another player name or clear filters.
              </div>
            ) : (
              replays.map((r) => {
                const isSelected = selectedReplayDetail?.id === r.id;
                const winningTeam = r.AllyTeams.find((t) => t.winningTeam);
                const isTargetWinner =
                  playerName &&
                  winningTeam?.Players.some(
                    (p) => p.name.toLowerCase() === playerName.toLowerCase()
                  );

                return (
                  <div
                    key={r.id}
                    onClick={() => loadReplayDetail(r.id)}
                    className={`p-2.5 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#18233a] border-[#449bed] shadow-md"
                        : "bg-[#0d101a] border-zinc-800 hover:border-zinc-700 hover:bg-[#121624]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <span className="font-pixel-heading text-xs font-bold text-zinc-100 truncate block">
                          🗺️ {r.Map.scriptName || r.Map.fileName}
                        </span>
                        <div className="flex items-center gap-2 text-[9px] text-zinc-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="size-2.5 text-zinc-500" />
                            {formatDuration(r.durationMs)}
                          </span>
                          <span>•</span>
                          <span>{new Date(r.startTime).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Winner / Status Badge */}
                      {playerName ? (
                        <span
                          className={`text-[8.5px] font-pixel-heading font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isTargetWinner
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                              : "bg-red-950 text-red-300 border border-red-800"
                          }`}
                        >
                          {isTargetWinner ? "VICTORY" : "DEFEAT"}
                        </span>
                      ) : (
                        <span className="text-[8.5px] font-pixel-heading px-1.5 py-0.5 rounded bg-black/60 text-zinc-400 border border-zinc-800">
                          {r.AllyTeams.reduce((sum, t) => sum + t.Players.length, 0)}P
                        </span>
                      )}
                    </div>

                    {/* Quick Player Peek */}
                    <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[8px] text-zinc-400">
                      <div className="truncate max-w-[200px]">
                        {r.AllyTeams.flatMap((t) => t.Players)
                          .slice(0, 4)
                          .map((p) => p.name)
                          .join(", ")}
                        ...
                      </div>
                      <span className="text-[#449bed] font-pixel-heading font-bold shrink-0">
                        INSPECT ➔
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Replay Details Column (6 cols) */}
          <div className="md:col-span-6 p-3 overflow-y-auto max-h-[50vh] md:max-h-none custom-scrollbar bg-[#0a0d16]">
            {isLoadingDetail ? (
              <div className="h-full flex items-center justify-center p-12 text-zinc-500 font-pixel-heading text-xs">
                Extracting match telemetry & award statistics...
              </div>
            ) : selectedReplayDetail ? (
              <div className="space-y-3">
                {/* Replay Header */}
                <div className="p-3 rounded bg-black/60 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-pixel-heading text-zinc-500 font-mono">
                      MATCH ID: {selectedReplayDetail.id.slice(0, 12)}...
                    </span>
                    <span className="text-[9px] font-pixel-heading px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                      ⏱️ {formatDuration(selectedReplayDetail.durationMs)}
                    </span>
                  </div>
                  <h3 className="font-pixel-heading text-sm font-bold text-white">
                    {selectedReplayDetail.Map?.scriptName}
                  </h3>
                  <div className="text-[9px] text-zinc-400">
                    Preset: {selectedReplayDetail.preset} • {new Date(selectedReplayDetail.startTime).toLocaleString()}
                  </div>
                </div>

                {/* Match Awards & Performance Indicators */}
                <div className="space-y-1.5">
                  <div className="text-[8.5px] font-pixel-heading text-zinc-400 uppercase flex items-center gap-1">
                    <Trophy className="size-3 text-amber-400" />
                    <span>OFFICIAL POST-GAME AWARDS & REVIEWS</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Metal / Energy Produced */}
                    <div className="p-2 rounded bg-black/70 border border-zinc-800 space-y-0.5">
                      <span className="text-[7.5px] font-pixel-heading text-zinc-500 uppercase flex items-center gap-1">
                        <Zap className="size-2.5 text-amber-400" /> Top Resources
                      </span>
                      <div className="font-pixel-heading text-xs font-bold text-amber-300">
                        {Math.round(
                          selectedReplayDetail.awards?.mostResourcesProduced?.[0]?.value || 0
                        ).toLocaleString()}{" "}
                        <span className="text-[8px] text-zinc-500">M+E</span>
                      </div>
                      <span className="text-[7.5px] text-zinc-500">Peak economy efficiency</span>
                    </div>

                    {/* Combat Units Destroyed */}
                    <div className="p-2 rounded bg-black/70 border border-zinc-800 space-y-0.5">
                      <span className="text-[7.5px] font-pixel-heading text-zinc-500 uppercase flex items-center gap-1">
                        <Flame className="size-2.5 text-red-400" /> Combat Impact
                      </span>
                      <div className="font-pixel-heading text-xs font-bold text-red-400">
                        {Math.round(
                          selectedReplayDetail.awards?.fightingUnitsDestroyed?.[0]?.value || 0
                        ).toLocaleString()}{" "}
                        <span className="text-[8px] text-zinc-500">XP</span>
                      </div>
                      <span className="text-[7.5px] text-zinc-500">Destroyed enemy army</span>
                    </div>
                  </div>
                </div>

                {/* Team Lineups with Start Positions */}
                <div className="space-y-2 pt-1">
                  {selectedReplayDetail.AllyTeams.map((team, idx) => {
                    const isWin = team.winningTeam;
                    return (
                      <div
                        key={team.allyTeamId || idx}
                        className={`p-2.5 rounded border text-[9px] ${
                          isWin
                            ? "bg-emerald-950/20 border-emerald-500/50"
                            : "bg-black/60 border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center justify-between font-pixel-heading font-bold mb-1.5">
                          <span className={isWin ? "text-emerald-400" : "text-zinc-400"}>
                            TEAM {idx + 1} {isWin ? "🏆 WINNER" : ""}
                          </span>
                          <span className="text-[8px] text-zinc-500">
                            {team.Players.length} PLAYERS
                          </span>
                        </div>

                        <div className="space-y-1">
                          {team.Players.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between py-0.5 px-1 rounded bg-black/40 text-[8.5px]"
                            >
                              <span className="text-zinc-200 font-bold truncate">
                                {p.name} ({p.faction || "Armada"})
                              </span>
                              <div className="flex items-center gap-1 font-mono text-[7.5px] text-zinc-400">
                                {p.startPos && (
                                  <span>
                                    Spawn: ({Math.round(p.startPos.x)}, {Math.round(p.startPos.z)})
                                  </span>
                                )}
                                {p.skill && <span className="text-[#449bed]">{p.skill}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-600">
                <History className="size-8 stroke-[1.5] mb-2 opacity-50" />
                <p className="font-pixel-heading text-xs text-zinc-400">SELECT A REPLAY</p>
                <p className="text-[10px] max-w-xs mt-1">
                  Inspect damage dealt, combat units destroyed, starting map coordinates, and macro economy performance.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 bg-[#090b12] border-t border-zinc-800 text-[9px] text-zinc-500 flex items-center justify-between">
          <span>Source: Official Beyond All Reason Replay DB (api.bar-rts.com)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-pixel-heading text-[10px]"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
