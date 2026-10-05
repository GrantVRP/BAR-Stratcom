import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { AboutSettingsSection } from '../components/settings';
import { FACTION_ART_CREDIT, UNIT_ART_CREDIT } from '../components/icons/unit-sprites';
import { SCENE_CREDIT } from '../components/launch/scene-assets';
import { MODEL_CREDITS } from '../components/launch3d/assets3d';
import { ASSIST_BINDS } from '../lib/assist';

/** Everything "about" in one place (version, unofficial notice, licences, credits); T06.16 merged the Settings tab here. */
export function AboutView(): React.JSX.Element {
  return (
    <div data-testid="view-about" className="mx-auto max-w-5xl space-y-6 p-6">
      <PageHeader
        title="ABOUT BAR STRATCOM"
        subtitle="Unofficial. Not affiliated with the Beyond All Reason team."
        badge={
          <span className="border border-[#fbbf24] px-2 py-0.5 font-['Press_Start_2P'] text-[10px] text-[#fbbf24]">UNOFFICIAL</span>
        }
      />
      <AboutSettingsSection />
      <section data-testid="about-assist" className="space-y-2 rounded border border-[#27272a] bg-[#12131a] p-4">
        <h2 className="font-['Press_Start_2P'] text-[10px] text-zinc-400">IN-GAME ASSIST</h2>
        <p className="font-mono text-sm text-zinc-200">
          Off by default (Settings → Assist), and nothing happens until you press its key in BAR. StratCom never presses
          keys for you.
        </p>
        <ul className="list-inside list-disc space-y-1 font-mono text-sm text-zinc-300">
          <li>
            <span className="text-zinc-100">{ASSIST_BINDS[0].action}</span>: picks the next planned building for the
            selected builder; you place it. Gives no orders.
          </li>
          <li>
            <span className="text-zinc-100">{ASSIST_BINDS[1].action}</span>: queues the next planned units (up to 20) in
            the selected factory. Only in lobbies that allow unit-control widgets.
          </li>
        </ul>
      </section>
      <section data-testid="about-credits" className="space-y-2 rounded border border-[#27272a] bg-[#12131a] p-4">
        <h2 className="font-['Press_Start_2P'] text-[10px] text-zinc-400">CREDITS</h2>
        <p className="font-mono text-sm text-zinc-200">{UNIT_ART_CREDIT}</p>
        <p className="font-mono text-sm text-zinc-200">{FACTION_ART_CREDIT}</p>
        <p className="font-mono text-sm text-zinc-200">{SCENE_CREDIT}</p>
        <p className="font-mono text-sm text-zinc-200">{MODEL_CREDITS}</p>
        <p className="font-mono text-sm text-zinc-200">
          Unit data comes from your own Beyond All Reason game through the StratCom widget. Beyond All Reason is made by
          its community at beyondallreason.info.
        </p>
      </section>
    </div>
  );
}
