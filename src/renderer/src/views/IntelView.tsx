import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { BattlesTab } from '../components/intel/BattlesTab';
import { LeaderboardTab } from '../components/intel/LeaderboardTab';
import { ReplaysTab } from '../components/intel/ReplaysTab';
import { BalanceTab } from '../components/intel/BalanceTab';

const INTEL_TABS = [
  { id: 'battles', label: 'BATTLES' },
  { id: 'leaderboard', label: 'LEADERBOARD' },
  { id: 'replays', label: 'REPLAYS' },
  { id: 'balance', label: 'BALANCE' }
] as const;

type IntelTabId = (typeof INTEL_TABS)[number]['id'];

/** Intel: public BAR data fetched by main. Only the shown tab is mounted (and refreshes). */
export function IntelView(): React.JSX.Element {
  const [tab, setTab] = useState<IntelTabId>('battles');

  return (
    <div data-testid="view-intel" className="mx-auto max-w-6xl space-y-4 p-6">
      <PageHeader title="INTEL" />
      <Tabs tabs={[...INTEL_TABS]} activeId={tab} onChange={(id) => setTab(id as IntelTabId)} />
      {tab === 'battles' && <BattlesTab />}
      {tab === 'leaderboard' && <LeaderboardTab />}
      {tab === 'replays' && <ReplaysTab />}
      {tab === 'balance' && <BalanceTab />}
    </div>
  );
}
