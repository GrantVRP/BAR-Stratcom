"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type BarBalanceChange, fetchBalanceChanges } from "@/lib/bar-api";

export function useBarBalance(limit: number = 25) {
  const [changes, setChanges] = useState<BarBalanceChange[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const loadChanges = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchBalanceChanges(limit);
      if (isMountedRef.current) {
        setChanges(data);
        setError(null);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load balance changes");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    isMountedRef.current = true;
    loadChanges();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadChanges]);

  /**
   * Check whether a specific unit name was mentioned in recent balance patches
   */
  const findChangesForUnit = useCallback(
    (unitName: string): BarBalanceChange[] => {
      const lower = unitName.toLowerCase();
      return changes.filter((c) => {
        const msgMatch = c.message.toLowerCase().includes(lower);
        const defMatch = (c.unitDefs || []).some((u) => u.name.toLowerCase().includes(lower));
        return msgMatch || defMatch;
      });
    },
    [changes]
  );

  return {
    changes,
    isLoading,
    error,
    refresh: loadChanges,
    findChangesForUnit,
  };
}
