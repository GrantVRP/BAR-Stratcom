import React, { useEffect, useRef, useState } from 'react';
import { PlanModeSchema, PlanOpeningSchema, PlanRoleSchema, PlanSkillSchema } from '../../../../core/schemas/plans';
import type { BuildPlan, MapRecord } from '../../../../core/schemas';
import type { IpcEventData, IpcRequest } from '../../../../shared';
import { usePlans, useSnapshot } from '../../stores';
import { ipcClient } from '../../lib/ipc-client';
import { MapCombobox } from '../tactical/MapCombobox';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Select } from '../ui/Select';
import { AiDraftResult, type AiDraftResultData } from './AiDraftResult';

export type AiDraftIntent = Omit<IpcRequest<'ai:draft'>, 'mapFileName' | 'freeText'>;

export interface AiDraftDialogProps {
  onClose: () => void;
  onSaved: (plan: BuildPlan) => void;
  /** Prefill (DRAFT VARIANT WITH AI uses the plan's own settings and the picked map). */
  initial?: Partial<AiDraftIntent> & { map?: MapRecord | null };
}

type Phase =
  | { kind: 'form' }
  | { kind: 'running'; progress: IpcEventData<'ai:progress'> | null }
  | { kind: 'result'; result: AiDraftResultData }
  | { kind: 'error'; message: string };

const NOTE_MAX = 300;
const label = (v: string): string => (v === '1v1' ? '1v1' : (v.charAt(0).toUpperCase() + v.slice(1)).replace('-', ' '));
const options = (values: readonly string[]): Array<{ value: string; label: string }> => values.map((v) => ({ value: v, label: label(v) }));

function progressText(p: IpcEventData<'ai:progress'> | null): string {
  if (!p || p.phase === 'draft') return 'DRAFTING…';
  if (p.phase === 'repair') return `FIXING PROBLEMS // ROUND ${p.round} OF 3`;
  return 'SIMULATING…';
}

