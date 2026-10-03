import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import {
  StepWelcome,
  StepFindBar,
  StepInstallWidget,
  StepProfile,
  StepPlanOrDemo,
  StepDone
} from '../components/onboarding';
import { ipcClient } from '../lib/ipc-client';

const STEP_LABELS = [
  '01 // WELCOME',
  '02 // LOCATE BAR',
  '03 // WIDGET',
  '04 // PROFILE',
  '05 // FIRST PLAN',
  '06 // READY'
];

export function OnboardingView(): React.JSX.Element {
  const [step, setStep] = useState<number>(1);

  const completeAndGoHome = (): void => {
    try {
      localStorage.setItem('stratcom:onboarding-completed', 'true');
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
    window.location.hash = '#/home';
  };

  const handleSkip = (): void => {
    completeAndGoHome();
  };

  const handleFinish = (): void => {
    completeAndGoHome();
  };

  const handleTryDemo = async (): Promise<void> => {
    try {
      localStorage.setItem('stratcom:onboarding-completed', 'true');
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
    await ipcClient.invoke('coach:start', {
      mode: 'demo',
      demoId: '2026-10-01-cortex-1v1-vs-ai-barr',
      speed: 4
    });
    window.location.hash = '#/coach';
  };

  return (
    <div data-testid="view-onboarding" className="space-y-6 max-w-4xl mx-auto pb-12 pt-2">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#1f2430] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-['Press_Start_2P'] text-sm text-[#e4e4e7]">
              TACTICAL ONBOARDING WIZARD
            </span>
            <span className="font-mono text-xs text-[#38bdf8] font-bold">
              [STEP {step}/6]
            </span>
          </div>
          <p className="mt-1 text-xs text-[#a1a1aa] font-mono">
            Get your live Beyond All Reason tactical coach set up in 6 quick steps.
          </p>
        </div>

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            data-testid="onboarding-skip-btn"
            className="text-[#94a3b8] hover:text-white"
          >
            SKIP SETUP ✕
          </Button>
        </div>
      </div>

      {/* Stepped Progress Pills */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono text-[10px]">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isCurrent = step === stepNum;
          const isPassed = step > stepNum;
          return (
            <div
              key={label}
              className={`rounded px-2 py-1 text-center truncate border transition-none ${
                isCurrent
                  ? 'border-[#38bdf8] bg-[#0c1929] text-[#38bdf8] font-bold'
                  : isPassed
                    ? 'border-[#4ade80]/40 bg-[#0a2e16]/30 text-[#4ade80]'
                    : 'border-[#27272a] bg-[#12131a] text-[#71717a]'
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Wizard Step Body */}
      <div className="pt-2">
        {step === 1 && <StepWelcome onNext={() => setStep(2)} />}
        {step === 2 && <StepFindBar onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <StepInstallWidget onBack={() => setStep(2)} onNext={() => setStep(4)} />}
        {step === 4 && <StepProfile onBack={() => setStep(3)} onNext={() => setStep(5)} />}
        {step === 5 && (
          <StepPlanOrDemo
            onBack={() => setStep(4)}
            onNext={() => setStep(6)}
            onTryDemo={handleTryDemo}
          />
        )}
        {step === 6 && <StepDone onBack={() => setStep(5)} onFinish={handleFinish} />}
      </div>
    </div>
  );
}
