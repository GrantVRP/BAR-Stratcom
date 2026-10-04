import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  parseReplayIdOrUrl,
  type BuildPlan,
  type CapturePlayer,
  type CaptureToPlanResponse,
  type SessionDetail
} from '../../../../core/schemas';
import { usePlans } from '../../stores';
import { ipcClient } from '../../lib/ipc-client';
import { CapturePreview } from './CapturePreview';

export interface SaveOpeningModalProps {
  session: SessionDetail;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (plan: BuildPlan) => void;
}

const labelClass = "font-['Press_Start_2P'] text-[10px] text-zinc-400";
const fieldClass = 'w-full border border-black bg-[#0d0f17] px-3 py-2 font-mono text-sm text-zinc-100';

function defaultTeam(players: CapturePlayer[]): number | null {
  const capturable = players.filter((p) => p.capturable);
  return (capturable.find((p) => p.isMe) ?? capturable[0] ?? players[0])?.teamId ?? null;
}

/** "Save my opening as plan" (player sessions) and "Capture" (spectator/replay sessions), 06 §4.6. */
export function SaveOpeningModal({ session, isOpen, onClose, onSaved }: SaveOpeningModalProps): React.JSX.Element | null {
  const { sessionId } = session.meta;
  const isPlayerMode = session.meta.mode === 'player';
  const [players, setPlayers] = useState<CapturePlayer[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [capture, setCapture] = useState<CaptureToPlanResponse | null>(null);
  const [title, setTitle] = useState('');
  const [replayInput, setReplayInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Latest capture request wins; bumping it also discards answers that arrive after closing
  const requestRef = useRef(0);

  const selectTeam = useCallback(async (id: number | null, list: CapturePlayer[]): Promise<void> => {
    const request = ++requestRef.current;
    setTeamId(id);
    setCapture(null);
    setErrorMsg(null);
    if (!list.find((p) => p.teamId === id)?.capturable || id === null) return;
    setLoading(true);
    const res = await ipcClient.invoke('capture:toPlan', { sessionId, teamId: id });
    if (request !== requestRef.current) return;
    setLoading(false);
    if (res.ok) {
      setCapture(res.data);
      setTitle(res.data.plan.title);
    } else {
      setErrorMsg(res.message);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void ipcClient.invoke('capture:listPlayers', { sessionId }).then((res) => {
      if (!active) return;
      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }
      setPlayers(res.data);
      void selectTeam(defaultTeam(res.data), res.data);
    });
    return () => {
      active = false;
    };
  }, [isOpen, sessionId, selectTeam]);

  const selected = players.find((p) => p.teamId === teamId) ?? null;
  const message = errorMsg ?? (selected && !selected.capturable ? selected.reason : null);

  if (!isOpen) return null;

  const replayId = parseReplayIdOrUrl(replayInput);
  const replayInvalid = replayId === null;
  const hasErrors = (capture?.issues.errors.length ?? 0) > 0;
  const canSave = capture !== null && !hasErrors && !replayInvalid && title.trim().length > 0 && !saving && !loading;

  async function handleSave(): Promise<void> {
    if (!capture || teamId === null || replayInvalid) return;
    setSaving(true);
    setErrorMsg(null);
    // Re-capture with the replay id so main validates it and stamps it into the plan source
    const captured = replayId
      ? await ipcClient.invoke('capture:toPlan', { sessionId, teamId, replayId })
      : ({ ok: true, data: capture } as const);
    if (!captured.ok) {
      setErrorMsg(captured.message);
      setSaving(false);
      return;
    }
    const saveRes = await ipcClient.invoke('plans:save', { ...captured.data.plan, title: title.trim().slice(0, 60) });
    setSaving(false);
    if (!saveRes.ok) {
      setErrorMsg(saveRes.message);
      return;
    }
    await usePlans.getState().loadPlans();
    onSaved?.(saveRes.data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div
        data-testid="save-opening-modal"
        className="pixel-box max-h-[90vh] w-full max-w-3xl space-y-3 overflow-y-auto border-2 border-black bg-[#12131a] p-4 shadow-[4px_4px_0px_#000]"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-100">
            {isPlayerMode ? 'SAVE MY OPENING AS PLAN' : 'CAPTURE PLAN FROM MATCH'}
          </span>
          <button type="button" onClick={onClose} className="cursor-pointer font-mono text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        {!isPlayerMode && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className={labelClass}>PLAYER</span>
              <select
                data-testid="select-capture-player"
                value={teamId ?? ''}
                onChange={(e) => void selectTeam(Number(e.target.value), players)}
                className={fieldClass}
              >
                {players.map((p) => (
                  <option key={p.teamId} value={p.teamId} disabled={!p.capturable}>
                    {p.name} ({p.faction ?? 'unknown'}){p.reason ? ` // ${p.reason}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className={labelClass}>REPLAY LINK (OPTIONAL)</span>
              <input
                type="text"
                data-testid="input-capture-replay"
                placeholder="https://bar-rts.com/replays/…"
                value={replayInput}
                onChange={(e) => setReplayInput(e.target.value)}
                className={fieldClass}
              />
              {replayInvalid && (
                <span data-testid="capture-replay-error" className="block font-mono text-sm text-[#f87171]">
                  Not a replay id or bar-rts.com replay link
                </span>
              )}
            </label>
          </div>
        )}

        <label className="block space-y-1">
          <span className={labelClass}>PLAN TITLE</span>
          <input
            type="text"
            data-testid="save-opening-title-input"
            maxLength={60}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
          />
        </label>

        {loading && <div className="py-8 text-center font-mono text-sm text-zinc-400">Reading match events…</div>}
        {capture && !loading && <CapturePreview plan={capture.plan} issues={capture.issues} mapScriptName={session.meta.mapScriptName} />}
        {message && (
          <div data-testid="capture-error-msg" className="font-mono text-sm text-[#f87171]">
            {message}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
          <button
            type="button"
            data-testid="save-plan-cancel-btn"
            onClick={onClose}
            className="cursor-pointer border-2 border-black bg-[#27272a] px-3 py-2 font-['Press_Start_2P'] text-[10px] text-zinc-300 hover:bg-[#3f3f46]"
          >
            CANCEL
          </button>
          <button
            type="button"
            data-testid="save-plan-confirm-btn"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="cursor-pointer border-2 border-black bg-[#4ade80] px-3 py-2 font-['Press_Start_2P'] text-[10px] text-black hover:bg-[#22c55e] active:translate-y-0.5 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {saving ? 'SAVING…' : 'SAVE PLAN'}
          </button>
        </div>
      </div>
    </div>
  );
}
