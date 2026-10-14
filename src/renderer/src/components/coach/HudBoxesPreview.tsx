import React from 'react';
import type { CoachHud, CoachHudAlert, CoachHudBox, CoachHudLine, CoachHudRadar } from '../../../../core/schemas/protocol';
import { UnitIcon } from '../icons/UnitIcon';
import { factionAccent } from '../../lib/faction-style';

type Tone = CoachHudLine['tone'];

const TONE_TEXT: Record<Tone, string> = {
  info: '',
  good: 'text-[#4ade80]',
  warn: 'text-[#fbbf24]',
  danger: 'text-[#f87171]'
};

const TONE_BAR: Record<Tone, string> = {
  info: 'bg-[#cbd5e1]',
  good: 'bg-[#4ade80]',
  warn: 'bg-[#fbbf24]',
  danger: 'bg-[#f87171]'
};

/** A row's tag is shown only when the builder changes from the row above (as the widget draws it). */
function tagsToShow(lines: readonly CoachHudLine[]): boolean[] {
  let previous: string | undefined;
  return lines.map((line) => {
    const show = line.tag !== undefined && line.tag !== previous;
    previous = line.tag ?? previous;
    return show;
  });
}

/** The tone colours the timing; a row without one (PLAN COMPLETE) takes it on its text. */
function textClass(line: CoachHudLine, plain: string): string {
  return line.right === undefined && line.tone !== 'info' ? TONE_TEXT[line.tone] : plain;
}

function BoxRows({ lines }: { lines: readonly CoachHudLine[] }): React.JSX.Element {
  const showTag = tagsToShow(lines);
  return (
    <div className="pt-1.5">
      {lines.map((line, i) =>
        line.big ? (
          <div key={i} data-testid="hud-row-big" className="grid grid-cols-[40px_1fr_auto] items-end py-1">
            <div className="row-span-2 self-center">{line.unitId ? <UnitIcon unitId={line.unitId} size={32} /> : null}</div>
            <div className="text-[11px] leading-4 text-[#64748b]">{showTag[i] ? line.tag : ''}</div>
            <div />
            <div className={`truncate text-[19px] leading-6 ${textClass(line, 'text-[#f4f4f5]')}`}>{line.text}</div>
            <div className={`pl-2 text-right text-[15px] leading-6 ${line.tone === 'info' ? 'text-[#a1a1aa]' : TONE_TEXT[line.tone]}`}>
              {line.right ?? ''}
            </div>
          </div>
        ) : (
          <div key={i} data-testid="hud-row" className="grid grid-cols-[40px_1fr_auto] items-baseline leading-5">
            <div className="text-[11px] text-[#64748b]">{showTag[i] ? line.tag : ''}</div>
            <div className={`truncate text-[15px] ${textClass(line, 'text-[#a1a1aa]')}`}>{line.text}</div>
            <div className={`pl-2 text-right text-[13px] ${line.tone === 'info' ? 'text-[#71717a]' : TONE_TEXT[line.tone]}`}>{line.right ?? ''}</div>
          </div>
        )
      )}
    </div>
  );
}

function Box({ box, accent }: { box: CoachHudBox; accent: string }): React.JSX.Element {
  return (
    <div data-testid={`hud-box-${box.title.toLowerCase()}`} className="bg-[#0a0c14]/85 px-3 pb-2" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="flex items-center justify-between border-b border-white/[0.08] py-1.5 text-[12px] text-[#94a3b8]">
        <span>{box.title}</span>
        <span className="flex gap-3">
          {box.meta?.map((m) => (
            <span key={m.text} className={TONE_TEXT[m.tone]}>
              {m.text}
            </span>
          ))}
        </span>
      </div>
      <BoxRows lines={box.lines} />
    </div>
  );
}

/**
 * RADAR: the game draws the scope from unit positions the app never receives, so the preview shows
 * the frame and says so; the header counts the identified enemies in sight, then the contact rows.
 */
function RadarBox({ radar, accent, inSight }: { radar: CoachHudRadar; accent: string; inSight: number | null }): React.JSX.Element {
  return (
    <div data-testid="hud-box-radar" className="bg-[#0a0c14]/85 px-3 pb-2" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="flex items-center justify-between border-b border-white/[0.08] py-1.5 text-[12px] text-[#94a3b8]">
        <span>RADAR</span>
        <span className="flex gap-3">
          <span>{radar.range} RANGE</span>
          {inSight !== null && <span className={inSight > 0 ? TONE_TEXT.danger : ''}>{inSight > 0 ? `${inSight} IN SIGHT` : 'NO CONTACT'}</span>}
        </span>
      </div>
      <div className="mt-1.5 flex h-[84px] items-center justify-center bg-black/25 text-[11px] text-[#64748b]">
        Unit positions are drawn in game
      </div>
      {radar.lines.length > 0 && <BoxRows lines={radar.lines} />}
    </div>
  );
}

function Alerts({ alerts }: { alerts: readonly CoachHudAlert[] }): React.JSX.Element {
  return (
    <div data-testid="hud-alerts" className="space-y-1 bg-[#0a0c14]/85 px-3 py-1.5">
      {alerts.map((a, i) => (
        <div key={i} className={`flex items-center gap-2 text-[15px] ${TONE_TEXT[a.tone] || 'text-[#cbd5e1]'}`}>
          <span className={`h-4 w-1 ${TONE_BAR[a.tone]}`} />
          {a.text}
        </div>
      ))}
    </div>
  );
}

/**
 * The widget's HUD from 3.0.5 shown in the app (demo preview): the same boxes, levels and columns
 *, with the app's own unit icons where the game draws its build pictures; 400 px wide
 * because the app's monospace font is wider than the game's.
 */
export function HudBoxesPreview({ hud, factionId, inSight = null }: { hud: CoachHud; factionId?: string | null; inSight?: number | null }): React.JSX.Element {
  const accent = factionAccent(factionId);
  const boxes = [hud.build, hud.factory].filter((b): b is CoachHudBox => !!b);
  return (
    <div data-testid="hud-boxes" className="flex w-full max-w-[400px] flex-col gap-2 font-mono">
      {boxes.map((box) => (
        <Box key={box.title} box={box} accent={accent} />
      ))}
      {hud.radar && <RadarBox radar={hud.radar} accent={accent} inSight={inSight} />}
      {hud.alerts && hud.alerts.length > 0 && <Alerts alerts={hud.alerts} />}
    </div>
  );
}
