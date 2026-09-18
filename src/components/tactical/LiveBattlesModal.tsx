"use client";

import React, { useState } from "react";
import {
  X,
  Swords,
  Search,
  RefreshCw,
  Users,
  ShieldAlert,
  Globe,
  Award,
  Zap,
} from "lucide-react";
import { type BarBattle, type BarBattlePlayer } from "@/lib/bar-api";
import { useBarBattles } from "@/hooks/useBarBattles";

export interface LiveBattlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

export function LiveBattlesModal({
  isOpen,
  onClose,
  accentColor = "#449bed",
}: LiveBattlesModalProps) {
  const { battles, isLoading, error, refresh, lastUpdated } = useBarBattles({
    autoPoll: isOpen,
    pollIntervalMs: 25000,
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBattle, setSelectedBattle] = useState<BarBattle | null>(null);

  if (!isOpen) return null;

  const filteredBattles = battles.filter((b) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const titleMatch = b.title.toLowerCase().includes(q);
    const mapMatch = b.map.toLowerCase().includes(q);
    const playerMatch = (b.players || []).some((p) =>
      p.username.toLowerCase().includes(q)
    );
    return titleMatch || mapMatch || playerMatch;
  });

  // Calculate team balance & estimated win probabilities for a battle
  const calculateBattleTeams = (battle: BarBattle) => {
    const players = battle.players || [];
    const playing = players.filter((p) => p.gameStatus !== "Spectating");

    // Split roughly into Team 1 vs Team 2 based on team index or half
    const half = Math.ceil(playing.length / 2);
    const team1 = playing.slice(0, half);
    const team2 = playing.slice(half);

    const avgSkill1 =
      team1.length > 0
        ? team1.reduce((sum, p) => sum + (p.skillNumeric || 15), 0) / team1.length
        : 15;
    const avgSkill2 =
      team2.length > 0
        ? team2.reduce((sum, p) => sum + (p.skillNumeric || 15), 0) / team2.length
        : 15;

    // Win probability calculation using logistic function on skill difference
    const diff = avgSkill1 - avgSkill2;
    const winProb1 = Math.round((1 / (1 + Math.exp(-diff / 6))) * 100);
    const winProb2 = 100 - winProb1;

    return { team1, team2, avgSkill1, avgSkill2, winProb1, winProb2 };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm font-pixel-body select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#0c0e17] border-2 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.9),_3px_3px_0px_#000] flex flex-col overflow-hidden text-zinc-200"
        style={{ borderColor: accentColor }}
      >
        {/* Modal Header */}
        <div
          className="px-4 py-3 bg-[#131624] border-b flex items-center justify-between"
          style={{ borderColor: `${accentColor}40` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="size-7 rounded flex items-center justify-center text-white shadow"
              style={{ backgroundColor: accentColor }}
            >
              <Swords className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-pixel-heading text-sm font-bold tracking-wider"
                  style={{ color: accentColor }}
                >
                  LIVE BATTLES & OPPONENT SCOUT
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-pixel-heading">
                  ● {battles.length} SERVERS ONLINE
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Live matchmaking lobbies and active battle intelligence across Beyond All Reason.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={isLoading}
              title="Refresh live servers"
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

        {/* Search & Filter Bar */}
        <div className="p-3 bg-[#0f121d] border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by player name, lobby title, or map..."
              className="w-full pl-9 pr-3 py-1.5 bg-black/70 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#449bed] font-pixel-body"
            />
          </div>
          {lastUpdated && (
            <span className="text-[9px] font-pixel-heading text-zinc-500 shrink-0">
              Synced: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Main Content: Split List + Detail View */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          {/* Server List Column (5 cols) */}
          <div className="md:col-span-5 p-2 overflow-y-auto max-h-[55vh] md:max-h-none space-y-1.5 custom-scrollbar">
            {isLoading && battles.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-pixel-heading">
                Scanning global lobby relays...
              </div>
            ) : filteredBattles.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-pixel-heading">
                No matching live battles found.
              </div>
            ) : (
              filteredBattles.map((battle) => {
                const isSelected = selectedBattle?.battleId === battle.battleId;
                const playerCount = (battle.players || []).length;
                const isFull = playerCount >= battle.maxPlayers;

                return (
                  <div
                    key={battle.battleId}
                    onClick={() => setSelectedBattle(battle)}
                    className={`p-2.5 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#162035] border-[#449bed] shadow-md"
                        : "bg-[#0a0c14] border-zinc-800 hover:border-zinc-700 hover:bg-[#101320]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-pixel-heading font-bold text-zinc-100 truncate flex-1">
                        {battle.title}
                      </h4>
                      <span
                        className={`text-[9px] font-pixel-heading px-1.5 py-0.2 rounded shrink-0 ${
                          isFull
                            ? "bg-red-950 text-red-300 border border-red-800"
                            : "bg-black/60 text-zinc-400 border border-zinc-800"
                        }`}
                      >
                        {playerCount}/{battle.maxPlayers}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="text-[#449bed] font-bold truncate max-w-[170px]">
                        🗺️ {battle.map}
                      </span>
                      <span className="text-[8.5px] text-zinc-500 font-pixel-heading">
                        Host: {battle.founder?.username}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Battle Scout Inspector (7 cols) */}
          <div className="md:col-span-7 p-3 overflow-y-auto max-h-[55vh] md:max-h-none custom-scrollbar bg-[#090b12]">
            {selectedBattle ? (
              (() => {
                const { team1, team2, avgSkill1, avgSkill2, winProb1, winProb2 } =
                  calculateBattleTeams(selectedBattle);

                return (
                  <div className="space-y-3">
                    {/* Header Detail Box */}
                    <div className="p-3 rounded bg-black/60 border border-zinc-800 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[8.5px] font-pixel-heading text-zinc-500 uppercase">
                            Room #{selectedBattle.battleId} // {selectedBattle.game}
                          </span>
                          <h3 className="text-sm font-pixel-heading font-bold text-white">
                            {selectedBattle.title}
                          </h3>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#449bed]/10 text-[#449bed] border border-[#449bed]/40 font-pixel-heading text-[10px] font-bold shrink-0">
                          {selectedBattle.map}
                        </span>
                      </div>

                      {/* Win Probability Prediction Bar */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-[9px] font-pixel-heading font-bold mb-1">
                          <span className="text-[#449bed]">TEAM 1 ({winProb1}%)</span>
                          <span className="text-zinc-500">PREDICTED WIN CHANCE</span>
                          <span className="text-red-400">TEAM 2 ({winProb2}%)</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-zinc-800 flex border border-zinc-700">
                          <div
                            className="bg-[#449bed] h-full transition-all duration-500"
                            style={{ width: `${winProb1}%` }}
                          />
                          <div
                            className="bg-red-500 h-full transition-all duration-500"
                            style={{ width: `${winProb2}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-zinc-500 font-pixel-heading mt-0.5">
                          <span>Avg OS: {avgSkill1.toFixed(1)}</span>
                          <span>Avg OS: {avgSkill2.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Team Rosters with OpenSkill Ratings & Ranks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Team 1 Roster */}
                      <div className="p-2.5 rounded bg-black/70 border border-[#449bed]/40 space-y-1.5">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1 text-[9px] font-pixel-heading font-bold text-[#449bed]">
                          <span>TEAM 1 ROSTER</span>
                          <span>{team1.length} PLAYERS</span>
                        </div>
                        <div className="space-y-1">
                          {team1.length === 0 ? (
                            <div className="text-[9px] text-zinc-600 italic">No players staged</div>
                          ) : (
                            team1.map((p) => (
                              <PlayerRosterRow key={p.userId} player={p} />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Team 2 Roster */}
                      <div className="p-2.5 rounded bg-black/70 border border-red-500/40 space-y-1.5">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1 text-[9px] font-pixel-heading font-bold text-red-400">
                          <span>TEAM 2 ROSTER</span>
                          <span>{team2.length} PLAYERS</span>
                        </div>
                        <div className="space-y-1">
                          {team2.length === 0 ? (
                            <div className="text-[9px] text-zinc-600 italic">No players staged</div>
                          ) : (
                            team2.map((p) => (
                              <PlayerRosterRow key={p.userId} player={p} isEnemy />
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Spectators if any */}
                    {selectedBattle.players.some((p) => p.gameStatus === "Spectating") && (
                      <div className="p-2 rounded bg-black/40 border border-zinc-850 text-[9px]">
                        <span className="text-zinc-500 font-pixel-heading uppercase">
                          Spectators:{" "}
                        </span>
                        <span className="text-zinc-400">
                          {selectedBattle.players
                            .filter((p) => p.gameStatus === "Spectating")
                            .map((p) => p.username)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-600">
                <ShieldAlert className="size-8 stroke-[1.5] mb-2 opacity-50" />
                <p className="font-pixel-heading text-xs text-zinc-400">SELECT A LIVE BATTLE</p>
                <p className="text-[10px] max-w-xs mt-1">
                  Inspect enemy player profiles, OpenSkill ratings, country flags, and win probability predictions.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 bg-[#090b12] border-t border-zinc-800 text-[9px] text-zinc-500 flex items-center justify-between">
          <span>Source: Official Beyond All Reason Live Relays (api.bar-rts.com)</span>
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

function PlayerRosterRow({
  player,
  isEnemy = false,
}: {
  player: BarBattlePlayer;
  isEnemy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 px-1.5 rounded bg-zinc-900/60 text-[9px] hover:bg-zinc-800/80 transition-colors">
      <div className="flex items-center gap-1.5 min-w-0">
        {player.country ? (
          <span className="text-[8px] font-mono uppercase text-zinc-500 shrink-0">
            [{player.country}]
          </span>
        ) : (
          <Globe className="size-2.5 text-zinc-600 shrink-0" />
        )}
        <span className="text-zinc-200 font-bold truncate max-w-[110px]">
          {player.username}
        </span>
        {player.status?.rank !== undefined && (
          <span className="text-[7.5px] px-1 rounded bg-zinc-800 text-zinc-400 font-pixel-heading shrink-0">
            ★{player.status.rank}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 font-pixel-heading font-bold">
        <span
          className={`text-[8.5px] ${
            isEnemy ? "text-red-400" : "text-[#449bed]"
          }`}
        >
          {player.skill || `[${(player.skillNumeric || 15).toFixed(1)}]`}
        </span>
      </div>
    </div>
  );
}
