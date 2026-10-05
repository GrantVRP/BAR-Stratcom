import type { AssistSettings } from '../../../core/schemas/settings';

/**
 * In-game assist actions (05 §8.3) and the keys we suggest for them. The keys have no default
 * Ctrl+Shift or any-modifier binding in BAR (common/configs/keybind_defaults.json, checked 2026-10-05).
 */
export const ASSIST_BINDS = [
  { id: 'armNext', action: 'stratcom_arm_next', keys: 'Ctrl+Shift+N' },
  { id: 'factoryQueue', action: 'stratcom_load_queue', keys: 'Ctrl+Shift+J' }
] as const satisfies ReadonlyArray<{ id: keyof AssistSettings; action: string; keys: string }>;

export const bindCommand = (bind: (typeof ASSIST_BINDS)[number]): string => `/bind ${bind.keys} ${bind.action}`;

/** The coach shows ASSIST ON (like the in-game HUD) when either assist is switched on. */
export const isAssistOn = (assist: AssistSettings | null | undefined): boolean => !!assist && (assist.armNext || assist.factoryQueue);
