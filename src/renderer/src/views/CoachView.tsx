import React, { useEffect, useState, useMemo } from 'react';
import { useCoach, useLive, usePlans, useSettings, useSnapshot } from '../stores';
import { Button } from '../components/ui/Button';
import { HudPreview } from '../components/coach/HudPreview';
import { CoachNextCard } from '../components/coach/CoachNextCard';
import { CoachAlerts } from '../components/coach/CoachAlerts';
import { CoachTelemetry } from '../components/coach/CoachTelemetry';
import { CoachUpNext } from '../components/coach/CoachUpNext';
import { HudBoxSwitches } from '../components/coach/HudBoxSwitches';
import { RadarContacts } from '../components/coach/RadarContacts';
import { ipcClient } from '../lib/ipc-client';

import { formatDemoHeader } from '../lib/demo-pairing';
import { factionAccent } from '../lib/faction-style';
import { isAssistOn } from '../lib/assist';

export interface CoachViewProps {
  standalone?: boolean;
}

function formatClock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function CoachView({ standalone = false }: CoachViewProps): React.JSX.Element {
  const { coachState, isRunning, mode, demoId, stop, manualAction, markDone } = useCoach();
  const snapshot = useLive((s) => s.snapshot);
  const { plans, activePlanId } = usePlans();
  const getUnitName = useSnapshot((s) => s.getUnitName);
  const settings = useSettings((s) => s.settings);
  const [isManualRunning, setIsManualRunning] = useState<boolean>(false);

  const statePlanId = coachState?.planId;
  const activePlan = useMemo(() => {
    if (statePlanId) {
      const fromState = plans.find((p) => p.id === statePlanId);
      if (fromState) return fromState;
    }
    if (activePlanId) {
      const fromActive = plans.find((p) => p.id === activePlanId);
      if (fromActive) return fromActive;
    }
    if (demoId) {
      const fromDemo = plans.find(
        (p) => p.id === demoId || (p.source && 'sessionId' in p.source && p.source.sessionId === demoId)
      );
      if (fromDemo) return fromDemo;
    }
    return plans[0] ?? null;
  }, [statePlanId, activePlanId, demoId, plans]);

  const demoHeader = useMemo(() => formatDemoHeader(demoId, activePlan), [demoId, activePlan]);

  const currentStep = coachState?.steps[coachState.currentStepIndex] ?? null;
  const planStep =
    activePlan && coachState && coachState.currentStepIndex < activePlan.steps.length
      ? activePlan.steps[coachState.currentStepIndex]
      : null;

  // Space key toggles manual clock (06 §4.5)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.code === 'Space' && mode === 'manual') {
        const el = e.target as HTMLElement | null;
        if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.tagName === 'BUTTON') return;
        e.preventDefault();
        const nextAction = isManualRunning ? 'pause' : 'start';
        setIsManualRunning(!isManualRunning);
        void manualAction(nextAction);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isManualRunning, manualAction]);

  async function handleToggleClock(): Promise<void> {
    const nextAction = isManualRunning ? 'pause' : 'start';
    setIsManualRunning(!isManualRunning);
    await manualAction(nextAction);
  }

  const isOverlay = standalone && Boolean(settings?.coachWindow?.overlayMode);

  return (
    <div
      data-testid="view-coach"
      className={`flex h-full flex-col font-mono text-[#e4e4e7] ${
        isOverlay ? 'bg-black/85 p-3' : 'bg-[#0a0c14] p-4 lg:p-6'
      }`}
    >
      {/* Top Bar (06 §4.5) */}
      <div className="flex items-center justify-between border-b border-[#27272a] pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded bg-[#18181b] px-2 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                mode === 'live' || mode === 'radar'
                  ? 'bg-[#4ade80] animate-pulse'
                  : mode === 'demo'
                    ? 'bg-[#38bdf8]'
                    : mode === 'manual'
                      ? 'bg-[#fbbf24]'
                      : 'bg-[#71717a]'
              }`}
            />
            <span data-testid="coach-mode-badge" className="font-bold uppercase tracking-wider text-[11px]">
              {mode === 'manual' ? 'MANUAL CLOCK' : mode === 'demo' ? demoHeader : mode === 'radar' ? 'RADAR (NO PLAN)' : mode.toUpperCase()}
            </span>
          </div>
          <span data-testid="coach-clock" className="text-xl font-bold tracking-wider text-[#f8fafc]">
            {formatClock(coachState?.clock ?? 0)}
          </span>
          {isAssistOn(settings?.assist) && (
            <span
              data-testid="coach-assist-on"
              title="In-game assist is on (Settings → Assist)"
              className="border border-[#4ade80]/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#4ade80]"
            >
              ASSIST ON
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {mode !== 'radar' && (
            <>
          <span className="text-xs uppercase text-[#a1a1aa] truncate max-w-[200px] hidden sm:inline">
            <span style={{ color: factionAccent(activePlan?.factionId) }}>{activePlan?.factionId.toUpperCase()}</span> //{' '}
            {activePlan?.title.toUpperCase()}
          </span>
          <span
            data-testid="coach-step-count"
            className="text-xs rounded bg-[#1f2430] px-2 py-1 text-[#38bdf8]"
          >
            {coachState ? `${coachState.currentStepIndex + 1}/${coachState.steps.length}` : '0/0'}
          </span>
            </>
          )}
          {!standalone && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void ipcClient.invoke('coach:toggleWindow', { action: 'open' })}
              title="Open detached coach window on second monitor or overlay"
            >
              DETACH WINDOW
            </Button>
          )}
          {isRunning && (
            <Button variant="danger" size="sm" onClick={() => void stop()} data-testid="coach-stop-btn">
              STOP
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {mode === 'radar' ? (
        <div className="grid flex-1 grid-cols-1 content-start gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <RadarContacts enemies={snapshot?.enemies ?? null} seenAt={coachState?.enemySeenAt ?? {}} clock={coachState?.clock ?? 0} getUnitName={getUnitName} />
          {!isOverlay && <CoachTelemetry snapshot={snapshot} projections={null} />}
        </div>
      ) : (
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        <CoachNextCard
          currentStep={currentStep}
          planStep={planStep ?? null}
          plan={activePlan}
          aheadBehindSec={coachState?.aheadBehindSec ?? null}
          clock={coachState?.clock ?? 0}
          getUnitName={getUnitName}
          isManualMode={mode === 'manual'}
          onMarkDone={planStep ? () => void markDone(planStep.id) : undefined}
        />

        <CoachAlerts alerts={coachState?.alerts ?? []} />

        {/* Telemetry and Up-Next (hidden in overlay mode) */}
        {!isOverlay && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CoachTelemetry snapshot={snapshot} projections={coachState?.projections} />
            <CoachUpNext
              plan={activePlan}
              steps={coachState?.steps ?? []}
              currentStepIndex={coachState?.currentStepIndex ?? 0}
              getUnitName={getUnitName}
            />
          </div>
        )}

        {/* Manual Clock Controls */}
        {mode === 'manual' && (
          <div className="flex items-center justify-between rounded border border-[#fbbf24]/30 bg-[#fbbf24]/5 p-3">
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => void handleToggleClock()}>
                {isManualRunning ? 'PAUSE CLOCK' : 'START CLOCK'}
              </Button>
              <Button variant="default" size="sm" onClick={() => void manualAction('reset')}>
                RESET
              </Button>
              <span className="text-[11px] text-[#a1a1aa]">(Space toggles clock)</span>
            </div>
          </div>
        )}

        {/* Which widget boxes show in game (T09.6), then the demo's preview of them */}
        {!isOverlay && mode !== 'manual' && <HudBoxSwitches />}
        {mode === 'demo' && !isOverlay && <HudPreview coachState={coachState} plan={activePlan} />}
      </div>
      )}
    </div>
  );
}
