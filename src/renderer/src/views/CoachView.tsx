import React, { useEffect, useState, useMemo } from 'react';
import { useCoach, useLive, usePlans, useSettings, useSnapshot } from '../stores';
import { Button } from '../components/ui/Button';
import { HudPreview } from '../components/coach/HudPreview';
import { CoachNextCard } from '../components/coach/CoachNextCard';
import { CoachAlerts } from '../components/coach/CoachAlerts';
import { CoachTelemetry } from '../components/coach/CoachTelemetry';
import { CoachUpNext } from '../components/coach/CoachUpNext';
import { ipcClient } from '../lib/ipc-client';

import { formatDemoHeader } from '../lib/demo-pairing';

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
  const [showHudPreview, setShowHudPreview] = useState<boolean>(true);
  const [isManualRunning, setIsManualRunning] = useState<boolean>(false);
  const [readySessionId, setReadySessionId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = ipcClient.on('review:ready', (data) => {
      setReadySessionId(data.sessionId);
    });
    return () => unsub();
  }, []);

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
                mode === 'live'
                  ? 'bg-[#4ade80] animate-pulse'
                  : mode === 'demo'
                    ? 'bg-[#38bdf8]'
                    : mode === 'manual'
                      ? 'bg-[#fbbf24]'
                      : 'bg-[#71717a]'
              }`}
            />
            <span data-testid="coach-mode-badge" className="font-bold uppercase tracking-wider text-[11px]">
              {mode === 'manual' ? 'MANUAL CLOCK' : mode === 'demo' ? demoHeader : mode.toUpperCase()}
            </span>
          </div>
          <span data-testid="coach-clock" className="text-xl font-bold tracking-wider text-[#f8fafc]">
            {formatClock(coachState?.clock ?? 0)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs uppercase text-[#a1a1aa] truncate max-w-[200px] hidden sm:inline">
            {activePlan?.factionId.toUpperCase()} // {activePlan?.title.toUpperCase()}
          </span>
          <span
            data-testid="coach-step-count"
            className="text-xs rounded bg-[#1f2430] px-2 py-1 text-[#38bdf8]"
          >
            {coachState ? `${coachState.currentStepIndex + 1}/${coachState.steps.length}` : '0/0'}
          </span>
          {!standalone && (
            <Button
              variant="default"
              size="sm"
              onClick={() => void ipcClient.invoke('coach:toggleWindow', { action: 'open' })}
              title="Open detached coach window on second monitor or overlay"
              className="border border-[#38bdf8]/40 text-[#38bdf8]"
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
              <Button variant="armada" size="sm" onClick={() => void handleToggleClock()}>
                {isManualRunning ? 'PAUSE CLOCK' : 'START CLOCK'}
              </Button>
              <Button variant="default" size="sm" onClick={() => void manualAction('reset')}>
                RESET
              </Button>
              <span className="text-[11px] text-[#a1a1aa]">(Space toggles clock)</span>
            </div>
            {planStep && (
              <Button variant="armada" size="sm" onClick={() => void markDone(planStep.id)}>
                MARK STEP DONE
              </Button>
            )}
          </div>
        )}

        {readySessionId && (
          <div
            data-testid="coach-review-ready-banner"
            className="flex items-center justify-between rounded border-2 border-[#38bdf8] bg-[#0c1626] p-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">REPORT READY</span>
              <span className="text-[#e4e4e7]">Post-match analysis completed.</span>
            </div>
            <Button
              variant="armada"
              size="sm"
              onClick={() => {
                window.location.hash = `#/review?session=${readySessionId}`;
              }}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold border-[#22c55e]"
            >
              VIEW REPORT
            </Button>
          </div>
        )}

        {/* HUD Preview (demo mode or toggleable) */}
        {(mode === 'demo' || showHudPreview) && !isOverlay && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-[#71717a]">
              <span>IN-GAME WIDGET PREVIEW</span>
              <button
                type="button"
                className="underline hover:text-[#a1a1aa]"
                onClick={() => setShowHudPreview(!showHudPreview)}
              >
                {showHudPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showHudPreview && <HudPreview coachState={coachState} plan={activePlan} />}
          </div>
        )}
      </div>
    </div>
  );
}
