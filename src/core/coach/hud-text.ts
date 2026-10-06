import type { CoachStep } from '../schemas/coach';
import type { Registry } from '../registry';

export function formatTimeMinutesSeconds(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** At most `max` characters, ending in an ellipsis when cut. */
export function fitText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function truncateTo36(text: string): string {
  return fitText(text, 36);
}

const warnedMissingUnits = new Set<string>();

export function clearWarnedMissingUnits(): void {
  warnedMissingUnits.clear();
}

/** A unit's display name from the snapshot (warns once when the snapshot does not have it). */
export function unitLabel(registry: Registry, unitId: string): string {
  const unit = registry.get(unitId);
  if (unit?.name) return unit.name;
  if (!warnedMissingUnits.has(unitId)) {
    warnedMissingUnits.add(unitId);
    console.warn(`[display] Unit '${unitId}' not found in registry`);
  }
  return 'Unknown unit';
}

/** "in m:ss" until the step should start or finish, "+m:ss" once it is late. */
export function timeSuffix(step: CoachStep, clock: number): string {
  if (clock < step.plannedStart) return `in ${formatTimeMinutesSeconds(step.plannedStart - clock)}`;
  if (clock <= step.plannedFinish) return `in ${formatTimeMinutesSeconds(step.plannedFinish - clock)}`;
  return `+${formatTimeMinutesSeconds(clock - step.plannedFinish)}`;
}

/** prefix + description (shortened to fit) + right-aligned suffix, at most 36 characters. */
export function paddedLine(prefix: string, desc: string, suffix: string): string {
  const spaceAvailable = 36 - prefix.length - 1 - suffix.length;
  let fitted = desc;
  if (spaceAvailable > 0 && desc.length > spaceAvailable) {
    fitted = `${desc.slice(0, spaceAvailable - 1)}…`;
  }
  const padding = Math.max(1, 36 - prefix.length - fitted.length - suffix.length);
  return truncateTo36(`${prefix}${fitted}${' '.repeat(padding)}${suffix}`);
}
