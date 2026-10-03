import React from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { Actor, BuildStep } from '../../../../core/schemas';
import { TacticalIcon } from './TacticalIcon';

export interface EditorStepRowProps {
  step: BuildStep;
  idx: number;
  totalSteps: number;
  availableActors: Actor[];
  unitName: string;
  onMove: (idx: number, delta: number) => void;
  onDelete: (idx: number) => void;
  onPickUnit: (idx: number) => void;
  onChange: (idx: number, patch: Partial<BuildStep>) => void;
}

export function EditorStepRow({
  step,
  idx,
  totalSteps,
  availableActors,
  unitName,
  onMove,
  onDelete,
  onPickUnit,
  onChange
}: EditorStepRowProps): React.JSX.Element {
  const actorValue =
    step.actor.kind === 'commander'
      ? 'commander'
      : `${step.actor.kind}:${step.actor.unitId}:${step.actor.index}`;

  const handleActorSelect = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value;
    if (val === 'commander') {
      onChange(idx, { actor: { kind: 'commander' } });
    } else {
      const [kind, unitId, index] = val.split(':');
      onChange(idx, {
        actor: {
          kind: kind as 'factory' | 'builder',
          unitId: unitId!,
          index: Number(index)
        }
      });
    }
  };

  return (
    <div
      data-testid={`editor-step-row-${idx}`}
      className="p-2.5 pixel-box bg-[#0c0e18] flex items-center gap-2 text-xs flex-wrap"
    >
      {/* Index + Reorder */}
      <div className="flex items-center gap-1">
        <span className="font-mono text-zinc-500 w-5" data-num="true">
          {idx + 1}.
        </span>
        <button
          type="button"
          onClick={() => onMove(idx, -1)}
          disabled={idx === 0}
          data-testid={`btn-move-up-${idx}`}
          className="p-1 border border-zinc-800 hover:border-zinc-500 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer transition-none"
          title="Move Up"
        >
          <ArrowUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onMove(idx, 1)}
          disabled={idx === totalSteps - 1}
          data-testid={`btn-move-down-${idx}`}
          className="p-1 border border-zinc-800 hover:border-zinc-500 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer transition-none"
          title="Move Down"
        >
          <ArrowDown className="size-3" />
        </button>
      </div>

      {/* Actor selector */}
      <select
        data-testid={`select-actor-${idx}`}
        value={actorValue}
        onChange={handleActorSelect}
        className="bg-[#080910] border border-zinc-800 px-2 py-1 text-[10px] font-pixel-heading text-zinc-300 focus:outline-none"
      >
        {availableActors.map((act) => {
          const key = act.kind === 'commander' ? 'commander' : `${act.kind}:${act.unitId}:${act.index}`;
          const label =
            act.kind === 'commander'
              ? '[CDR] Commander'
              : `[${act.kind === 'factory' ? 'FAC' : 'CON'}] ${act.unitId} #${act.index}`;
          return (
            <option key={key} value={key}>
              {label}
            </option>
          );
        })}
      </select>

      {/* Unit display & change button */}
      <button
        type="button"
        data-testid={`btn-pick-unit-${idx}`}
        onClick={() => onPickUnit(idx)}
        className="flex items-center gap-1.5 px-2 py-1 border border-zinc-800 bg-[#080910] hover:border-zinc-500 cursor-pointer transition-none text-zinc-200"
      >
        {step.unitId && <TacticalIcon unitId={step.unitId} size={18} />}
        <span className="font-pixel-heading text-[10px]">{unitName || 'PICK UNIT'}</span>
      </button>

      {/* Count */}
      <div className="flex items-center gap-1">
        <span className="text-zinc-500 font-pixel-heading text-[10px]">×</span>
        <input
          type="number"
          min={1}
          max={50}
          data-testid={`input-count-${idx}`}
          value={step.count}
          onChange={(e) => {
            const count = Math.max(1, Math.min(50, Number(e.target.value) || 1));
            onChange(idx, { count });
          }}
          className="w-12 bg-[#080910] border border-zinc-800 px-1 py-1 text-center font-mono text-xs text-white"
        />
      </div>

      {/* Target Time */}
      <input
        type="number"
        placeholder="T+sec"
        data-testid={`input-target-time-${idx}`}
        value={step.targetTime ?? ''}
        onChange={(e) => {
          const targetTime = e.target.value === '' ? undefined : Number(e.target.value);
          onChange(idx, { targetTime });
        }}
        className="w-16 bg-[#080910] border border-zinc-800 px-1 py-1 text-center font-mono text-[10px] text-zinc-400 placeholder-zinc-600"
      />

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(idx)}
        data-testid={`btn-delete-step-${idx}`}
        className="ml-auto p-1 border border-red-950 text-red-400 hover:border-red-600 hover:text-red-200 cursor-pointer transition-none"
        title="Delete step"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
