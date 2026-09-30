"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type BarLeaderboardCategory, fetchLeaderboard } from "@/lib/bar-api";

export function useBarLeaderboard(initialSeason: number = 3) {
  const [season, setSeason] = useState<number>(initialSeason);
  const [categories, setCategories] = useState<BarLeaderboardCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Duel");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const loadLeaderboards = useCallback(async (s: number) => {
    try {
      setIsLoading(true);
      const data = await fetchLeaderboard(s);
      if (isMountedRef.current) {
        setCategories(data);
        setError(null);
        if (data.length > 0 && !data.some((c) => c.name === selectedCategory)) {
          setSelectedCategory(data[0].name);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [selectedCategory]);

  useEffect(() => {
    isMountedRef.current = true;
    loadLeaderboards(season);
    return () => {
      isMountedRef.current = false;
    };
  }, [loadLeaderboards, season]);

  const activePlayers = categories.find((c) => c.name === selectedCategory)?.players || [];

  return {
    season,
    setSeason,
    categories,
    selectedCategory,
    setSelectedCategory,
    activePlayers,
    isLoading,
    error,
    refresh: () => loadLeaderboards(season),
  };
}
