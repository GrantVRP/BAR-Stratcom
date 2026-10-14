/**
 * Faction colours, one place for the whole app (06 §3): Armada blue, Cortex red, Legion teal. The
 * renderer styles with them (lib/faction-style.ts) and `npm run make:icon` colours the window icons.
 */
export const FACTION_ACCENTS: Readonly<Record<string, string>> = {
  armada: '#449bed',
  cortex: '#ff2244',
  legion: '#2ec4b6'
};

/** Anything else (unknown, null) is neutral grey, never another faction's colour. */
export const NEUTRAL_ACCENT = '#94a3b8';
