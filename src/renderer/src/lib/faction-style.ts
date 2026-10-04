import type { TagVariant } from '../components/ui/Tag';

/**
 * Faction colours, one place for the whole app (06 §3): Armada blue, Cortex red, Legion teal.
 * Anything else (unknown, null) is neutral grey, never another faction's colour.
 */
const ACCENTS: Record<string, string> = {
  armada: '#449bed',
  cortex: '#ff2244',
  legion: '#2ec4b6'
};

export const NEUTRAL_ACCENT = '#94a3b8';

export function factionKey(factionId: string | null | undefined): string {
  return (factionId ?? '').trim().toLowerCase();
}

export function factionAccent(factionId: string | null | undefined): string {
  return ACCENTS[factionKey(factionId)] ?? NEUTRAL_ACCENT;
}

export function factionTagVariant(factionId: string | null | undefined): TagVariant {
  const key = factionKey(factionId);
  return key === 'armada' || key === 'cortex' || key === 'legion' ? key : 'default';
}
