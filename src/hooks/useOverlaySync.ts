"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type Faction } from "@/lib/game-data";
import { type MapData, MAP_DATABASE } from "@/lib/map-data";
import { type ParsedBuildStep } from "@/lib/timeline-parser";
import { type LiveGameState } from "@/hooks/useLiveGame";

export interface OverlayState {
  faction: Faction;
  selectedMap: MapData;
  steps: ParsedBuildStep[];
  liveState: LiveGameState | null;
  strategyTitle?: string;
  opacity: number;          // 0.2 to 1.0 (default: 0.88)
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  isMini: boolean;           // Compact Discord-style pill vs full tactical HUD
  isOpen: boolean;           // Overlay visibility toggle
}

const STORAGE_KEY = "bar_tactical_overlay_state";
const CHANNEL_NAME = "bar_tactical_overlay_channel";

const DEFAULT_OVERLAY_STATE: OverlayState = {
  faction: "Armada",
  selectedMap: MAP_DATABASE[0],
  steps: [],
  liveState: null,
  strategyTitle: "Standard Opening",
  opacity: 0.88,
  corner: "top-right",
  isMini: false,
  isOpen: false,
};

export function useOverlaySync(isController: boolean = false) {
  const [overlayState, setOverlayState] = useState<OverlayState>(() => {
    if (typeof window === "undefined") return DEFAULT_OVERLAY_STATE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_OVERLAY_STATE,
          ...parsed,
          selectedMap:
            MAP_DATABASE.find((m) => m.id === parsed.selectedMap?.id) ||
            DEFAULT_OVERLAY_STATE.selectedMap,
        };
      }
    } catch {
      // Ignore JSON parse errors
    }
    return DEFAULT_OVERLAY_STATE;
  });

  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<Partial<OverlayState>>) => {
      if (event.data && typeof event.data === "object") {
        setOverlayState((prev) => {
          const next = { ...prev, ...event.data };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Ignore storage errors
          }
          return next;
        });
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Broadcast state changes across all tabs/windows
  const broadcastState = useCallback((partial: Partial<OverlayState>) => {
    setOverlayState((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      try {
        channelRef.current?.postMessage(partial);
      } catch {
        // Ignore channel errors
      }
      return next;
    });
  }, []);

  return {
    overlayState,
    broadcastState,
  };
}
