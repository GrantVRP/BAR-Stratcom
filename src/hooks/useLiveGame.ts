"use client";

import { useState, useEffect, useRef } from "react";

export interface TeammateEco {
  name: string;
  faction: "Armada" | "Cortex";
  role: "Frontline Combat" | "Backline Eco" | "Air Dominance" | "Naval / Amphib";
  metalIncome: number;
  energyIncome: number;
  status: "NORMAL" | "STALLING_ENERGY" | "STALLING_METAL" | "ECO_BOOMING";
  techTier: "T1" | "T2" | "T3";
}

export interface EnemyPushThreat {
  threatLevel: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
  headline: string;
  sector: string;
  unitType: string;
  unitCount: number;
  estimatedArrivalSeconds: number;
  tacticalAdvice: string;
}

export interface TacticalBattleIntel {
  friendlyUnitsCount: number;
  friendlyBreakdown: {
    raiders: number;
    skirmishers: number;
    assault: number;
    air: number;
  };
  enemyUnitsCount: number;
  enemyBreakdown: {
    raiders: number;
    skirmishers: number;
    assault: number;
    air: number;
  };
  teammates: TeammateEco[];
  enemyPush: EnemyPushThreat | null;
  playerName?: string;
  enemyName?: string;
  playerMetalIncome?: number;
  playerEnergyIncome?: number;
  completedUnits?: Record<string, number>;
}

