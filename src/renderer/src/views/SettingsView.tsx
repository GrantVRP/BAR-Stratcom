import React, { useState } from 'react';
import { Tabs } from '../components/ui/Tabs';
import {
  GameSettingsSection,
  CoachSettingsSection,
  AssistSettingsSection,
  AiSettingsSection,
  AppSettingsSection,
  DataSettingsSection,
  AboutSettingsSection
} from '../components/settings';

export type SettingsTabId = 'game' | 'coach' | 'assist' | 'ai' | 'app' | 'data' | 'about';

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
  { id: 'data', label: 'DATA' },
  { id: 'about', label: 'ABOUT' }
];

export function SettingsView(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('game');

  return (
    <div data-testid="view-settings" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* View Header */}
      <div className="border-b-2 border-[#1f2430] pb-4">
        <div className="flex items-center gap-3">
          <span className="font-['Press_Start_2P'] text-sm text-[#e4e4e7]">
            SYSTEM SETTINGS
          </span>
          <span className="text-xs font-mono text-[#71717a]">// CONFIGURATION</span>
        </div>
        <p className="mt-1 text-xs text-[#a1a1aa] font-mono">
          Configure Beyond All Reason integration, coaching profile, HUD preferences, and audio.
        </p>
      </div>

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
        {activeTab === 'about' && <AboutSettingsSection />}
      </div>
    </div>
  );
}