/** Library → DRAFT WITH AI (06 §4.3, T08.8): intent → progress → checked draft → save or discard. */
export function AiDraftDialog({ onClose, onSaved, initial }: AiDraftDialogProps): React.JSX.Element {
  const factions = useSnapshot((s) => s.factions).filter((f) => f.enabled);
  const savePlan = usePlans((s) => s.savePlan);
  const [intent, setIntent] = useState<AiDraftIntent>(() => ({
    factionId: initial?.factionId ?? '',
    mode: initial?.mode ?? '1v1',
    role: initial?.role ?? 'any',
    opening: initial?.opening ?? 'bot',
    skill: initial?.skill ?? 'beginner'
  }));
  const [map, setMap] = useState<MapRecord | null>(initial?.map ?? null);
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [saving, setSaving] = useState(false);
  const request = useRef(0);
  const running = useRef(false);
  // the first enabled faction until the player picks one (factions come from data/factions.json)
  const factionId = intent.factionId || factions[0]?.id || '';

  // closing (unmounting) while a draft runs cancels it
  useEffect(
    () => () => {
      if (running.current) void ipcClient.invoke('ai:cancel');
    },
    []
  );

  const set = <K extends keyof AiDraftIntent>(key: K, value: AiDraftIntent[K]): void => setIntent((prev) => ({ ...prev, [key]: value }));

  const draft = async (): Promise<void> => {
    const id = ++request.current;
    running.current = true;
    setPhase({ kind: 'running', progress: null });
    const off = ipcClient.on('ai:progress', (progress) => {
      if (request.current === id) setPhase({ kind: 'running', progress });
    });
    const trimmed = note.trim();
    const res = await ipcClient.invoke('ai:draft', {
      ...intent,
      factionId,
      ...(map ? { mapFileName: map.fileName } : {}),
      ...(trimmed ? { freeText: trimmed } : {})
    });
    off();
    if (request.current !== id) return; // cancelled meanwhile
    running.current = false;
    setPhase(res.ok ? { kind: 'result', result: res.data } : { kind: 'error', message: res.message });
  };

  const cancel = (): void => {
    request.current += 1;
    running.current = false;
    void ipcClient.invoke('ai:cancel');
    setPhase({ kind: 'form' });
  };

  const close = (): void => {
    if (phase.kind === 'running') cancel();
    onClose();
  };

  const save = async (plan: BuildPlan): Promise<void> => {
    setSaving(true);
    const saved = await savePlan(plan);
    setSaving(false);
    if (saved) onSaved(saved);
  };

  const result = phase.kind === 'result' ? phase.result : null;
  const savable = result?.plan && result.report.errors.length === 0 ? result.plan : null;

  return (
    <Dialog open onClose={close} title="DRAFT WITH AI" maxWidth="max-w-3xl">
      {phase.kind === 'form' && (
        <div data-testid="ai-draft-form" className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {(
              [
                ['factionId', 'Faction', factions.map((f) => ({ value: f.id, label: f.displayName }))],
                ['mode', 'Mode', options(PlanModeSchema.options)],
                ['role', 'Role', options(PlanRoleSchema.options)],
                ['opening', 'Opening', options(PlanOpeningSchema.options)],
                ['skill', 'Skill', options(PlanSkillSchema.options)]
              ] as const
            ).map(([key, name, opts]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`ai-draft-${key}`} className="text-[10px] font-bold uppercase text-zinc-400">{name}</label>
                <div>
                  <Select
                    id={`ai-draft-${key}`}
                    data-testid={`ai-draft-${key}`}
                    options={opts}
                    value={key === 'factionId' ? factionId : intent[key]}
                    onChange={(e) => set(key, e.target.value as never)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Map (optional)</span>
              {map && (
                <button type="button" className="text-[10px] text-zinc-400 hover:text-white" onClick={() => setMap(null)} data-testid="ai-draft-clear-map">
                  NO MAP
                </button>
              )}
            </div>
            <MapCombobox selectedMap={map} onSelectMap={setMap} faction={factionId} />
          </div>

          <div className="space-y-1">
            <label htmlFor="ai-draft-note" className="text-[10px] font-bold uppercase text-zinc-400">Note for the AI (optional)</label>
            <textarea
              id="ai-draft-note"
              data-testid="ai-draft-note"
              value={note}
              maxLength={NOTE_MAX}
              rows={2}
              placeholder="e.g. fast air, safe eco"
              onChange={(e) => setNote(e.target.value)}
              className="pixel-box-inset w-full resize-none bg-[#0d0f17] px-3 py-1.5 font-mono text-[14px] text-zinc-200 placeholder-zinc-500 outline-none"
            />
            <div data-num="true" className="text-right text-[10px] text-zinc-400">{note.length} / {NOTE_MAX}</div>
          </div>
        </div>
      )}

      {phase.kind === 'running' && (
        <div data-testid="ai-draft-running" role="status" aria-live="polite" className="py-8 text-center font-pixel-heading text-xs text-zinc-200">
          {progressText(phase.progress)}
        </div>
      )}

      {phase.kind === 'error' && (
        <p data-testid="ai-draft-error" className="font-mono text-xs text-[#f87171]">{phase.message}</p>
      )}

      {result && <AiDraftResult result={result} map={map} />}

      <div className="mt-6 flex justify-end gap-3">
        {phase.kind === 'form' && (
          <>
            <Button variant="ghost" size="md" onClick={close}>CANCEL</Button>
            <Button variant="primary" size="md" data-testid="ai-draft-start" disabled={factionId === ''} onClick={() => void draft()}>
              DRAFT
            </Button>
          </>
        )}
        {phase.kind === 'running' && (
          <Button variant="default" size="md" data-testid="ai-draft-cancel" onClick={cancel}>CANCEL</Button>
        )}
        {(phase.kind === 'result' || phase.kind === 'error') && (
          <>
            <Button variant="ghost" size="md" data-testid="ai-draft-discard" onClick={() => setPhase({ kind: 'form' })}>
              DISCARD
            </Button>
            {phase.kind === 'result' && (
              <Button variant="primary" size="md" data-testid="ai-draft-save" disabled={!savable || saving} onClick={() => savable && void save(savable)}>
                SAVE PLAN
              </Button>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
