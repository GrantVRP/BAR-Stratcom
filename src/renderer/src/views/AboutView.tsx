import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';
import { FACTION_ART_CREDIT, UNIT_ART_CREDIT } from '../components/icons/unit-sprites';
import { SCENE_CREDIT } from '../components/launch/scene-assets';
import { MODEL_CREDITS } from '../components/launch3d/assets3d';

export function AboutView(): React.JSX.Element {
  return (
    <div data-testid="view-about" className="space-y-4">
      <ViewPlaceholder
        title="ABOUT BAR STRATCOM"
        code="ABO"
        description="Free, unofficial community companion for Beyond All Reason. Not affiliated with the Beyond All Reason team."
        badge="UNOFFICIAL TOOL"
      />
      <section data-testid="about-credits" className="pixel-box mx-4 space-y-2 bg-[#12131a] p-4">
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
