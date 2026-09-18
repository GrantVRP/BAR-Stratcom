"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type BarReplaySummary,
  type BarReplayDetail,
  fetchReplays,
  fetchReplayDetail,
} from "@/lib/bar-api";

export function useBarReplays(initialPlayerName: string = "") {
  const [playerName, setPlayerName] = useState<string>(initialPlayerName);
  const [mapFilter, setMapFilter] = useState<string>("");
  const [replays, setReplays] = useState<BarReplaySummary[]>([]);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [selectedReplayDetail, setSelectedReplayDetail] = useState<BarReplayDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const searchReplays = useCallback(
    async (player?: string, map?: string) => {
      try {
        setIsLoading(true);
        const res = await fetchReplays({
          players: player !== undefined ? player : playerName,
          maps: map !== undefined ? map : mapFilter,
          limit: 15,
        });

        if (isMountedRef.current) {
          setReplays(res.data);
          setTotalResults(res.totalResults);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to load replays");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [playerName, mapFilter]
  );

  const loadReplayDetail = useCallback(async (id: string) => {
    try {
      setIsLoadingDetail(true);
      const detail = await fetchReplayDetail(id);
      if (isMountedRef.current) {
        setSelectedReplayDetail(detail);
      }
    } catch (err) {
      console.error("loadReplayDetail error:", err);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingDetail(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    searchReplays();
    return () => {
      isMountedRef.current = false;
    };
  }, [searchReplays]);

  return {
    playerName,
    setPlayerName,
    mapFilter,
    setMapFilter,
    replays,
    totalResults,
    selectedReplayDetail,
    setSelectedReplayDetail,
    loadReplayDetail,
    isLoading,
    isLoadingDetail,
    error,
    search: searchReplays,
  };
}
