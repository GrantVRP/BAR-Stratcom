import React, { useState, useMemo, useEffect } from 'react';
import type { SessionDetail } from '../../../../core/schemas/session';
import type { BuildPlan } from '../../../../core/schemas/plans';
import type { WidgetEvent } from '../../../../core/schemas/protocol';
import { eventsToPlan } from '../../../../core/plans/events-to-plan';
import { validatePlan } from '../../../../core/plans/validate';
import { useSnapshot, usePlans } from '../../stores';
import { getClientRegistry } from '../../lib/registry';
import { ipcClient } from '../../lib/ipc-client';

export interface SaveOpeningModalProps {
  session: SessionDetail;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (plan: BuildPlan) => void;
}

export function SaveOpeningModal({
  session,
  isOpen,
  onClose,
  onSaved
}: SaveOpeningModalProps): React.JSX.Element | null {
  const isPlayerMode = session.meta.mode === 'player';
  const teams = session.meta.teams;
  const defaultTeam = teams.find((t) => t.isMe) ?? teams[0];
  const [selectedTeamId, setSelectedTeamId] = useState<number>(defaultTeam?.teamId ?? 0);
  const selectedTeam = teams.find((t) => t.teamId === selectedTeamId) ?? defaultTeam;

  const [title, setTitle] = useState<string>(
    `${selectedTeam?.playerName ?? 'Player'} - ${session.meta.mapScriptName}`
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const seriesEvents = session.series?.events && session.series.events.length > 0
    ? (session.series.events as unknown as WidgetEvent[])
    : null;
  const [fetchedEvents, setFetchedEvents] = useState<WidgetEvent[] | null>(null);
  const loadedEvents = seriesEvents ?? fetchedEvents;

  const snapshot = useSnapshot((s) => s.snapshot);

  // Fetch events only if not already present
  useEffect(() => {
    if (!isOpen || seriesEvents) return;
    let active = true;
    ipcClient
      .invoke('sessions:get', {
        sessionId: session.meta.sessionId,
        includeSeries: true
      })
      .then((res) => {
        if (!active || !res.ok || !res.data?.series?.events) return;
        setFetchedEvents(res.data.series.events as unknown as WidgetEvent[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, session.meta.sessionId, seriesEvents]);

  // Derive plan from events
  const derivedPlan = useMemo<BuildPlan | null>(() => {
    if (!snapshot || !loadedEvents || !selectedTeam) return null;
    try {
      const registry = getClientRegistry(snapshot);
      return eventsToPlan({
        registry,
        events: loadedEvents,
        teamId: selectedTeam.teamId,
        horizonSec: 600,
        teams: teams.map((t) => ({ teamId: t.teamId, allyTeamId: t.allyTeamId })),
        meta: {
          player: selectedTeam.playerName,
          map: session.meta.mapScriptName,
          source: isPlayerMode
            ? {
                kind: 'own-game',
                sessionId: session.meta.sessionId,
                map: session.meta.mapScriptName,
                capturedAt: new Date().toISOString()
              }
            : {
                kind: 'replay-capture',
                sessionId: session.meta.sessionId,
                replayId: session.meta.replay?.replayId,
                player: selectedTeam.playerName,
                map: session.meta.mapScriptName,
                capturedAt: new Date().toISOString()
              },
          title: title.trim() || `${selectedTeam.playerName} - ${session.meta.mapScriptName}`,
          factionId: selectedTeam.factionId ?? undefined,
          gameVersion: session.meta.gameVersion
        }
      });
    } catch (err) {
      console.error('Failed to derive plan from events:', err);
      return null;
    }
  }, [snapshot, loadedEvents, selectedTeam, teams, session.meta, isPlayerMode, title]);

  const validation = useMemo(() => {
    if (!derivedPlan || !snapshot) return null;
    const registry = getClientRegistry(snapshot);
    return validatePlan(derivedPlan, registry);
  }, [derivedPlan, snapshot]);

  if (!isOpen) return null;

  async function handleSave(): Promise<void> {
    if (!derivedPlan) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const saveRes = await ipcClient.invoke('plans:save', derivedPlan);
      if (!saveRes.ok) {
        setErrorMsg(saveRes.message);
        setSaving(false);
        return;
      }
      await usePlans.getState().loadPlans();
      onSaved?.(saveRes.data);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div
        data-testid="save-opening-modal"
        className="pixel-box w-full max-w-xl space-y-4 border-2 border-black bg-[#12131a] p-4 shadow-[4px_4px_0px_#000]"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-100">
            {isPlayerMode ? 'SAVE MY OPENING AS PLAN' : 'CAPTURE PLAN FROM MATCH'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer font-mono text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Player Selector for Spectator/Replay */}
        {!isPlayerMode && teams.length > 1 && (
          <div className="space-y-1">
            <label className="font-['Press_Start_2P'] text-[10px] text-zinc-400">
              SELECT PLAYER TO CAPTURE:
            </label>
            <select
              data-testid="select-capture-player"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(Number(e.target.value))}
              className="w-full border border-black bg-[#0d0f17] p-2 font-mono text-xs text-zinc-200"
            >
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.playerName} ({t.factionId ?? 'unknown'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Title Input */}
        <div className="space-y-1">
          <label className="font-['Press_Start_2P'] text-[10px] text-zinc-400">
            PLAN TITLE:
          </label>
          <input
            type="text"
            data-testid="save-opening-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-black bg-[#0d0f17] px-3 py-2 font-mono text-xs text-zinc-100 outline-hidden"
          />
        </div>

        {/* Derived Plan Summary */}
        {derivedPlan ? (
          <div className="space-y-2 border border-zinc-900 bg-[#0d0f17] p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-zinc-800 bg-[#12131a] px-2 py-0.5 font-['Press_Start_2P'] text-[10px] text-zinc-300">
                {derivedPlan.factionId?.toUpperCase() ?? 'ANY'}
              </span>
              <span className="border border-zinc-800 bg-[#12131a] px-2 py-0.5 font-['Press_Start_2P'] text-[10px] text-[#449bed]">
                {derivedPlan.opening.toUpperCase()}
              </span>
              <span className="border border-zinc-800 bg-[#12131a] px-2 py-0.5 font-['Press_Start_2P'] text-[10px] text-[#fbbf24]">
                {derivedPlan.energyStyle.toUpperCase()}
              </span>
              <span className="font-mono text-zinc-400">
                {derivedPlan.steps.length} STEPS
              </span>
              {validation && (
                <span
                  className={`font-['Press_Start_2P'] text-[10px] ${
                    validation.errors.length === 0 ? 'text-[#4ade80]' : 'text-[#f87171]'
                  }`}
                >
                  {validation.errors.length === 0 ? 'VALID' : `${validation.errors.length} ERRORS`}
                </span>
              )}
            </div>

            {/* Steps Preview List */}
            <div className="max-h-36 space-y-1 overflow-y-auto border-t border-zinc-900 pt-2 font-mono text-xs">
              {derivedPlan.steps.slice(0, 10).map((step, idx) => (
                <div key={step.id || idx} className="flex items-center gap-2 text-zinc-400">
                  <span className="text-zinc-600">#{idx + 1}</span>
                  <span className="text-zinc-500">+{step.targetTime ?? 0}s</span>
                  <span className="text-zinc-300">{step.count}× {step.unitId}</span>
                </div>
              ))}
              {derivedPlan.steps.length > 10 && (
                <div className="text-zinc-600 italic">
                  + {derivedPlan.steps.length - 10} more steps...
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center font-mono text-xs text-zinc-500">
            {loadedEvents ? 'No build events recorded in this match' : 'Loading match events...'}
          </div>
        )}

        {errorMsg && (
          <div className="font-mono text-xs text-[#f87171]">{errorMsg}</div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            data-testid="save-plan-cancel-btn"
            onClick={onClose}
            className="cursor-pointer border-2 border-black bg-[#27272a] px-3 py-1.5 font-['Press_Start_2P'] text-[10px] text-zinc-300 hover:bg-[#3f3f46]"
          >
            CANCEL
          </button>
          <button
            type="button"
            data-testid="save-plan-confirm-btn"
            onClick={() => void handleSave()}
            disabled={!derivedPlan || saving}
            className="cursor-pointer border-2 border-black bg-[#4ade80] px-3 py-1.5 font-['Press_Start_2P'] text-[10px] text-black hover:bg-[#22c55e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE PLAN'}
          </button>
        </div>
      </div>
    </div>
  );
}
