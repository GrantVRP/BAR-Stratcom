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
  LibraryView,
  MapsView,
  OnboardingView,
  ReviewView,
  SettingsView,
  UnitsView
} from './views';
import { ipcClient } from './lib/ipc-client';
import { useCoach, useLive, usePlans, useSettings } from './stores';

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

  // Initialize stores and subscriptions
  useEffect(() => {
    const unsubLive = useLive.getState().subscribe();
    const unsubCoach = useCoach.getState().subscribe();
    void useSettings.getState().load();
    void usePlans.getState().loadPlans();

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
    };
  }, []);

  // Hash router listener
  useEffect(() => {
    function handleHashChange(): void {
      const hash = window.location.hash || '#/home';
      setCurrentHash(hash);
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

  // Route matching
  function renderView(): React.JSX.Element {
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
    return <HomeView />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0a0c14] text-[#e4e4e7]">
        <LeftRail currentRoute={currentHash} version={version} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-[#0a0c14]">
            {renderView()}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
