"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type Faction } from "@/lib/game-data";

export interface LiveGameStatus {
  isRunning: boolean;
  lobbyName: string;
  map: string;
  faction: Faction;
  gameTimeSeconds: number;
  isMock?: boolean;
  bridgeStatus?: string;
}

export interface UseLiveGameOptions {
  onMatchDetected?: (status: LiveGameStatus) => void;
  enabled?: boolean;
  pollIntervalMs?: number;
}

export function useLiveGame(options: UseLiveGameOptions = {}) {
  const {
    onMatchDetected,
    enabled = true,
    pollIntervalMs = 2500,
  } = options;

  const [isHookConnected, setIsHookConnected] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lobbyName, setLobbyName] = useState<string>("Lobby Standby");
  const [map, setMap] = useState<string>("Supreme Isthmus");
  const [faction, setFaction] = useState<Faction>("Armada");
  const [gameTimeSeconds, setGameTimeSeconds] = useState<number>(0);
  const [isMock, setIsMock] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(Date.now());

  const previousRunningRef = useRef<boolean>(false);
  const previousMapRef = useRef<string>("");
  const previousFactionRef = useRef<Faction>("Armada");
  const onMatchDetectedRef = useRef(onMatchDetected);
  onMatchDetectedRef.current = onMatchDetected;

  const checkLiveStatus = useCallback(async () => {
    try {
      // 1.5s timeout on fetch to prevent lingering hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch("http://localhost:5050/api/live-status", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        setIsHookConnected(false);
        return;
      }

      const data: LiveGameStatus = await res.json();
      setIsHookConnected(true);
      setIsRunning(Boolean(data.isRunning));
      setLobbyName(data.lobbyName || "In Match");
      setMap(data.map || "Supreme Isthmus");
      setFaction(data.faction === "Cortex" ? "Cortex" : "Armada");
      setGameTimeSeconds(data.gameTimeSeconds || 0);
      setIsMock(Boolean(data.isMock));
      setLastCheckTime(Date.now());

      // Trigger auto-sync callback when match transitions to running or map/faction shifts
      if (data.isRunning) {
        const hasStarted = !previousRunningRef.current && data.isRunning;
        const mapChanged = previousMapRef.current !== data.map;
        const factionChanged = previousFactionRef.current !== data.faction;

        if (hasStarted || mapChanged || factionChanged) {
          if (onMatchDetectedRef.current) {
            onMatchDetectedRef.current(data);
          }
        }
      }

      previousRunningRef.current = Boolean(data.isRunning);
      previousMapRef.current = data.map || "";
      previousFactionRef.current = data.faction === "Cortex" ? "Cortex" : "Armada";
    } catch {
      // Companion daemon is not running on port 5050
      setIsHookConnected(false);
      setIsRunning(false);
      previousRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Initial check immediately
    checkLiveStatus();

    // Polling interval
    const interval = setInterval(checkLiveStatus, pollIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, pollIntervalMs, checkLiveStatus]);

  // Formats seconds into MM:SS format (e.g. 142s -> "02:22")
  const formattedGameTime = useCallback((totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    isHookConnected,
    isRunning,
    lobbyName,
    map,
    faction,
    gameTimeSeconds,
    isMock,
    formattedGameTime: formattedGameTime(gameTimeSeconds),
    lastCheckTime,
    refreshNow: checkLiveStatus,
  };
}

export default useLiveGame;
