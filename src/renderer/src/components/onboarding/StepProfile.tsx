import React from 'react';
import { Button } from '../ui/Button';
import { useSettings } from '../../stores';
import type { Profile } from '../../../../core/schemas/common';

export interface StepProfileProps {
  onBack: () => void;
  onNext: () => void;
}

const PROFILES: Array<{ id: Profile; label: string; desc: string }> = [
  {
    id: 'beginner',
    label: 'BEGINNER',
    desc: 'Plain alerts, wide timings, extra patience before warning. Best for learning build orders.'
  },
  {
    id: 'intermediate',
    label: 'INTERMEDIATE',
    desc: 'Balanced tactical warnings, economy runway, and standard timings. Recommended for standard play.'
  },
  {
    id: 'advanced',
    label: 'ADVANCED',
    desc: 'Terse warnings, tight tolerances, rapid stall detection. For competitive 1v1 and high ratings.'
  }
];

export function StepProfile({ onBack, onNext }: StepProfileProps): React.JSX.Element {
  const { settings, updateSettings } = useSettings();
  const currentProfile = settings?.profile ?? 'intermediate';

  const handleSelect = async (profile: Profile): Promise<void> => {
    await updateSettings({ profile });
  };

  return (
    <div data-testid="onboarding-step-4" className="space-y-6 font-mono text-xs">
      <div className="rounded border border-[#27272a] bg-[#12131a] p-5 space-y-4">
        <div className="border-b border-[#1f2430] pb-3">
          <span className="font-['Press_Start_2P'] text-sm text-[#38bdf8]">
            CHOOSE SKILL PROFILE
          </span>
          <p className="mt-1 text-xs text-[#a1a1aa]">
            ADAPTS COACHING STRICTNESS, TIMING TOLERANCES, AND AUDIO URGENCY
          </p>
        </div>

        <p className="text-xs text-[#e4e4e7] leading-relaxed">
          Select the profile that best matches your play style. You can adjust per-alert thresholds
          or switch your profile anytime in Settings.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {PROFILES.map((p) => {
            const isSelected = currentProfile === p.id;
            return (
              <button
                key={p.id}
                type="button"
                data-testid={`profile-card-${p.id}`}
                onClick={() => void handleSelect(p.id)}
                className={`rounded border p-3.5 text-left transition-all ${
                  isSelected
                    ? 'border-[#38bdf8] bg-[#38bdf8]/10 text-[#f8fafc] shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                    : 'border-[#27272a] bg-[#0a0c14] text-[#a1a1aa] hover:border-[#3f3f46]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{p.label}</span>
                  {isSelected && <span className="text-[#38bdf8] font-bold">✓</span>}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#a1a1aa]">{p.desc}</p>
              </button>
            );
          })}
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
