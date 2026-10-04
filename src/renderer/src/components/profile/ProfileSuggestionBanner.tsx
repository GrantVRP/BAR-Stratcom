import React, { useState } from 'react';
import { useSessions, useSettings } from '../../stores';
import { Button } from '../ui/Button';

export interface ProfileSuggestionBannerProps {
  className?: string;
}

const DISMISS_STORAGE_KEY = 'stratcom:dismissed-profile-suggestion';

export function ProfileSuggestionBanner({
  className = ''
}: ProfileSuggestionBannerProps): React.JSX.Element | null {
  const latestSession = useSessions((s) => s.latestSession);
  const settings = useSettings((s) => s.settings);
  const updateSettings = useSettings((s) => s.updateSettings);

  const report = latestSession?.report;
  const suggestion = report?.profileSuggestion;
  const currentProfile = settings?.profile ?? 'intermediate';

  const marker = report && suggestion ? `${report.sessionId}:${suggestion.to}` : '';
  const [dismissedMarker, setDismissedMarker] = useState<string | null>(null);

  if (!suggestion || !report) {
    return null;
  }

  // If user already moved to suggested profile, hide banner
  if (currentProfile === suggestion.to) {
    return null;
  }

  const isStorageDismissed = (() => {
    if (typeof window === 'undefined' || !marker) return false;
    try {
      return window.localStorage.getItem(DISMISS_STORAGE_KEY) === marker;
    } catch {
      return false;
    }
  })();

  if (dismissedMarker === marker || isStorageDismissed) {
    return null;
  }

  const isUpgrade =
    (currentProfile === 'beginner' && suggestion.to === 'intermediate') ||
    (currentProfile === 'intermediate' && suggestion.to === 'advanced');

  async function handleAccept(): Promise<void> {
    if (!suggestion) return;
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, marker);
    } catch (e) {
      console.warn('Could not store dismissal flag in localStorage:', e);
    }
    setDismissedMarker(marker);
    await updateSettings({ profile: suggestion.to });
  }

  function handleDismiss(): void {
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, marker);
    } catch (e) {
      console.warn('Could not store dismissal flag in localStorage:', e);
    }
    setDismissedMarker(marker);
  }

  return (
    <div
      data-testid="profile-suggestion-banner"
      className={`rounded-lg border-2 ${
        isUpgrade ? 'border-[#38bdf8]/50 bg-[#0c1626]' : 'border-[#fbbf24]/50 bg-[#1f190e]'
      } p-4 shadow-xl font-mono ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`font-['Press_Start_2P'] text-[10px] ${
                isUpgrade ? 'text-[#38bdf8]' : 'text-[#fbbf24]'
              }`}
            >
              {isUpgrade ? 'PROFILE ADVANCEMENT' : 'PROFILE ADJUSTMENT'}
            </span>
            <span className="rounded bg-[#1e293b] px-1.5 py-0.5 text-[10px] uppercase text-[#94a3b8]">
              {currentProfile} → {suggestion.to}
            </span>
          </div>
          <p className="text-xs text-[#e4e4e7]">{suggestion.reason}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="armada"
            size="sm"
            data-testid="profile-suggestion-accept"
            onClick={() => void handleAccept()}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold border-[#22c55e]"
          >
            ACCEPT
          </Button>
          <Button
            variant="default"
            size="sm"
            data-testid="profile-suggestion-dismiss"
            onClick={handleDismiss}
            className="border border-[#3f3f46] text-[#a1a1aa] hover:text-white"
          >
            DISMISS
          </Button>
        </div>
      </div>
    </div>
  );
}
