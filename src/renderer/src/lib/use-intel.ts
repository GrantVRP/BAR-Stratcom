import { useEffect, useState } from 'react';
import type { IpcRequest, IpcResponseData } from '../../../shared';
import { ipcClient } from './ipc-client';

export type IntelChannel = 'intel:battles' | 'intel:leaderboard' | 'intel:replays' | 'intel:balance';

interface IntelState<C extends IntelChannel> {
  key: string;
  data: IpcResponseData<C> | null;
  error: string | null;
}

export interface IntelQuery<C extends IntelChannel> {
  data: IpcResponseData<C> | null;
  error: string | null;
  /** True until the answer for the current request arrives (earlier data stays visible meanwhile). */
  loading: boolean;
  reload: () => void;
}

/**
 * Loads one intel channel (06 §4.7). With `refreshMs` it reloads on that interval, but only while the
 * window is visible; the caller mounts it only while its tab is shown.
 */
export function useIntel<C extends IntelChannel>(channel: C, req?: IpcRequest<C>, refreshMs?: number): IntelQuery<C> {
  // the request as text, so a new object literal with the same content does not reload
  const reqJson = JSON.stringify(req ?? null);
  const key = `${channel}:${reqJson}`;
  const [state, setState] = useState<IntelState<C>>({ key: '', data: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    const request = (JSON.parse(reqJson) as IpcRequest<C> | null) ?? undefined;
    const answerKey = `${channel}:${reqJson}`;
    const load = (): void => {
      void ipcClient.invoke(channel, request).then((res) => {
        if (!active) return;
        setState((prev) => (res.ok ? { key: answerKey, data: res.data, error: null } : { key: answerKey, data: prev.data, error: res.message }));
      });
    };
    load();
    const timer = refreshMs
      ? setInterval(() => {
          if (document.visibilityState === 'visible') load();
        }, refreshMs)
      : null;
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [channel, reqJson, refreshMs, tick]);

  return { data: state.data, error: state.error, loading: state.key !== key, reload: () => setTick((t) => t + 1) };
}
