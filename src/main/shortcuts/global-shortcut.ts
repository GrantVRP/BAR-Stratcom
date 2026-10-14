import { globalShortcut } from 'electron';
import { defaultSettingsStore } from '../settings/store';
import { defaultCoachRunner } from '../coach/runner';
import { toggleCoachWindow } from '../windows/coach-window';
import { isAllowedGlobalShortcut } from './accelerator';

export type ShortcutStatus = 'registered' | 'busy' | 'disabled';

let activeShortcut: string | null = null;
let currentStatus: ShortcutStatus = 'disabled';

export function getGlobalShortcutStatus(): { shortcut: string | null; status: ShortcutStatus } {
  return {
    shortcut: activeShortcut,
    status: currentStatus
  };
}

export function unregisterAppGlobalShortcut(): void {
  if (activeShortcut) {
    try {
      globalShortcut.unregister(activeShortcut);
    } catch {
      // Ignore unregister errors on app shutdown or invalid key
    }
    activeShortcut = null;
    currentStatus = 'disabled';
  }
}

export function registerAppGlobalShortcut(): { shortcut: string | null; status: ShortcutStatus } {
  unregisterAppGlobalShortcut();

  const settings = defaultSettingsStore.getSettings();
  const shortcut = settings.globalShortcut;

  // never a single key: a stored shortcut without Ctrl/Alt/Win is not registered
  if (!shortcut || shortcut.trim() === '' || !isAllowedGlobalShortcut(shortcut.trim())) {
    activeShortcut = null;
    currentStatus = 'disabled';
    return { shortcut: null, status: 'disabled' };
  }

  activeShortcut = shortcut.trim();

  try {
    const registered = globalShortcut.register(activeShortcut, () => {
      // In manual mode: toggles start / pause on the manual clock.
      // Otherwise: toggles the coach window.
      if (defaultCoachRunner.isRunning() && defaultCoachRunner.getMode() === 'manual') {
        const clock = defaultCoachRunner.getManualClock();
        if (clock.isRunning()) {
          clock.pause();
        } else {
          clock.start();
        }
      } else {
        toggleCoachWindow();
      }
    });

    if (registered) {
      currentStatus = 'registered';
    } else {
      currentStatus = 'busy';
    }
  } catch (err) {
    console.warn(`[global-shortcut] Failed to register global shortcut "${activeShortcut}":`, err);
    currentStatus = 'busy';
  }

  return {
    shortcut: activeShortcut,
    status: currentStatus
  };
}
