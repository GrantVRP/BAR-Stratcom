import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { usePlans, useSettings } from '../../stores';
import type { BuildPlan } from '../../../../core/schemas';
import { FactionTag } from '../ui/FactionTag';

export interface StepPlanOrDemoProps {
  onBack: () => void;
  onNext: () => void;
  onTryDemo: () => Promise<void>;
}

export function StepPlanOrDemo({ onBack, onNext, onTryDemo }: StepPlanOrDemoProps): React.JSX.Element {
  const { plans, activePlanId, setActivePlanId, loadPlans } = usePlans();
  const { settings, updateSettings } = useSettings();
  const [startingDemo, setStartingDemo] = useState<boolean>(false);

  useEffect(() => {
    if (plans.length === 0) {
      void loadPlans();
    }
  }, [plans.length, loadPlans]);

  // Pick up to 3 suggested plans (prefer plans matching profile, or take first 3)
  const currentProfile = settings?.profile ?? 'intermediate';
  const matchingPlans = plans.filter((p) => p.skill === currentProfile);
  const suggestedPlans: BuildPlan[] = (matchingPlans.length >= 3 ? matchingPlans : plans).slice(0, 3);

  const handleSelectPlan = async (plan: BuildPlan): Promise<void> => {
    setActivePlanId(plan.id);
    await updateSettings({ activePlanId: plan.id });
  };

  const handleDemoClick = async (): Promise<void> => {
    setStartingDemo(true);
    try {
      await onTryDemo();
    } finally {
      setStartingDemo(false);
    }
  };

  return (
    <div data-testid="onboarding-step-5" className="space-y-6 font-mono text-xs">
      <div className="rounded border border-[#27272a] bg-[#12131a] p-5 space-y-4">
        <div className="border-b border-[#1f2430] pb-3">
          <span className="font-['Press_Start_2P'] text-sm text-[#38bdf8]">
            SELECT AN OPENING OR TRY DEMO
          </span>
          <p className="mt-1 text-xs text-[#a1a1aa]">
            ACTIVATE A BUILD ORDER TO COACH IN YOUR NEXT GAME, OR EXPERIENCE A LIVE COACHING DEMO
          </p>
        </div>

        <p className="text-xs text-[#e4e4e7] leading-relaxed">
          Choose a build order for the coach to track, or run a 4× simulated match to see how live
          resource warnings and step countdowns look in action.
        </p>

        {/* Suggested Plans Grid */}
        <div className="space-y-2">
          <span className="font-bold text-[#e4e4e7] text-xs uppercase">
            Suggested Plans for {currentProfile} ({suggestedPlans.length})
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {suggestedPlans.map((plan) => {
              const isSelected = (activePlanId ?? settings?.activePlanId) === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  data-testid={`suggested-plan-${plan.id}`}
                  onClick={() => void handleSelectPlan(plan)}
                  className={`rounded border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-[#38bdf8] bg-[#38bdf8]/10 text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                      : 'border-[#27272a] bg-[#0a0c14] text-[#a1a1aa] hover:border-[#3f3f46]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <FactionTag factionId={plan.factionId} />
                    {isSelected && <span className="text-[#38bdf8] font-bold">ACTIVE ✓</span>}
                  </div>
                  <div className="mt-2 font-bold text-xs text-[#e4e4e7] truncate">{plan.title}</div>
                  <div className="mt-1 text-[11px] text-[#71717a]">
                    {plan.steps.length} steps // {plan.opening}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Try Demo Match Box */}
        <div className="rounded border border-[#2ec4b6]/30 bg-[#0d2226] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="font-['Press_Start_2P'] text-[10px] text-[#2ec4b6]">
              WANT TO SEE IT IN ACTION FIRST?
            </div>
            <p className="mt-1 text-xs text-[#99f6e4]">
              Replays a real Cortex match at 4× speed with live economy gauges, alert triggers, and HUD cues.
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            disabled={startingDemo}
            onClick={() => void handleDemoClick()}
            data-testid="onboarding-try-demo-btn"
            className="border-2 border-[#2ec4b6] text-[#2ec4b6] hover:bg-[#2ec4b6]/20 font-bold whitespace-nowrap"
          >
            TRY DEMO (4× SPEED)
          </Button>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="md" onClick={onBack} data-testid="onboarding-back-btn">
          ◂ BACK
        </Button>
        <Button
          variant="armada"
          size="md"
          onClick={onNext}
          data-testid="onboarding-next-btn"
        >
          NEXT STEP ▸
        </Button>
      </div>
    </div>
  );
}
