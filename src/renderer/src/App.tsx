import React, { useEffect, useState } from 'react';
import { TopBar } from './components/layout/TopBar';
import { LeftRail } from './components/layout/LeftRail';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import {
  AboutView,
  CoachView,
  DevUiGallery,
  HomeView,
  IntelView,
  LaunchWindow,
  LibraryView,
  MapsView,
  NotFoundView,
  OnboardingView,
  ReviewView,
  SettingsView,
  UnitsView
} from './views';
import { ipcClient } from './lib/ipc-client';
import { useCoach, useLive, usePlans, useSessions, useSettings, useSnapshot } from './stores';
import { setupAudioCueListener } from './audio/sounds';

const ALT_ROUTES: Record<string, string> = {
  '1': '#/home',
  '2': '#/library',
  '3': '#/coach',
  '4': '#/review',
  '5': '#/intel',
  '6': '#/units',
  '7': '#/maps',
  '8': '#/settings'
};

export function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>('3.0.0-dev.0');
  const [currentHash, setCurrentHash] = useState<string>(
    typeof window !== 'undefined' && window.location.hash ? window.location.hash : '#/home'
  );
  const settings = useSettings((s) => s.settings);

  // Initialize dismissed state: if launched with specific non-home hash, dismiss launcher
  const [launcherDismissed, setLauncherDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const h = window.location.hash;
      if (h !== '' && h !== '#/' && h !== '#/home' && h !== '#/launcher') {
        return true;
      }
    }
    return false;
  });

  // Initialize stores and subscriptions
  useEffect(() => {
    const unsubLive = useLive.getState().subscribe();
    const unsubCoach = useCoach.getState().subscribe();
    const unsubSessions = useSessions.getState().subscribe();
    const unsubAudio = setupAudioCueListener();
    void useSettings.getState().load();
    void usePlans.getState().loadPlans();
    void useSnapshot.getState().load();
    void useSessions.getState().load();

    ipcClient
      .invoke('app:getInfo')
      .then((res) => {
        if (res.ok) {
          setVersion(res.data.version);
        }
      })
      .catch((err) => {
        console.warn('Failed to retrieve app info:', err);
      });

    return () => {
      unsubLive();
      unsubCoach();
      unsubSessions();
      unsubAudio();
    };
  }, []);

  // Hash router listener
  useEffect(() => {
    function handleHashChange(): void {
      const hash = window.location.hash || '#/home';
      setCurrentHash(hash);
      if (hash.startsWith('#/launcher')) {
        setLauncherDismissed(false);
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Alt+1..8 keyboard navigation shortcuts (06 §2)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const route = ALT_ROUTES[e.key];
        if (route) {
          e.preventDefault();
          window.location.hash = route;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isOnboardingCompleted = (): boolean => {
    try {
      return (
        typeof window !== 'undefined' &&
        window.localStorage.getItem('stratcom:onboarding-completed') === 'true'
      );
    } catch {
      return false;
    }
  };

  const shouldShowLauncher =
    !currentHash.startsWith('#/dev/ui') &&
    (currentHash.startsWith('#/launcher') ||
      (!launcherDismissed &&
        (currentHash === '' ||
          currentHash === '#/' ||
          currentHash === '#/home' ||
          currentHash === '#/onboarding') &&
        settings?.launcher?.showOnStart !== false));

  function handleLauncherStart(): void {
    setLauncherDismissed(true);
    if (!isOnboardingCompleted()) {
      window.location.hash = '#/onboarding';
      setCurrentHash('#/onboarding');
      return;
    }
    if (window.location.hash === '#/launcher') {
      window.location.hash = '#/home';
    }
  }

  // Auto-route to onboarding when onboarding flag is not set
  useEffect(() => {
    if (
      !isOnboardingCompleted() &&
      (launcherDismissed || settings?.launcher?.showOnStart === false)
    ) {
      const h = window.location.hash;
      if (h === '' || h === '#/' || h === '#/home') {
        window.location.hash = '#/onboarding';
      }
    }
  }, [launcherDismissed, settings]);

  // Route matching
  function renderView(): React.JSX.Element {
    if (
      currentHash === '' ||
      currentHash === '#' ||
      currentHash === '#/' ||
      currentHash === '#/home'
    ) {
      return <HomeView />;
    }
    if (currentHash.startsWith('#/library')) return <LibraryView />;
    if (currentHash.startsWith('#/coach')) return <CoachView />;
    if (currentHash.startsWith('#/review')) return <ReviewView />;
    if (currentHash.startsWith('#/intel')) return <IntelView />;
    if (currentHash.startsWith('#/units')) return <UnitsView />;
    if (currentHash.startsWith('#/maps')) return <MapsView />;
    if (currentHash.startsWith('#/settings')) return <SettingsView />;
    if (currentHash.startsWith('#/onboarding')) return <OnboardingView />;
    if (currentHash.startsWith('#/about')) return <AboutView />;
    if (currentHash.startsWith('#/dev/ui')) return <DevUiGallery />;
    if (currentHash === '#/launcher') return <HomeView />;
    return <NotFoundView route={currentHash} />;
  }

  if (currentHash.startsWith('#/coach-window')) {
    return (
      <ErrorBoundary>
        <div className="h-screen w-screen overflow-hidden bg-[#0a0c14] text-[#e4e4e7]">
          <CoachView standalone={true} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {shouldShowLauncher ? (
        <LaunchWindow onStart={handleLauncherStart} version={version} />
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-[#0a0c14] text-[#e4e4e7]">
          <LeftRail currentRoute={currentHash} version={version} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto bg-[#0a0c14]">
              {renderView()}
            </main>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