export interface LiveGameState {
  isRunning: boolean;
  gameStatus: "OFFLINE" | "IN_LOBBY" | "IN_GAME";
  lobbyName: string;
  mapName: string;
  faction: "Armada" | "Cortex" | "Spectator";
  gameTimeSeconds: number;
  battleIntel?: TacticalBattleIntel;
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

// Deterministic RTS tactical intelligence simulation engine
export function generateSyntheticBattleIntel(
  faction: "Armada" | "Cortex" | "Spectator" = "Armada",
  gameTimeSeconds: number = 0,
  mapName: string = "Battlefield"
): TacticalBattleIntel {
  const isCortex = faction === "Cortex";
  const allyFaction = isCortex ? "Cortex" : "Armada";
  const enemyFaction = isCortex ? "Armada" : "Cortex";

  if (gameTimeSeconds < 60) {
    // 00:00 - 01:00 (Opening Commander deployment)
    return {
      friendlyUnitsCount: 3,
      friendlyBreakdown: { raiders: 0, skirmishers: 0, assault: 0, air: 0 },
      enemyUnitsCount: 3,
      enemyBreakdown: { raiders: 0, skirmishers: 0, assault: 0, air: 0 },
      teammates: [
        {
          name: "roka",
          faction: allyFaction,
          role: "Frontline Combat",
          metalIncome: 4.0,
          energyIncome: 40,
          status: "NORMAL",
          techTier: "T1",
        },
        {
          name: "Kovath",
          faction: allyFaction,
          role: "Backline Eco",
          metalIncome: 6.0,
          energyIncome: 60,
          status: "NORMAL",
          techTier: "T1",
        },
      ],
      enemyPush: null,
    };
  } else if (gameTimeSeconds < 180) {
    // 01:00 - 03:00 (Initial Factory Output & Raider Recon)
    const factor = (gameTimeSeconds - 60) / 120;
    const raiders = Math.floor(2 + factor * 6);
    const skirmishers = Math.floor(1 + factor * 5);

    return {
      friendlyUnitsCount: 6 + raiders + skirmishers,
      friendlyBreakdown: { raiders, skirmishers, assault: 0, air: 1 },
      enemyUnitsCount: 8 + Math.floor(factor * 10),
      enemyBreakdown: { raiders: Math.floor(3 + factor * 5), skirmishers: Math.floor(2 + factor * 4), assault: 0, air: 1 },
      teammates: [
        {
          name: "roka",
          faction: allyFaction,
          role: "Frontline Combat",
          metalIncome: +(10.2 + factor * 5).toFixed(1),
          energyIncome: Math.floor(120 + factor * 140),
          status: "NORMAL",
          techTier: "T1",
        },
        {
          name: "Kovath",
          faction: allyFaction,
          role: "Backline Eco",
          metalIncome: +(14.5 + factor * 8).toFixed(1),
          energyIncome: Math.floor(220 + factor * 350),
          status: "ECO_BOOMING",
          techTier: "T1",
        },
      ],
      enemyPush: {
        threatLevel: "ELEVATED",
        headline: `4x ${enemyFaction === "Armada" ? "Flash" : "Blitz"} Raider Recon Probing`,
        sector: "North Choke / Ridge",
        unitType: enemyFaction === "Armada" ? "Flash" : "Blitz",
        unitCount: 4,
        estimatedArrivalSeconds: 25,
        tacticalAdvice: "Screen forward Mexes with Rocko skirmishers or deploy LLT.",
      },
    };
  } else if (gameTimeSeconds < 360) {
    // 03:00 - 06:00 (Main Skirmish Clashes & Flank Attacks)
    const factor = (gameTimeSeconds - 180) / 180;
    const raiders = Math.floor(8 + factor * 8);
    const skirmishers = Math.floor(10 + factor * 12);
    const assault = Math.floor(2 + factor * 6);

    return {
      friendlyUnitsCount: 22 + raiders + skirmishers + assault,
      friendlyBreakdown: { raiders, skirmishers, assault, air: 2 },
      enemyUnitsCount: 26 + raiders + skirmishers,
      enemyBreakdown: {
        raiders: Math.floor(10 + factor * 6),
        skirmishers: Math.floor(12 + factor * 8),
        assault: Math.floor(3 + factor * 5),
        air: 3,
      },
      teammates: [
        {
          name: "roka",
          faction: allyFaction,
          role: "Frontline Combat",
          metalIncome: +(22.4 + factor * 6).toFixed(1),
          energyIncome: Math.floor(380 + factor * 160),
          status: factor > 0.6 ? "STALLING_ENERGY" : "NORMAL",
          techTier: "T1",
        },
        {
          name: "Kovath",
          faction: allyFaction,
          role: "Backline Eco",
          metalIncome: +(38.0 + factor * 22).toFixed(1),
          energyIncome: Math.floor(850 + factor * 850),
          status: "ECO_BOOMING",
          techTier: factor > 0.4 ? "T2" : "T1",
        },
      ],
      enemyPush: {
        threatLevel: "HIGH",
        headline: `8x ${enemyFaction === "Armada" ? "Flash" : "Blitz"} Fast Flank Surge Incoming!`,
        sector: "South Canyon Choke",
        unitType: enemyFaction === "Armada" ? "Flash Raiders" : "Blitz Tanks",
        unitCount: 8,
        estimatedArrivalSeconds: 15,
        tacticalAdvice: "Pull Commander back behind LLT line; rotate skirmish line to intercept.",
      },
    };
  } else {
    // 06:00+ (T2 Heavy Armor, Air Strikes, & Siege Push)
    const factor = Math.min(1.5, (gameTimeSeconds - 360) / 300);
    const raiders = Math.floor(14 + factor * 10);
    const skirmishers = Math.floor(18 + factor * 12);
    const assault = Math.floor(8 + factor * 14);
    const air = Math.floor(4 + factor * 8);

    return {
      friendlyUnitsCount: 38 + raiders + skirmishers + assault + air,
      friendlyBreakdown: { raiders, skirmishers, assault, air },
      enemyUnitsCount: 42 + raiders + skirmishers + assault,
      enemyBreakdown: {
        raiders: Math.floor(12 + factor * 8),
        skirmishers: Math.floor(20 + factor * 10),
        assault: Math.floor(10 + factor * 12),
        air: Math.floor(6 + factor * 6),
      },
      teammates: [
        {
          name: "roka",
          faction: allyFaction,
          role: "Frontline Combat",
          metalIncome: +(32.0 + factor * 12).toFixed(1),
          energyIncome: Math.floor(580 + factor * 220),
          status: "NORMAL",
          techTier: "T2",
        },
        {
          name: "Kovath",
          faction: allyFaction,
          role: "Backline Eco",
          metalIncome: +(68.0 + factor * 35).toFixed(1),
          energyIncome: Math.floor(1850 + factor * 1600),
          status: "ECO_BOOMING",
          techTier: "T2",
        },
      ],
      enemyPush: {
        threatLevel: factor > 0.5 ? "CRITICAL" : "HIGH",
        headline: `Heavy T2 Siege Column Advancing (Tanks + Air Screen)`,
        sector: "Central River Plain",
        unitType: enemyFaction === "Armada" ? "Bulldog / Can" : "Goliath / Sumo",
        unitCount: 14,
        estimatedArrivalSeconds: 20,
        tacticalAdvice: "Request T2 metal feed from Kovath; construct plasma artillery + heavy laser battery.",
      },
    };
  }
}

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

        // If bridge doesn't yet include battleIntel or is running, enrich with tactical engine
        if (!data.battleIntel) {
          data.battleIntel = generateSyntheticBattleIntel(
            data.faction,
            data.gameTimeSeconds,
            data.mapName
          );
        }

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
