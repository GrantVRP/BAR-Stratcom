import React from 'react';
import type { CoachHud, CoachHudLine } from '../../../../core/schemas/protocol';
import type { CoachState } from '../../../../core/schemas/coach';
import type { BuildPlan } from '../../../../core/schemas/plans';
import type { Registry } from '../../../../core/registry';
import { buildCoachHud } from '../../../../core/coach/display';
import { applyHudSettings } from '../../../../core/coach/hud-settings';

import { useLive, useSettings, useSnapshot } from '../../stores';
import { getClientRegistry } from '../../lib/registry';
import { HudBoxesPreview } from './HudBoxesPreview';

export interface HudPreviewProps {
  hud?: CoachHud | null;
  coachState?: CoachState | null;
  plan?: BuildPlan | null;
  registry?: Registry | null;
  className?: string;
}

function toneColorClass(tone: CoachHudLine['tone']): string {
  switch (tone) {
    case 'good':
      return 'text-[#4ade80]';
    case 'warn':
      return 'text-[#fbbf24]';
    case 'danger':
      return 'text-[#f87171]';
    case 'info':
    default:
      return 'text-[#38bdf8]';
  }
}

export function HudPreview({
  hud: directHud,
  coachState,
  plan,
  registry,
  className = ''
}: HudPreviewProps): React.JSX.Element {
  const unitSnapshot = useSnapshot((s) => s.snapshot);
  const enemies = useLive((s) => s.snapshot?.enemies);
  const hudSettings = useSettings((s) => s.settings?.hud);
  const activeRegistry = React.useMemo(() => {
    if (registry) return registry;
    if (unitSnapshot) return getClientRegistry(unitSnapshot);
    return null;
  }, [registry, unitSnapshot]);

  const hud = React.useMemo<CoachHud | null>(() => {
    if (directHud) return directHud;
    if (coachState && plan && activeRegistry) {
      // the same boxes the game shows: the IN-GAME HUD switches apply here too
      return applyHudSettings(buildCoachHud({
        plan,
        steps: coachState.steps,
        currentStepIndex: coachState.currentStepIndex,
        aheadBehindSec: coachState.aheadBehindSec,
        activeAlerts: coachState.alerts,
        registry: activeRegistry,
        clock: coachState.clock,
        factionId: plan.factionId,
        visible: true,
        ...(enemies ? { enemies, enemySeenAt: coachState.enemySeenAt ?? {} } : {})
      }), { enabled: true, boxes: hudSettings?.boxes });
    }
    return null;
  }, [directHud, coachState, plan, activeRegistry, enemies, hudSettings]);

  if (hud && (hud.build || hud.factory || hud.radar)) {
    return (
      <div data-testid="hud-preview" className={`rounded border border-[#27272a] bg-[#07090e]/95 p-3 shadow-lg ${className}`}>
        <div className="mb-2 text-[10px] uppercase tracking-wider text-[#71717a]">WIDGET DISPLAY</div>
        <HudBoxesPreview hud={hud} factionId={plan?.factionId ?? null} inSight={enemies ? Object.values(enemies).reduce((n, c) => n + c, 0) : null} />
      </div>
    );
  }

  return (
    <div
      data-testid="hud-preview"
      className={`rounded border border-[#27272a] bg-[#07090e]/95 p-3 font-mono shadow-lg ${className}`}
    >
      <div className="mb-2 flex items-center justify-between border-b border-[#1f2430] pb-1.5 text-[10px]">
        <div className="flex items-center gap-1.5 text-[#a1a1aa]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#38bdf8]/70" />
          <span className="font-['Press_Start_2P'] text-[10px] text-[#e4e4e7]">
            {hud?.title ?? 'HUD PREVIEW'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hud?.progress && (
            <span
              data-testid="hud-progress"
              className="rounded bg-[#1a202c] px-1.5 py-0.5 text-[10px] text-[#a1a1aa]"
            >
              {hud.progress.done}/{hud.progress.total}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wider text-[#71717a]">WIDGET DISPLAY</span>
        </div>
      </div>

      <div className="space-y-1.5 min-h-[88px] flex flex-col justify-center">
        {!hud || hud.lines.length === 0 ? (
          <div className="text-center text-xs text-[#71717a] italic py-3">
            Waiting for in-game telemetry...
          </div>
        ) : (
          hud.lines.map((line, idx) => (
            <div
              key={idx}
              data-testid={`hud-line-${idx}`}
              className={`truncate font-mono tracking-wide ${
                line.big ? 'text-sm font-bold' : 'text-xs'
              } ${toneColorClass(line.tone)}`}
            >
              {line.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
