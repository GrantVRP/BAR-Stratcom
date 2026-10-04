import React, { useState, useEffect, useMemo } from 'react';
import { useSessions, usePlans } from '../stores';
import { ProfileSuggestionBanner } from '../components/profile/ProfileSuggestionBanner';
import { SessionList } from '../components/review/SessionList';
import { MetricTiles } from '../components/review/MetricTiles';
import { StepAdherenceChart } from '../components/review/StepAdherenceChart';
import { EconomyChart } from '../components/review/EconomyChart';
import { BenchmarkChart } from '../components/review/BenchmarkChart';
import { SaveOpeningModal } from '../components/review/SaveOpeningModal';
import { ipcClient } from '../lib/ipc-client';
import type { SessionDetail } from '../../../core/schemas/session';

function getSessionIdFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const match = hash.match(/sessionId=([^&]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

export function ReviewView(): React.JSX.Element {
  const { sessions, load } = useSessions();
  const plans = usePlans((s) => s.plans);

  const [selectedId, setSelectedId] = useState<string | null>(getSessionIdFromHash);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function handleHashChange(): void {
      const id = getSessionIdFromHash();
      if (id) setSelectedId(id);
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const activeId = useMemo(() => {
    if (selectedId && sessions.some((s) => s.sessionId === selectedId)) {
      return selectedId;
    }
    return sessions[0]?.sessionId ?? null;
  }, [selectedId, sessions]);

  useEffect(() => {
    let isCurrent = true;
    if (!activeId) return;
    ipcClient
      .invoke('sessions:get', { sessionId: activeId, includeSeries: true })
      .then((res) => {
        if (!isCurrent) return;
        if (res.ok && res.data) {
          setSessionDetail(res.data);
        } else {
          setSessionDetail(null);
        }
      })
      .catch(() => {
        if (isCurrent) setSessionDetail(null);
      });
    return () => {
      isCurrent = false;
    };
  }, [activeId]);

  const currentSessionDetail = sessionDetail?.meta.sessionId === activeId ? sessionDetail : null;
  const report = currentSessionDetail?.report;
  const attachedPlan = useMemo(() => {
    if (!currentSessionDetail?.meta.planId) return null;
    return plans.find((p) => p.id === currentSessionDetail.meta.planId) ?? null;
  }, [currentSessionDetail, plans]);

  return (
    <div data-testid="view-review" className="flex h-full flex-col gap-4 p-4">
      <ProfileSuggestionBanner />

      {sessions.length === 0 ? (
        <div
          data-testid="review-empty-state"
          className="pixel-box flex flex-1 flex-col items-center justify-center border-2 border-black bg-[#12131a] p-8 text-center shadow-[3px_3px_0px_#000]"
        >
          <div className="font-['Press_Start_2P'] text-sm text-[#fbbf24]">
            NO SESSIONS RECORDED
          </div>
          <div className="mt-3 max-w-md font-mono text-xs text-zinc-400">
            Play a match in Beyond All Reason with the StratCom widget or run a Demo match
            from Home to generate a post-match execution review.
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden">
          <SessionList
            sessions={sessions}
            selectedSessionId={activeId}
            onSelectSession={(id) => setSelectedId(id)}
          />

          <div
            data-testid="review-report-panel"
            className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1"
          >
            {currentSessionDetail ? (
              <>
                {/* Header Actions */}
                <div className="pixel-box flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#12131a] p-3 shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-zinc-100">
                      {currentSessionDetail.meta.mapScriptName}
                    </span>
                    {currentSessionDetail.meta.source === 'fixture' ? (
                      <span
                        data-testid="review-demo-badge"
                        className="border border-[#2ec4b6] bg-[#0d2a28] px-1.5 py-0.5 font-['Press_Start_2P'] text-[10px] text-[#2ec4b6]"
                      >
                        DEMO
                      </span>
                    ) : (
                      <span className="border border-zinc-800 bg-[#0d0f17] px-1.5 py-0.5 font-['Press_Start_2P'] text-[10px] text-zinc-400 uppercase">
                        {currentSessionDetail.meta.mode}
                      </span>
                    )}
                  </div>

                  <div>
                    {currentSessionDetail.meta.mode === 'player' ? (
                      <button
                        type="button"
                        data-testid="btn-save-opening"
                        onClick={() => setSaveModalOpen(true)}
                        className="cursor-pointer border-2 border-black bg-[#449bed] px-3 py-1.5 font-['Press_Start_2P'] text-[10px] text-black hover:bg-[#60a5fa]"
                      >
                        SAVE MY OPENING AS PLAN
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="btn-capture-plan"
                        onClick={() => setSaveModalOpen(true)}
                        className="cursor-pointer border-2 border-black bg-[#2ec4b6] px-3 py-1.5 font-['Press_Start_2P'] text-[10px] text-black hover:bg-[#4dd4c6]"
                      >
                        CAPTURE PLAN
                      </button>
                    )}
                  </div>
                </div>

                {report ? (
                  <>
                    {/* Grade & Top Tips */}
                    <div className="pixel-box grid grid-cols-1 gap-4 border-2 border-black bg-[#12131a] p-4 shadow-[2px_2px_0px_#000] md:grid-cols-3">
                      <div className="flex flex-col items-center justify-center border border-zinc-800 bg-[#0d0f17] p-4 text-center">
                        <div className="font-['Press_Start_2P'] text-[10px] text-zinc-400">
                          EXECUTION GRADE
                        </div>
                        <div
                          data-testid="review-grade-badge"
                          className={`mt-2 font-['Press_Start_2P'] text-5xl ${
                            report.grade === 'S'
                              ? 'text-[#fbbf24]'
                              : report.grade === 'A'
                                ? 'text-[#4ade80]'
                                : report.grade === 'B'
                                  ? 'text-[#60a5fa]'
                                  : report.grade === 'C'
                                    ? 'text-[#fbbf24]'
                                    : 'text-[#f87171]'
                          }`}
                        >
                          {report.grade}
                        </div>
                        <div className="mt-2 font-mono text-xs tabular-nums text-zinc-300">
                          {Math.round(report.adherence * 100)}% PLAN ADHERENCE
                        </div>
                      </div>

                      <div className="border border-zinc-800 bg-[#0d0f17] p-3 md:col-span-2">
                        <div className="font-['Press_Start_2P'] text-[10px] text-zinc-400">
                          COACH ANALYSIS & TOP TIPS
                        </div>
                        <div data-testid="review-tips-list" className="mt-2 space-y-2">
                          {report.tips.length === 0 ? (
                            <div className="font-mono text-xs text-zinc-500">
                              Clean execution! No major errors detected.
                            </div>
                          ) : (
                            report.tips.map((tip) => (
                              <div
                                key={tip.id}
                                data-testid={`review-tip-${tip.id}`}
                                className="flex items-start gap-2 border-l-2 border-zinc-700 bg-[#12131a] p-2"
                              >
                                <span
                                  className={`border px-1 py-0.5 font-['Press_Start_2P'] text-[10px] ${
                                    tip.severity === 'danger'
                                      ? 'border-[#f87171] text-[#f87171]'
                                      : tip.severity === 'warn'
                                        ? 'border-[#fbbf24] text-[#fbbf24]'
                                        : 'border-[#449bed] text-[#449bed]'
                                  }`}
                                >
                                  {tip.severity.toUpperCase()}
                                </span>
                                <span className="font-mono text-xs text-zinc-300">
                                  {tip.text}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <MetricTiles metrics={report.metrics} />
                    <StepAdherenceChart steps={report.steps} plan={attachedPlan} />
                    <EconomyChart states={currentSessionDetail.series?.states} plan={attachedPlan} />
                    <BenchmarkChart
                      benchmark={report.benchmark}
                      meta={currentSessionDetail.meta}
                      states={currentSessionDetail.series?.states}
                    />
                  </>
                ) : (
                  <div className="p-8 text-center font-mono text-xs text-zinc-500">
                    Report processing or unavailable for this session.
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center font-mono text-xs text-zinc-500">
                Select a match from the left to view the review report.
              </div>
            )}
          </div>
        </div>
      )}

      {currentSessionDetail && (
        <SaveOpeningModal
          session={currentSessionDetail}
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
        />
      )}
    </div>
  );
}
