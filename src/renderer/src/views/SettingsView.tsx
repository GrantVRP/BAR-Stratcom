import React, { useState } from 'react';
import { Tabs } from '../components/ui/Tabs';
import { PageHeader } from '../components/ui/PageHeader';
import {
  GameSettingsSection,
  CoachSettingsSection,
  AssistSettingsSection,
  AiSettingsSection,
  AppSettingsSection,
  DataSettingsSection
} from '../components/settings';

/** The About page (left menu) holds version, licences and credits; no About tab here. */
export type SettingsTabId = 'game' | 'coach' | 'assist' | 'ai' | 'app' | 'data';

interface TabItem {
  id: SettingsTabId;
  label: string;
}

const SETTINGS_TABS: TabItem[] = [
  { id: 'game', label: 'GAME' },
  { id: 'coach', label: 'COACH' },
  { id: 'assist', label: 'ASSIST' },
  { id: 'ai', label: 'AI' },
  { id: 'app', label: 'APP' },
  { id: 'data', label: 'DATA' }
];

export function SettingsView(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('game');

  return (
    <div data-testid="view-settings" className="mx-auto max-w-5xl space-y-6 p-6 pb-12">
      <PageHeader title="SETTINGS" />

      {/* Section Tabs */}
      <div className="border-b border-[#27272a]">
        <Tabs
          tabs={SETTINGS_TABS}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as SettingsTabId)}
          variant="armada"
        />
      </div>

      {/* Active Section Content */}
      <div className="pt-2">
        {activeTab === 'game' && <GameSettingsSection />}
        {activeTab === 'coach' && <CoachSettingsSection />}
        {activeTab === 'assist' && <AssistSettingsSection />}
        {activeTab === 'ai' && <AiSettingsSection />}
        {activeTab === 'app' && <AppSettingsSection />}
        {activeTab === 'data' && <DataSettingsSection />}
      </div>
    </div>
  );
}
