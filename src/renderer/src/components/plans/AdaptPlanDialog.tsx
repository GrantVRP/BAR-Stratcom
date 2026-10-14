import React, { useMemo, useState } from 'react';
import { adaptPlan, diffPlanSteps } from '../../../../core/plans';
import { avgWindFor } from '../../../../core/maps';
import type { BuildPlan, BuildStep, MapRecord } from '../../../../core/schemas';
import { useSnapshot } from '../../stores';
import { getClientRegistry } from '../../lib/registry';
import { AVG_WIND_TABLE } from '../../lib/wind-table';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Provenance } from '../ui/Provenance';
import { SimGraph } from './SimGraph';

export interface AdaptPlanDialogProps {
  open: boolean;
  plan: BuildPlan;
  map: MapRecord;
  onClose: () => void;
  onSave: (adapted: BuildPlan) => Promise<void>;
}

/** Short labels for the adapter's transforms. */
export function transformLabel(t: string, unitName: (id: string) => string): string | null {
  if (t === 'energy(wind→solar)') return 'Wind turbines → solar';
  if (t === 'energy(solar→wind)') return 'Solar → wind turbines';
  if (t === 'retime(asap)') return 'Re-timed';
  const fix = /^stall-fix\((.+)\)$/.exec(t);
  if (fix) return `+1 ${unitName(fix[1]!)} (energy stall fix)`;
  return null; // base(...) is the plan itself
}

/** Preview of a plan adapted to a map: what changes, the new economy, and save. */
export function AdaptPlanDialog({ open, plan, map, onClose, onSave }: AdaptPlanDialogProps): React.JSX.Element {
  const snapshot = useSnapshot((s) => s.snapshot);
  const getUnitName = useSnapshot((s) => s.getUnitName);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    if (!open || !snapshot) return null;
    try {
      return adaptPlan({
        registry: getClientRegistry(snapshot),
        library: [plan],
        target: {
          factionId: plan.factionId,
          mapRecord: map,
          avgWind: avgWindFor(map, AVG_WIND_TABLE),
          mode: plan.modes[0]!,
          skill: plan.skill
        },
        createdAt: new Date().toISOString()
      });
    } catch {
      return null;
    }
  }, [open, snapshot, plan, map]);

  const adapted = result && !('error' in result) ? result : null;
  const diff = useMemo(() => (adapted ? diffPlanSteps(plan.steps, adapted.plan.steps) : null), [adapted, plan]);
  const unitChanges = diff?.changed.filter((c) => c.fields.some((f) => f !== 'time')) ?? [];
  const retimed = diff?.changed.filter((c) => c.fields.every((f) => f === 'time')).length ?? 0;
  const label = (s: BuildStep): string => `${s.count}× ${s.unitId ? getUnitName(s.unitId) : s.action}`;

  return (
    <Dialog open={open} onClose={onClose} title={`ADAPT TO ${map.name.toUpperCase()}`} maxWidth="max-w-3xl">
      {!adapted || !diff ? (
        <p data-testid="adapt-unavailable" className="font-mono text-xs text-zinc-400">
          This plan cannot be adapted (no matching mode or unit data).
        </p>
      ) : (
        <div data-testid="adapt-preview" className="space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {adapted.transforms
              .map((t) => transformLabel(t, getUnitName))
              .filter((t): t is string => t !== null)
              .map((t, i) => (
                <span key={i} className="border border-zinc-700 px-2 py-0.5 text-zinc-200">
                  {t}
                </span>
              ))}
            <Provenance kind="ESTIMATED" tooltip="Wind classes and the stall fix are estimated rules of thumb" />
          </div>
          {adapted.issues.warnings.some((w) => w.code === 'W_WIND_UNKNOWN') && (
            <p className="text-[#fbbf24]">Wind unknown on this map: energy kept as planned.</p>
          )}

          <ul data-testid="adapt-diff" className="space-y-1">
            {diff.added.map((s) => (
              <li key={`a-${s.id}`} className="text-[#4ade80]">+ {label(s)}</li>
            ))}
            {unitChanges.map((c) => (
              <li key={`c-${c.after.id}`} className="text-zinc-200">
                ~ {label(c.before)} → {label(c.after)}
              </li>
            ))}
            {diff.removed.map((s) => (
              <li key={`r-${s.id}`} className="text-[#f87171]">− {label(s)}</li>
            ))}
            {retimed > 0 && <li className="text-zinc-400">{retimed} steps re-timed</li>}
          </ul>

          <SimGraph plan={adapted.plan} mapRecord={map} />

          {adapted.issues.errors.length > 0 && (
            <p className="text-[#f87171]">{adapted.issues.errors[0]!.message}</p>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" size="md" onClick={onClose}>
          CANCEL
        </Button>
        <Button
          variant="primary"
          size="md"
          data-testid="adapt-save-btn"
          disabled={!adapted || adapted.issues.errors.length > 0 || saving}
          onClick={() => {
            if (!adapted) return;
            setSaving(true);
            void onSave(adapted.plan).finally(() => setSaving(false));
          }}
        >
          SAVE AS NEW PLAN
        </Button>
      </div>
    </Dialog>
  );
}
