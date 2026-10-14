import React from 'react';
import { useSettings } from '../../stores';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Slider } from '../ui/Slider';
import { testSound } from '../../audio/sounds';
import type { Profile } from '../../../../core/schemas/common';
import type { AlertId } from '../../../../core/schemas/coach';
import type { SoundId } from '../../audio/sounds';
import { DEFAULT_PROFILES, profileCanRunAlert } from '../../../../core/coach/profiles';

const PROFILES: Array<{ id: Profile; label: string; desc: string }> = [
  {
    id: 'beginner',
    label: 'BEGINNER',
    desc: 'Gentle alerts, wide timings.'
  },
  {
    id: 'intermediate',
    label: 'INTERMEDIATE',
    desc: 'Balanced alerts. Recommended.'
  },
  {
    id: 'advanced',
    label: 'ADVANCED',
    desc: 'Strict, fast alerts for competitive play.'
  }
];

const SOUND_TESTS: Array<{ id: SoundId; label: string; char: string }> = [
  { id: 'step_due', label: 'Step Due', char: 'Soft Tick' },
  { id: 'step_done', label: 'Step Done', char: 'Rising Blip' },
  { id: 'info', label: 'Info Alert', char: 'Triangle Tone' },
  { id: 'warn', label: 'Warn Alert', char: 'Square Beep' },
  { id: 'danger', label: 'Danger Alert', char: 'Triple Square' }
];

const ALERT_LABELS: Record<AlertId, string> = {
  E_STALL_SOON: 'Energy Stall Soon (horizon warning)',
  E_STALLING: 'Energy Stalling (active deficit)',
  M_STALL_SOON: 'Metal Stall Soon (horizon warning)',
  M_STALLING: 'Metal Stalling (active deficit)',
  M_FLOAT: 'Metal Float / Overflow (>95% capacity)',
  E_FLOAT: 'Energy Float / Overflow (>95% capacity)',
  IDLE_FACTORY: 'Factory Idle (no production queued)',
  IDLE_BUILDERS: 'Constructors Idle',
  IDLE_COMMANDER: 'Commander Idle',
  BEHIND_PLAN: 'Behind Build Plan Schedule',
  BENCHMARK_LOW: 'Benchmark Low (<p25 income band)',
  SCOUT_REMINDER: 'Scout Reminder (early intel)',
  ENEMY_AIR_NO_AA: 'Enemy Air Without Anti-Air Defense'
};

export function CoachSettingsSection(): React.JSX.Element {
  const { settings, updateSettings } = useSettings();

  const currentProfile = settings?.profile ?? 'intermediate';
  const soundEnabled = settings?.sound?.enabled ?? true;
  const soundVolume = settings?.sound?.volume ?? 0.8;
  const chatEcho = settings?.chatEcho ?? false;
  const hudEnabled = settings?.hud?.enabled ?? true;

  const handleProfileChange = async (profile: Profile): Promise<void> => {
    await updateSettings({ profile });
  };

  const handleSoundToggle = async (enabled: boolean): Promise<void> => {
    await updateSettings({
      sound: {
        enabled,
        volume: soundVolume
      }
    });
  };

  const handleVolumeChange = async (vol: number): Promise<void> => {
    await updateSettings({
      sound: {
        enabled: soundEnabled,
        volume: vol
      }
    });
  };

  const handleAlertToggle = async (id: AlertId, enabled: boolean): Promise<void> => {
    const prevAlerts = settings?.alerts ?? {};
    await updateSettings({
      alerts: {
        ...prevAlerts,
        [id]: { enabled }
      }
    });
  };

  return (
    <div data-testid="settings-section-coach" className="space-y-6 font-mono text-xs">
      {/* Skill Profile Selection */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
          SKILL PROFILE
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {PROFILES.map((p) => {
            const isSelected = currentProfile === p.id;
            return (
              <button
                key={p.id}
                type="button"
                data-testid={`profile-card-${p.id}`}
                onClick={() => void handleProfileChange(p.id)}
                className={`rounded border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-[#38bdf8] bg-[#38bdf8]/10 text-[#f8fafc] shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                    : 'border-[#27272a] bg-[#0a0c14] text-[#a1a1aa] hover:border-[#3f3f46]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{p.label}</span>
                  {isSelected && <span className="text-[#38bdf8]">✓</span>}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#a1a1aa]">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sound Settings */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
          <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
            PROCEDURAL AUDIO CUES
          </span>
          <Toggle
            checked={soundEnabled}
            onChange={handleSoundToggle}
            data-testid="sound-enabled-toggle"
          />
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#a1a1aa]">Master Volume</span>
            <span className="font-bold text-[#e4e4e7]">{Math.round(soundVolume * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={soundVolume}
            onChange={(val) => void handleVolumeChange(val)}
            data-testid="sound-volume-slider"
          />
        </div>

        <div className="border-t border-[#1f2430] pt-3">
          <span className="text-[10px] uppercase text-[#71717a]">Sound Test</span>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {SOUND_TESTS.map((snd) => (
              <Button
                key={snd.id}
                variant="default"
                size="sm"
                onClick={() => testSound(snd.id)}
                data-testid={`test-sound-${snd.id}`}
                className="flex flex-col items-center py-2 border border-[#27272a] hover:border-[#38bdf8]/50"
              >
                <span className="font-bold text-[11px]">{snd.label}</span>
                <span className="text-[10px] text-[#71717a] mt-0.5">{snd.char}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* In-Game HUD & Echo */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
          IN-GAME HUD & CHAT
        </span>
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-[#e4e4e7]">Widget HUD Display</span>
              <p className="text-[11px] text-[#71717a]">Show the HUD in game</p>
            </div>
            <Toggle
              checked={hudEnabled}
              onChange={(checked) => void updateSettings({ hud: { enabled: checked } })}
              data-testid="hud-enabled-toggle"
            />
          </div>

          <div className="flex items-center justify-between border-t border-[#1f2430] pt-2">
            <div>
              <span className="font-bold text-xs text-[#e4e4e7]">Chat Echo</span>
              <p className="text-[11px] text-[#71717a]">Print urgent alerts in your game chat. Only you see them.</p>
            </div>
            <Toggle
              checked={chatEcho}
              onChange={(checked) => void updateSettings({ chatEcho: checked })}
              data-testid="chat-echo-toggle"
            />
          </div>
        </div>
      </div>

      {/* Per-Alert Toggles */}
      <div className="rounded border border-[#27272a] bg-[#12131a] p-4 space-y-3">
        <span className="font-['Press_Start_2P'] text-[10px] text-zinc-300">
          ALERT DETECTORS
        </span>
        <div className="space-y-2 pt-1 divide-y divide-[#1f2430]">
          {(Object.keys(ALERT_LABELS) as AlertId[]).map((id) => {
            // the switch shows what the coach runs: the profile's default unless switched
            const profileConfig = DEFAULT_PROFILES[currentProfile];
            const canRun = profileCanRunAlert(profileConfig, id);
            const isAlertEnabled = canRun && (settings?.alerts?.[id]?.enabled ?? profileConfig.enabledAlerts.has(id));
            return (
              <div key={id} className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#d4d4d8]">
                  {ALERT_LABELS[id]}
                  {!canRun && <span className="ml-2 text-[11px] text-[#71717a]">Not in this profile</span>}
                </span>
                <Toggle
                  checked={isAlertEnabled}
                  disabled={!canRun}
                  onChange={(checked) => void handleAlertToggle(id, checked)}
                  data-testid={`alert-toggle-${id}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
