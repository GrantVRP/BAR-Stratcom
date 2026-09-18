"use client";

import React, { useState } from "react";
import {
  X,
  Flame,
  Search,
  RefreshCw,
  GitCommit,
  ExternalLink,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { useBarBalance } from "@/hooks/useBarBalance";

export interface PatchWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

export function PatchWatchModal({
  isOpen,
  onClose,
  accentColor = "#449bed",
}: PatchWatchModalProps) {
  const { changes, isLoading, error, refresh } = useBarBalance(35);
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!isOpen) return null;

  const filteredChanges = changes.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const msgMatch = c.message.toLowerCase().includes(q);
    const defMatch = (c.unitDefs || []).some((u) => u.name.toLowerCase().includes(q));
    const authorMatch = c.author?.name.toLowerCase().includes(q);
    return msgMatch || defMatch || authorMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 font-pixel-body select-none">
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-[#0c0e17] border-2 rounded-none shadow-[3px_3px_0px_#000] flex flex-col overflow-hidden text-zinc-200"
        style={{ borderColor: accentColor }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 bg-[#131624] border-b flex items-center justify-between"
          style={{ borderColor: `${accentColor}40` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="size-7 rounded-none flex items-center justify-center text-white shadow"
              style={{ backgroundColor: accentColor }}
            >
              <Flame className="size-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-pixel-heading text-sm font-bold tracking-wider"
                  style={{ color: accentColor }}
                >
                  PATCH WATCH // LIVE BALANCE INTEL
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-none bg-red-950 text-red-300 border border-red-700 font-pixel-heading">
                  OFFICIAL GITHUB COMMITS
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Live stream of unit balance modifications, weapon tweaks, and economy changes directly from the engine developers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={isLoading}
              title="Refresh patch notes"
              className="p-1.5 rounded-none bg-black/60 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-none active:translate-y-0.5"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-none bg-black/60 hover:bg-red-950/60 text-zinc-300 hover:text-red-300 border border-zinc-700 hover:border-red-600 transition-none active:translate-y-0.5"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 bg-[#0a0c14] border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by unit name (e.g. Flash, Aircon, Jammer, Wind)..."
              className="w-full pl-9 pr-3 py-1.5 bg-black/70 border border-zinc-700 rounded-none text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-pixel-body"
            />
          </div>
          <span className="text-[9px] font-pixel-heading text-zinc-400 shrink-0">
            {filteredChanges.length} patches tracked
          </span>
        </div>

        {/* Patch List */}
        <div className="flex-1 overflow-y-auto max-h-[55vh] p-3 space-y-2 custom-scrollbar bg-[#090b12]">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-400 text-xs font-pixel-heading">
              Scanning BAR repository balance commits...
            </div>
          ) : filteredChanges.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs font-pixel-heading">
              No matching balance changes found for &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredChanges.map((change) => {
              const dateStr = new Date(change.date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={change.sha}
                  className="p-3 rounded-none bg-[#0d101a] border border-zinc-800 hover:border-zinc-700 transition-none space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GitCommit className="size-3.5 text-amber-400 shrink-0" />
                      <span className="font-mono text-[9px] text-[#449bed]">
                        {change.sha.slice(0, 7)}
                      </span>
                      {change.author?.name && (
                        <span className="text-[8.5px] text-zinc-400 font-pixel-heading">
                          by {change.author.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[8.5px] text-zinc-400 font-pixel-heading">
                      <Calendar className="size-2.5" />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Patch Message / Description */}
                  <div className="text-xs text-zinc-200 font-pixel-body whitespace-pre-line leading-relaxed p-2 bg-black/40 border border-zinc-800/80">
                    {change.message}
                  </div>

                  {/* Impacted Unit Tags if present */}
                  {change.unitDefs && change.unitDefs.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[8px] font-pixel-heading text-zinc-400 uppercase">
                        Units:
                      </span>
                      {change.unitDefs.map((u, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded-none bg-amber-950/40 text-amber-300 border border-amber-800/60 text-[8px] font-pixel-heading"
                        >
                          {u.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 bg-[#090b12] border-t border-zinc-800 text-[9px] text-zinc-400 flex items-center justify-between">
          <span>Source: Beyond-All-Reason GitHub (api.bar-rts.com/balance-changes)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-none bg-zinc-800 hover:bg-zinc-700 text-white font-pixel-heading text-[10px] transition-none active:translate-y-0.5"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
