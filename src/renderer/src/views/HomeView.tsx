import { useState } from 'react';
import type { DemoInfo } from '../../../shared/ipc';
import { useCoach, useLive, usePlans, useSettings } from '../stores';
import { ipcClient } from '../lib/ipc-client';
import { findMatchingDemoFixture } from '../lib/demo-pairing';
import { DemoPickerModal } from '../components/coach/DemoPickerModal';
import { Button } from '../components/ui/Button';
import { Tag } from '../components/ui/Tag';
import { FactionEmblem } from '../components/ui/FactionEmblem';
import { factionTagVariant } from '../lib/faction-style';
import { Provenance } from '../components/ui/Provenance';
import { ProfileSuggestionBanner } from '../components/profile/ProfileSuggestionBanner';

export function HomeView(): React.JSX.Element {
  const { health } = useLive();
  const { plans, getActivePlan } = usePlans();
  const { start } = useCoach();
  const settings = useSettings((s) => s.settings);
  const [demoPickerOpen, setDemoPickerOpen] = useState<boolean>(false);
  const [demoList, setDemoList] = useState<DemoInfo[]>([]);

  const activePlan = getActivePlan() ?? plans[0] ?? null;

  async function handleStartLive(): Promise<void> {
    if (!activePlan) return;
    const ok = await start({ mode: 'live', planId: activePlan.id });
    if (ok) window.location.hash = '#/coach';
  }

  async function handleStartManual(): Promise<void> {
    if (!activePlan) return;
    const ok = await start({ mode: 'manual', planId: activePlan.id });
    if (ok) window.location.hash = '#/coach';
  }

  async function launchDemo(fixtureId: string): Promise<void> {
    const ok = await start({
      mode: 'demo',
      demoId: fixtureId,
      speed: 4,
      plan: activePlan ?? undefined,
      planId: activePlan?.id
    });
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

  const profile = settings?.profile ?? 'intermediate';
  const isHealthy = health.status === 'live' || health.status === 'pregame' || health.status === 'bar-idle';

  return (
    <div data-testid="view-home" className="space-y-6 p-6 font-mono text-[#e4e4e7] max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272a] pb-4">
        <div>
          <h1 className="font-['Press_Start_2P'] text-lg text-[#f8fafc] tracking-wide">COMMAND HOME</h1>
          <p className="mt-1 text-xs text-[#a1a1aa]">
            Live match tracking, active build orchestration, and tactical telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded border border-[#27272a] bg-[#12131a] px-3 py-1.5 text-xs">
          <span className="text-[#71717a] uppercase">PROFILE:</span>
          <span className="font-bold uppercase text-[#38bdf8]">{profile}</span>
        </div>
      </div>

      {/* Profile suggestion banner (04 §4.4, 06 §4.2) */}
      <ProfileSuggestionBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Card (06 §4.2) */}
        <div
          data-testid="home-status-card"
          className="rounded-lg border border-[#27272a] bg-[#12131a] p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
              <span className="font-['Press_Start_2P'] text-[10px] text-[#a1a1aa]">GAME STATUS</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isHealthy
                    ? 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/40'
                    : health.status === 'no-bar'
                      ? 'bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/40'
                      : 'bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/40'
                }`}
              >
                {isHealthy ? 'ONLINE' : health.status.toUpperCase()}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[10px] uppercase text-[#71717a]">Heartbeat / State</span>
                <p className="mt-0.5 text-xs text-[#e4e4e7]">{health.message}</p>
              </div>

              <div className="rounded bg-[#0a0c14] p-3 text-xs border border-[#1f2430]">
                <span className="text-[10px] font-bold uppercase text-[#38bdf8]">▸ NEXT ACTION</span>
                <p className="mt-1 text-xs text-[#a1a1aa]">
                  {isHealthy
                    ? 'BAR connected. Start a match vs AI or players to begin live coaching.'
                    : health.status === 'no-bar'
                      ? 'Start Beyond All Reason, run Manual Clock, or test with Demo mode.'
                      : 'Check widget installation in Settings or reload LuaUI (/luaui reload).'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1f2430] flex gap-2">
            <Button variant="default" size="sm" onClick={() => { window.location.hash = '#/settings'; }} className="border border-[#27272a]">
              SETTINGS
            </Button>
            <Button variant="default" size="sm" onClick={() => void handleStartDemo()} className="border border-[#38bdf8]/40 text-[#38bdf8]">
              TEST DEMO
            </Button>
          </div>
        </div>

        {/* Active Plan Card (06 §4.2) */}
        <div
          data-testid="home-active-plan-card"
          className="lg:col-span-2 rounded-lg border-2 border-[#2563eb]/40 bg-[#0d131f] p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <span className="font-['Press_Start_2P'] text-[10px] text-[#38bdf8]">ACTIVE BUILD PLAN</span>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  window.location.hash = '#/library';
                }}
                className="border border-[#27272a]"
              >
                BROWSE PLANS
              </Button>
            </div>

            {activePlan ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FactionEmblem faction={activePlan.factionId} size={32} />
                    <div>
                      <h2 className="text-base font-bold text-[#f8fafc]">{activePlan.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Tag variant={factionTagVariant(activePlan.factionId)}>{activePlan.factionId}</Tag>
                        {activePlan.modes.map((m) => (
                          <Tag key={m} variant="default">
                            {m}
                          </Tag>
                        ))}
                        <Tag variant="default">{activePlan.opening}</Tag>
                        <Tag variant="default">{activePlan.energyStyle}</Tag>
                        <span className="text-[11px] text-[#a1a1aa]">{activePlan.steps.length} STEPS</span>
                      </div>
                    </div>
                  </div>
                  <Provenance kind="SIMULATED" />
                </div>

                <div className="rounded bg-[#070b12] p-2.5 text-xs text-[#94a3b8] border border-[#1e293b]">
                  <span className="text-[10px] uppercase text-[#64748b]">PROVENANCE //</span>{' '}
                  {activePlan.source.kind === 'curated'
                    ? `Curated from replay ${activePlan.source.replayId} on ${activePlan.source.map}`
                    : `Plan: ${activePlan.title}`}
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center text-sm text-[#71717a] italic">
                No build plans found in library. Import or create a plan to begin.
              </div>
            )}
          </div>

          {/* Three Coaching Buttons (06 §4.2) */}
          <div className="mt-6 pt-4 border-t border-[#1e293b] flex flex-wrap gap-3">
            <Button
              variant="armada"
              size="md"
              disabled={!activePlan}
              onClick={() => void handleStartLive()}
              data-testid="home-start-live-btn"
              className="flex-1 min-w-[180px] bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold border-[#22c55e]"
            >
              START COACHING (LIVE)
            </Button>
            <Button variant="default" size="md" disabled={!activePlan} onClick={() => void handleStartManual()} data-testid="home-start-manual-btn" className="flex-1 min-w-[150px] border border-[#fbbf24]/50 text-[#fbbf24] hover:bg-[#fbbf24]/10">
              MANUAL CLOCK
            </Button>
            <Button variant="default" size="md" onClick={() => void handleStartDemo()} data-testid="home-start-demo-btn" className="flex-1 min-w-[120px] border border-[#38bdf8]/50 text-[#38bdf8] hover:bg-[#38bdf8]/10">
              DEMO 4×
            </Button>
          </div>
        </div>
      </div>

      {/* Last Game Card Placeholder (06 §4.2, M07 placeholder) */}
      <div
        data-testid="home-last-game-card"
        className="rounded-lg border border-[#27272a] bg-[#12131a] p-5 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-[#a1a1aa]">LAST GAME REPORT</span>
          <span className="text-[10px] text-[#71717a] uppercase">MILESTONE M07</span>
        </div>
        <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#e4e4e7] font-bold">No recent match session recorded.</p>
            <p className="mt-1 text-xs text-[#a1a1aa]">
              Play a live match vs AI or human opponents with the StratCom widget enabled to generate economy
              metrics, benchmark bands, and tactical post-game analysis.
            </p>
          </div>
          <Button variant="default" size="sm" onClick={() => { window.location.hash = '#/review'; }} className="border border-[#27272a]">
            VIEW REVIEWS
          </Button>
        </div>
      </div>

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
