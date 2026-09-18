"use client";

import React, { useState } from "react";
import {
  X,
  Trophy,
  Crown,
  Medal,
  Search,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useBarLeaderboard } from "@/hooks/useBarLeaderboard";

export interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

export function LeaderboardModal({
  isOpen,
  onClose,
  accentColor = "#449bed",
}: LeaderboardModalProps) {
  const {
    season,
    setSeason,
    categories,
    selectedCategory,
    setSelectedCategory,
    activePlayers,
    isLoading,
    error,
    refresh,
  } = useBarLeaderboard(3);

  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!isOpen) return null;

  const filteredPlayers = activePlayers.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 font-pixel-body select-none">
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-[#0c0e17] border-2 rounded-none shadow-[0_16px_40px_rgba(0,0,0,0.9),_4px_4px_0px_#000] flex flex-col overflow-hidden text-zinc-200"
        style={{ borderColor: accentColor }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 bg-[#131624] border-b-2 flex items-center justify-between"
          style={{ borderColor: `${accentColor}40` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="size-7 rounded-none border border-black flex items-center justify-center text-white shadow"
              style={{ backgroundColor: accentColor }}
            >
              <Trophy className="size-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-pixel-heading text-sm font-bold tracking-wider"
                  style={{ color: accentColor }}
                >
                  OFFICIAL BAR LEADERBOARDS
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-none bg-amber-950 text-amber-300 border border-amber-700 font-pixel-heading">
                  SEASON {season}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Top 100 global rankings verified by the official Teiserver competitive rating system.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={isLoading}
              title="Refresh leaderboards"
              className="p-1.5 rounded-none bg-black/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-none"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-none bg-black/60 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-600 transition-none"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Division Navigation Tabs (Duel, Small Team, Large Team, FFA) */}
        <div className="flex items-center border-b-2 border-zinc-800 bg-[#0f121d] px-2 overflow-x-auto custom-scrollbar">
          {["Duel", "Small Team", "Large Team", "FFA"].map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`py-2 px-3 text-xs font-pixel-heading font-bold border-b-2 transition-none whitespace-nowrap ${
                  isSelected
                    ? "border-amber-400 text-amber-300 bg-amber-950/20"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {cat === "Duel"
                  ? "[1v1 DUEL]"
                  : cat === "Small Team"
                  ? "[SMALL TEAM]"
                  : cat === "Large Team"
                  ? "[8v8 LARGE TEAM]"
                  : "[FFA]"}
              </button>
            );
          })}
        </div>

        {/* Search Input Bar */}
        <div className="p-2.5 bg-[#0a0c14] border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search top ${selectedCategory} players...`}
              className="w-full pl-9 pr-3 py-1.5 bg-black/70 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-pixel-body"
            />
          </div>
          <span className="text-[9px] font-pixel-heading text-zinc-500 shrink-0">
            Showing {filteredPlayers.length} contenders
          </span>
        </div>

        {/* Leaderboard Table List */}
        <div className="flex-1 overflow-y-auto max-h-[55vh] p-2 space-y-1 custom-scrollbar bg-[#090b12]">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500 text-xs font-pixel-heading">
              Fetching official Teiserver ratings...
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs font-pixel-heading">
              No matching players found in {selectedCategory}.
            </div>
          ) : (
            filteredPlayers.map((player, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded border transition-all ${
                    isTop1
                      ? "bg-amber-950/40 border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : isTop2
                      ? "bg-slate-900/40 border-slate-400/60"
                      : isTop3
                      ? "bg-amber-950/20 border-amber-800/40"
                      : "bg-[#0c0e17] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#121522]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Position Badge */}
                    <div
                      className={`size-6 rounded flex items-center justify-center font-pixel-heading text-[10px] font-bold shrink-0 ${
                        isTop1
                          ? "bg-amber-400 text-black shadow"
                          : isTop2
                          ? "bg-slate-300 text-black shadow"
                          : isTop3
                          ? "bg-amber-700 text-white"
                          : "bg-black/60 text-zinc-400 border border-zinc-800"
                      }`}
                    >
                      {isTop1 ? (
                        <Crown className="size-3.5 fill-current" />
                      ) : (
                        `#${rank}`
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="font-pixel-heading text-xs font-bold text-zinc-100 truncate block">
                        {player.name}
                      </span>
                      <span className="text-[8px] text-zinc-500 font-mono">
                        User ID: {player.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-pixel-heading">
                    <span className="text-[8px] text-zinc-500 uppercase">LR:</span>
                    <span
                      className={`text-xs font-bold ${
                        isTop1
                          ? "text-amber-300"
                          : isTop2
                          ? "text-slate-200"
                          : isTop3
                          ? "text-amber-400"
                          : "text-[#449bed]"
                      }`}
                    >
                      {player.rating.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 bg-[#090b12] border-t border-zinc-800 text-[9px] text-zinc-500 flex items-center justify-between">
          <span>Source: server4.beyondallreason.info/teiserver</span>
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
