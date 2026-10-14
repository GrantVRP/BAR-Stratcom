import type { TagVariant } from '../components/ui/Tag';
import { FACTION_ACCENTS, NEUTRAL_ACCENT } from '../../../shared/faction-colors';

export { NEUTRAL_ACCENT };

export function factionKey(factionId: string | null | undefined): string {
  return (factionId ?? '').trim().toLowerCase();
}

export function factionAccent(factionId: string | null | undefined): string {
  return FACTION_ACCENTS[factionKey(factionId)] ?? NEUTRAL_ACCENT;
}

export function factionTagVariant(factionId: string | null | undefined): TagVariant {
  const key = factionKey(factionId);
  return key === 'armada' || key === 'cortex' || key === 'legion' ? key : 'default';
}
