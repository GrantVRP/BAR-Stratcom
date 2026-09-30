"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type BarBattle, fetchLiveBattles } from "@/lib/bar-api";

export interface UseBarBattlesOptions {
  autoPoll?: boolean;
  pollIntervalMs?: number;
}

export function useBarBattles(options?: UseBarBattlesOptions) {
  const [battles, setBattles] = useState<BarBattle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const loadBattles = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchLiveBattles();
      if (isMountedRef.current) {
        setBattles(data);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load live battles");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadBattles();

    if (options?.autoPoll) {
      const interval = setInterval(loadBattles, options.pollIntervalMs || 20000);
      return () => {
        isMountedRef.current = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [loadBattles, options?.autoPoll, options?.pollIntervalMs]);

  /**
   * Helper: Find battle by player name or lobby name
   */
  const findBattleByPlayer = useCallback(
    (playerName: string): BarBattle | undefined => {
      const lower = playerName.toLowerCase();
      return battles.find((b) =>
        (b.players || []).some((p) => p.username.toLowerCase() === lower)
      );
    },
    [battles]
  );

  return {
    battles,
    isLoading,
    error,
    lastUpdated,
    refresh: loadBattles,
    findBattleByPlayer,
  };
}
