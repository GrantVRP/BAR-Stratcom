/** Modifiers that make a system-wide shortcut safe to grab; Shift alone would still swallow typing. */
const STRONG_MODIFIERS = new Set(['ctrl', 'control', 'alt', 'option', 'altgr', 'super', 'meta', 'cmd', 'command', 'commandorcontrol', 'cmdorctrl']);
const ALL_MODIFIERS = new Set([...STRONG_MODIFIERS, 'shift']);

/**
 * The single configurable global shortcut (A-15, 08 §6) must never be a single key: it needs Ctrl,
 * Alt or the Windows/Cmd key, plus exactly one other key.
 */
export function isAllowedGlobalShortcut(accelerator: string): boolean {
  const parts = accelerator.split('+').map((p) => p.trim().toLowerCase());
  if (parts.some((p) => p === '')) return false;
  const keys = parts.filter((p) => !ALL_MODIFIERS.has(p));
  return keys.length === 1 && parts.some((p) => STRONG_MODIFIERS.has(p)) && new Set(parts).size === parts.length;
}
