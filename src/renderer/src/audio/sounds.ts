import type { SoundId } from '../../../core/schemas/coach';
export type { SoundId };
import { useSettings } from '../stores';
import { ipcClient } from '../lib/ipc-client';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function playSound(soundId: SoundId, volumeOverride?: number): void {
  const settings = useSettings.getState().settings;
  const soundSettings = settings?.sound;

  if (volumeOverride === undefined) {
    if (soundSettings && !soundSettings.enabled) return;
  }

  const masterVol = Math.max(0, Math.min(1, volumeOverride ?? soundSettings?.volume ?? 0.8));
  if (masterVol <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (soundId) {
      case 'step_due': {
        // Single soft tick (06 §5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.35 * masterVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }

      case 'step_done': {
        // Two-note rising blip (06 §5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(780, now + 0.06);
        gain.gain.setValueAtTime(0.4 * masterVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'info': {
        // Single triangle tone (06 §5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.45 * masterVol, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      case 'warn': {
        // Two short square beeps (06 §5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.25 * masterVol, now);
        gain.gain.setValueAtTime(0.001, now + 0.07);
        gain.gain.setValueAtTime(0.25 * masterVol, now + 0.11);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
        break;
      }

      case 'danger': {
        // Descending triple square beeps (06 §5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(660, now + 0.08);
        osc.frequency.setValueAtTime(440, now + 0.16);
        gain.gain.setValueAtTime(0.3 * masterVol, now);
        gain.gain.setValueAtTime(0.001, now + 0.07);
        gain.gain.setValueAtTime(0.3 * masterVol, now + 0.08);
        gain.gain.setValueAtTime(0.001, now + 0.15);
        gain.gain.setValueAtTime(0.3 * masterVol, now + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }
    }
  } catch (err) {
    console.warn(`[audio] Error playing sound "${soundId}":`, err);
  }
}

export function testSound(soundId: SoundId): void {
  // Always plays at current volume regardless of enabled toggle
  const settings = useSettings.getState().settings;
  const vol = settings?.sound?.volume ?? 0.8;
  playSound(soundId, vol);
}

export function setupAudioCueListener(): () => void {
  return ipcClient.on('coach:cue', (cue) => {
    if (cue.sound) {
      playSound(cue.sound);
    }
  });
}
