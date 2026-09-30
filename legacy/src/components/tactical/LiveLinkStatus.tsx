"use client";

import React from "react";
import { Link as LinkIcon, Check, X } from "lucide-react";
import { type LiveGameState } from "@/hooks/useLiveGame";

export interface LiveLinkStatusProps {
  liveState: LiveGameState | null;
  faction?: "Armada" | "Cortex" | "both" | "Spectator";
  accentColor?: string;
  onSync?: () => void;
  className?: string;
}

export function LiveLinkStatus({
  liveState,
  faction = "Armada",
  accentColor: customAccentColor,
  onSync,
  className = "",
}: LiveLinkStatusProps) {
  const isConnected = Boolean(liveState?.isRunning);
  const status: "OFFLINE" | "IN_LOBBY" | "IN_GAME" = isConnected
    ? liveState?.gameStatus || "OFFLINE"
    : "OFFLINE";

  const isArmada = faction === "Armada";
  // Faction Accent Color (Armada Cerulean #449bed vs Cortex Flame Red #ff2244)
  const accentColor = customAccentColor || (isArmada ? "#449bed" : "#ff2244");

  // In-Game match timer formatting: 00:00 (MM:SS with 2-digit padding per user draft)
  const gameTimeSeconds = liveState?.gameTimeSeconds || 0;
  const minutes = String(Math.floor(gameTimeSeconds / 60)).padStart(2, "0");
  const seconds = String(gameTimeSeconds % 60).padStart(2, "0");
  const timeStr = `${minutes}:${seconds}`;

  // Interactive tooltip
  const tooltipText =
    status === "IN_GAME"
      ? `Live match active on ${liveState?.mapName || "Current Map"} (${timeStr}). Faction: ${faction}. Click to sync console.`
      : status === "IN_LOBBY"
      ? `Connected to ${liveState?.lobbyName || "Chobby Active"}. Click to sync map and faction.`
      : "Live game link offline. Start Beyond All Reason to link.";

  return (
    <div
      onClick={status !== "OFFLINE" ? onSync : undefined}
      title={tooltipText}
      style={
        status === "IN_GAME"
          ? {
              borderColor: accentColor,
              boxShadow: `2px 2px 0px #000, 0 0 10px ${accentColor}33`,
            }
          : undefined
      }
      className={`flex items-center gap-2.5 px-2.5 py-1 select-none transition-none border-2 shadow-[2px_2px_0px_#000] ${
        status === "IN_GAME"
          ? isArmada
            ? "bg-[#081626] cursor-pointer"
            : "bg-[#1e080b] cursor-pointer"
          : status === "IN_LOBBY"
          ? "bg-[#0c1f12] border-[#22c55e] text-[#22c55e] cursor-pointer hover:border-emerald-400"
          : "bg-[#10121a] border-[#222538] text-zinc-400"
      } ${className}`}
    >
      {/* Left: "Link" label + Icon Frame with state badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="font-pixel-heading text-[10px] tracking-wide"
          style={
            status === "IN_GAME"
              ? { color: accentColor }
              : status === "IN_LOBBY"
              ? { color: "#22c55e" }
              : { color: "#a1a1aa" }
          }
        >
          Link
        </span>

        {/* Tactical Icon Frame */}
        <div
          style={status === "IN_GAME" ? { borderColor: accentColor } : undefined}
          className={`relative size-5 rounded-sm flex items-center justify-center border shrink-0 ${
            status === "IN_GAME"
              ? isArmada
                ? "bg-[#0e2a47]"
                : "bg-[#321015]"
              : status === "IN_LOBBY"
              ? "bg-[#0f2d18] border-[#22c55e]"
              : "bg-[#171924] border-zinc-700/80"
          }`}
        >
          {/* Base Link Icon */}
          <LinkIcon
            className="size-2.5"
            style={
              status === "IN_GAME"
                ? { color: accentColor, opacity: 0.6 }
                : status === "IN_LOBBY"
                ? { color: "#22c55e", opacity: 0.6 }
                : { color: "#71717a" }
            }
          />

          {/* Badge Overlay per user rough drafts */}
          {status === "OFFLINE" && (
            <X className="size-3.5 stroke-[3.5] text-red-500 absolute drop-shadow-[0_0_2px_rgba(239,68,68,0.8)]" />
          )}
          {status === "IN_LOBBY" && (
            <Check className="size-3.5 stroke-[3.5] text-[#22c55e] absolute drop-shadow-[0_0_3px_rgba(34,197,94,0.9)]" />
          )}
          {status === "IN_GAME" && (
            <>
              {/* Vibrant green checkmark per rough draft sketch */}
              <Check className="size-3.5 stroke-[3.5] text-[#22c55e] absolute drop-shadow-[0_0_3px_rgba(34,197,94,0.9)]" />
              {/* Faction active pulse beacon */}
              <span
                className="absolute -top-1 -right-1 size-1.5 rounded-full ring-1 ring-black arcade-blink"
                style={{ backgroundColor: accentColor }}
              />
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className="h-6 w-[2px] shrink-0"
        style={
          status === "IN_GAME"
            ? { backgroundColor: accentColor, opacity: 0.5 }
            : status === "IN_LOBBY"
            ? { backgroundColor: "#22c55e", opacity: 0.5 }
            : { backgroundColor: "#222538" }
        }
      />

      {/* Right: Status Label & Value */}
      <div className="flex flex-col justify-center min-w-0 leading-tight">
        {status === "IN_GAME" ? (
          /* IN GAME State: Top "Game:", Bottom "00:00" in selected faction colour */
          <>
            <span
              className="text-[8px] font-pixel-heading tracking-wider"
              style={{ color: accentColor }}
            >
              Game:
            </span>
            <span
              className="text-[10px] font-pixel-heading font-bold tracking-wider tabular-nums whitespace-nowrap"
              style={{ color: accentColor }}
            >
              {timeStr}
            </span>
          </>
        ) : (
          /* LOBBY / OFFLINE State: Top "Status:", Bottom "Lobby" or "Offline" */
          <>
            <span
              className={`text-[8px] font-pixel-heading tracking-wider ${
                status === "IN_LOBBY" ? "text-emerald-400" : "text-zinc-500"
              }`}
            >
              Status:
            </span>
            <span
              className={`text-[10px] font-pixel-heading font-bold tracking-tight whitespace-nowrap ${
                status === "IN_LOBBY" ? "text-[#22c55e]" : "text-zinc-400"
              }`}
            >
              {status === "IN_LOBBY" ? "Lobby" : "Offline"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default LiveLinkStatus;
