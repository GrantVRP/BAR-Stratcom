import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  registerAppGlobalShortcut,
  unregisterAppGlobalShortcut,
  getGlobalShortcutStatus
} from './global-shortcut';
import { defaultSettingsStore } from '../settings/store';
import { defaultCoachRunner } from '../coach/runner';
import * as coachWindowModule from '../windows/coach-window';

const { mockGlobalShortcut } = vi.hoisted(() => {
  const registeredMap = new Map<string, () => void>();
  return {
    mockGlobalShortcut: {
      registeredMap,
      register: vi.fn((acc: string, cb: () => void) => {
        registeredMap.set(acc, cb);
        return true;
      }),
      unregister: vi.fn((acc: string) => {
        registeredMap.delete(acc);
      }),
      isRegistered: vi.fn((acc: string) => registeredMap.has(acc))
    }
  };
});

vi.mock('electron', () => {
  return {
    globalShortcut: mockGlobalShortcut
  };
});

describe('global shortcut manager (A-15)', () => {
  beforeEach(() => {
    mockGlobalShortcut.registeredMap.clear();
    vi.clearAllMocks();
    defaultSettingsStore.updateSettings({ globalShortcut: 'Ctrl+Alt+S' });
  });

  it('registers configured shortcut and reports registered status', () => {
    const res = registerAppGlobalShortcut();
    expect(res.status).toBe('registered');
    expect(res.shortcut).toBe('Ctrl+Alt+S');
    expect(getGlobalShortcutStatus().status).toBe('registered');
  });

  it('reports busy when registration fails', () => {
    mockGlobalShortcut.register.mockReturnValueOnce(false);
    const res = registerAppGlobalShortcut();
    expect(res.status).toBe('busy');
  });

  it('reports disabled when shortcut is null or empty', () => {
    defaultSettingsStore.updateSettings({ globalShortcut: null });
    const res = registerAppGlobalShortcut();
    expect(res.status).toBe('disabled');
    expect(res.shortcut).toBeNull();
  });

  it('toggles coach window when shortcut triggers outside manual mode', () => {
    const toggleSpy = vi.spyOn(coachWindowModule, 'toggleCoachWindow').mockReturnValue(true);
    vi.spyOn(defaultCoachRunner, 'isRunning').mockReturnValue(false);

    registerAppGlobalShortcut();
    const cb = mockGlobalShortcut.registeredMap.get('Ctrl+Alt+S');
    expect(cb).toBeDefined();
    cb?.();

    expect(toggleSpy).toHaveBeenCalled();
  });

  it('toggles manual clock when shortcut triggers in manual mode', () => {
    vi.spyOn(defaultCoachRunner, 'isRunning').mockReturnValue(true);
    vi.spyOn(defaultCoachRunner, 'getMode').mockReturnValue('manual');
    const clock = defaultCoachRunner.getManualClock();
    const startSpy = vi.spyOn(clock, 'start');

    registerAppGlobalShortcut();
    const cb = mockGlobalShortcut.registeredMap.get('Ctrl+Alt+S');
    expect(cb).toBeDefined();
    cb?.();

    expect(startSpy).toHaveBeenCalled();
  });

  it('unregisters active shortcut on request', () => {
    registerAppGlobalShortcut();
    expect(getGlobalShortcutStatus().status).toBe('registered');

    unregisterAppGlobalShortcut();
    expect(getGlobalShortcutStatus().status).toBe('disabled');
  });
});
