import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  openCoachWindow,
  closeCoachWindow,
  toggleCoachWindow,
  isCoachWindowOpen,
  getCoachWindow,
  setCoachWindowClickThrough
} from './coach-window';

const { mockWin } = vi.hoisted(() => ({
  mockWin: {
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    close: vi.fn(),
    getBounds: vi.fn(() => ({ x: 100, y: 100, width: 420, height: 720 })),
    setAlwaysOnTop: vi.fn(),
    setIgnoreMouseEvents: vi.fn(),
    webContents: {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn()
    },
    on: vi.fn(),
    once: vi.fn((event, cb) => {
      if (event === 'ready-to-show') cb();
    }),
    loadURL: vi.fn(),
    loadFile: vi.fn()
  }
}));

vi.mock('electron', () => {
  return {
    BrowserWindow: vi.fn(function () {
      return mockWin;
    })
  };
});

describe('coach window manager', () => {
  beforeEach(() => {
    closeCoachWindow();
    vi.clearAllMocks();
  });

  it('opens coach window in second-monitor mode with frame and proper size', () => {
    const win = openCoachWindow('second-monitor');
    expect(win).toBe(mockWin);
    expect(isCoachWindowOpen()).toBe(true);
    expect(getCoachWindow()).toBe(mockWin);
  });

  it('opens coach window in overlay mode with frameless, transparent, and screen-saver alwaysOnTop', () => {
    openCoachWindow('overlay');
    expect(mockWin.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
  });

  it('supports click-through setting in overlay mode', () => {
    openCoachWindow('overlay');
    setCoachWindowClickThrough(true);
    expect(mockWin.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
  });

  it('toggles coach window open and closed', () => {
    expect(isCoachWindowOpen()).toBe(false);
    const opened = toggleCoachWindow('second-monitor');
    expect(opened).toBe(true);
    expect(isCoachWindowOpen()).toBe(true);

    const closed = toggleCoachWindow('second-monitor');
    expect(closed).toBe(false);
    expect(isCoachWindowOpen()).toBe(false);
  });
});
