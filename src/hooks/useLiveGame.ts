"use client";

import { useState, useEffect, useRef } from "react";

export interface LiveGameState {
  isRunning: boolean;
  gameStatus: "OFFLINE" | "IN_LOBBY" | "IN_GAME";
  lobbyName: string;
  mapName: string;
  faction: "Armada" | "Cortex" | "Spectator";
  gameTimeSeconds: number;
}

export interface UseLiveGameReturn {
  liveState: LiveGameState | null;
  isDaemonRunning: boolean;
  isGameRunning: boolean;
  error: string | null;
}

export interface UseLiveGameOptions {
  onStateChange?: (state: LiveGameState) => void;
}

const POLL_INTERVAL_MS = 2000;
const REQUEST_TIMEOUT_MS = 1500;
const BRIDGE_ENDPOINT = "http://127.0.0.1:5050/api/live-status";

export function useLiveGame(options?: UseLiveGameOptions): UseLiveGameReturn {
  const [liveState, setLiveState] = useState<LiveGameState | null>(null);
  const [isDaemonRunning, setIsDaemonRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const onStateChangeRef = useRef(options?.onStateChange);

  useEffect(() => {
    onStateChangeRef.current = options?.onStateChange;
  }, [options?.onStateChange]);

  useEffect(() => {
    isMountedRef.current = true;

    const pollBridge = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(BRIDGE_ENDPOINT, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: LiveGameState = await response.json();

        if (isMountedRef.current) {
          setLiveState(data);
          setIsDaemonRunning(true);
          setError(null);
          onStateChangeRef.current?.(data);
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        // Silent failure if bridge daemon is offline (prevents noisy console spam)
        if (isMountedRef.current) {
          setIsDaemonRunning(false);
          setLiveState(null);
          // Only record error string internally if needed for telemetry diagnostics
          const errorMsg = err instanceof Error ? err.message : "Bridge offline";
          setError(errorMsg);
        }
      }
    };

    // Initial immediate probe
    pollBridge();

    // Recurring polling loop
    const intervalId = setInterval(pollBridge, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, []);

  const isGameRunning = Boolean(liveState?.isRunning && liveState.gameStatus !== "OFFLINE");

  return {
    liveState,
    isDaemonRunning,
    isGameRunning,
    error,
  };
}

export default useLiveGame;
