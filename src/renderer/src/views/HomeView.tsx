import React, { useState } from 'react';
import type { DemoInfo } from '../../../shared/ipc';
import { useCoach, useLive, usePlans, useSessions } from '../stores';
import { ipcClient } from '../lib/ipc-client';
import { findMatchingDemoFixture } from '../lib/demo-pairing';
import { DemoPickerModal } from '../components/coach/DemoPickerModal';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Tag } from '../components/ui/Tag';
import { FactionEmblem } from '../components/ui/FactionEmblem';
import { factionAccent, factionTagVariant } from '../lib/faction-style';
import { ProfileSuggestionBanner } from '../components/profile/ProfileSuggestionBanner';

const STATUS_STYLE: Record<'good' | 'warn' | 'bad', string> = {
  good: 'border-[#4ade80]/40 text-[#4ade80]',
  warn: 'border-[#fbbf24]/40 text-[#fbbf24]',
  bad: 'border-[#f87171]/40 text-[#f87171]'
};

export function HomeView(): React.JSX.Element {
  const { health } = useLive();
  const { plans, getActivePlan } = usePlans();
  const latest = useSessions((s) => s.latestSession);
  const { start } = useCoach();
  const [demoPickerOpen, setDemoPickerOpen] = useState<boolean>(false);
  const [demoList, setDemoList] = useState<DemoInfo[]>([]);

  const activePlan = getActivePlan() ?? plans[0] ?? null;
  const planAccent = activePlan ? factionAccent(activePlan.factionId) : undefined;

  async function handleStartLive(): Promise<void> {
    if (!activePlan) return;
    const ok = await start({ mode: 'live', planId: activePlan.id });
    if (ok) window.location.hash = '#/coach';
  }

  async function handleStartRadar(): Promise<void> {
    const ok = await start({ mode: 'radar' });
    if (ok) window.location.hash = '#/coach';
  }

  async function handleStartManual(): Promise<void> {
    if (!activePlan) return;
    const ok = await start({ mode: 'manual', planId: activePlan.id });
    if (ok) window.location.hash = '#/coach';
  }

  async function launchDemo(fixtureId: string): Promise<void> {
    const ok = await start({ mode: 'demo', demoId: fixtureId, speed: 4, plan: activePlan ?? undefined, planId: activePlan?.id });
    if (ok) window.location.hash = '#/coach';
  }

  async function handleStartDemo(): Promise<void> {
    const res = await ipcClient.invoke('demo:list');
    const demos = res.ok ? res.data : [];
    setDemoList(demos);
    const match = findMatchingDemoFixture(activePlan, demos);
    if (match) {
      await launchDemo(match.id);
    } else {
      setDemoPickerOpen(true);
    }
  }

  const isHealthy = health.status === 'live' || health.status === 'pregame' || health.status === 'bar-idle';
  const statusTone = isHealthy ? 'good' : health.status === 'no-bar' ? 'warn' : 'bad';
  const nextAction = isHealthy
    ? 'Start a match to coach live.'
    : health.status === 'no-bar'
      ? 'Start BAR, or practise with Demo.'
      : 'Check the widget in Settings.';

  return (
    <div data-testid="view-home" className="mx-auto max-w-6xl space-y-6 p-6 font-mono text-[#e4e4e7]">
      <PageHeader title="COMMAND HOME" />

      <ProfileSuggestionBanner />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Hero: the active plan and the one main action */}
        <section
          data-testid="home-active-plan-card"
          data-faction={activePlan?.factionId ?? 'none'}
          className="flex flex-col gap-6 rounded-lg border-2 border-zinc-700 bg-[#0d0f17] p-6 shadow-lg lg:col-span-2"
          style={planAccent ? { borderColor: planAccent, backgroundColor: `color-mix(in srgb, ${planAccent} 9%, #0b0d14)` } : undefined}
        >
          <span
            data-testid="home-active-plan-heading"
            className="font-['Press_Start_2P'] text-[10px] text-zinc-300"
            style={planAccent ? { color: planAccent } : undefined}
          >
            ACTIVE BUILD PLAN
          </span>

          {activePlan ? (
            <div className="flex items-start gap-4">
              <FactionEmblem faction={activePlan.factionId} size={40} />
              <div className="min-w-0 space-y-2">
                <h2 className="text-lg font-bold leading-snug text-white">{activePlan.title}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag variant={factionTagVariant(activePlan.factionId)}>{activePlan.factionId}</Tag>
                  {activePlan.modes.map((m) => (
                    <Tag key={m} variant="default">
                      {m}
                    </Tag>
                  ))}
                  <Tag variant="default">{activePlan.opening}</Tag>
                  <Tag variant="default">{activePlan.energyStyle}</Tag>
                  <span className="text-[11px] text-zinc-400">{activePlan.steps.length} STEPS</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No plans yet. Add one in the Library.</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={!activePlan}
              onClick={() => void handleStartLive()}
              data-testid="home-start-live-btn"
              className="px-5 py-3"
              style={planAccent ? ({ '--btn-accent': planAccent } as React.CSSProperties) : undefined}
            >
              START COACHING (LIVE)
            </Button>
            {/* Levels: one primary; RADAR, the other way to play a real game, secondary beside it;
                the practice modes quiet, on their own row */}
            <Button
              variant="default"
              size="sm"
              onClick={() => void handleStartRadar()}
              data-testid="home-start-radar-btn"
              title="Live radar in game: your units and every enemy you see or have on radar. No plan needed."
            >
              RADAR (NO PLAN)
            </Button>
          </div>
          <div className="-mt-2 flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" disabled={!activePlan} onClick={() => void handleStartManual()} data-testid="home-start-manual-btn">
              MANUAL CLOCK
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleStartDemo()} data-testid="home-start-demo-btn">
              DEMO 4×
            </Button>
          </div>
        </section>

        {/* Game status: information only; the top bar and Settings hold the controls */}
        <section data-testid="home-status-card" className="space-y-4 rounded-lg border border-zinc-800 bg-[#12131a] p-5">
          <div className="flex items-center justify-between">
            <span className="font-['Press_Start_2P'] text-[10px] text-zinc-400">GAME STATUS</span>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[statusTone]}`}>
              {isHealthy ? 'ONLINE' : health.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-zinc-200">{health.message}</p>
          <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-400">
            <span className="text-zinc-300">Next: </span>
            {nextAction}
          </p>
        </section>
      </div>

      {/* Last game: the latest report, opened directly */}
      <section data-testid="home-last-game-card" className="rounded-lg border border-zinc-800 bg-[#12131a] p-5">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-400">LAST GAME</span>
        {latest ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {latest.report && (
                <span data-testid="home-last-game-grade" className="font-['Press_Start_2P'] text-2xl text-[#fbbf24]">
                  {latest.report.grade}
                </span>
              )}
              <div>
                <p className="text-sm font-bold text-white">{latest.meta.mapScriptName}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {latest.meta.startedAt.slice(0, 10)} · {Math.floor(latest.meta.durationSec / 60)} min
                  {latest.report ? ` · ${Math.round(latest.report.adherence * 100)}% plan adherence` : ''}
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="md"
              data-testid="home-open-last-report"
              onClick={() => {
                window.location.hash = `#/review?sessionId=${latest.meta.sessionId}`;
              }}
            >
              OPEN REPORT
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-zinc-400">
            No games yet.
          </p>
        )}
      </section>

      <DemoPickerModal
        isOpen={demoPickerOpen}
        demos={demoList}
        onSelectDemo={(id) => {
          setDemoPickerOpen(false);
          void launchDemo(id);
        }}
        onClose={() => setDemoPickerOpen(false)}
      />
    </div>
  );
}
