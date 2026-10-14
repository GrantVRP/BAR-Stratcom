import type { UnitDefRecord } from '../schemas';

/** A run of text, linked to a unit when it names one. */
export interface TextPart {
  text: string;
  unitId?: string;
}

// a word: letters, digits, underscore, apostrophe or hyphen (unit names like "Dragon's Claw")
const WORD = /[\p{L}\p{N}_'’-]+/gu;

export interface UnitMentionIndex {
  ids: ReadonlySet<string>;
  /** Exact current name → unit id; names shared by several units are left out (no guessing). */
  names: ReadonlyMap<string, string>;
  maxNameWords: number;
}

export function buildUnitMentionIndex(units: readonly UnitDefRecord[]): UnitMentionIndex {
  const byName = new Map<string, string[]>();
  for (const u of units) byName.set(u.name, [...(byName.get(u.name) ?? []), u.id]);
  const names = new Map<string, string>();
  let maxNameWords = 1;
  for (const [name, ids] of byName) {
    if (ids.length !== 1 || name.trim() === '') continue;
    names.set(name, ids[0]!);
    maxNameWords = Math.max(maxNameWords, name.split(' ').length);
  }
  return { ids: new Set(units.map((u) => u.id)), names, maxNameWords };
}

/**
 * Splits text into parts, linking whole words that are a unitId (`armemp`) or an exact current name
 * (`Paralyzer`, `Dragon's Claw`; case-sensitive, longest name first). No substring matches.
 */
export function linkUnitMentions(text: string, index: UnitMentionIndex): TextPart[] {
  const words = [...text.matchAll(WORD)].map((m) => ({ start: m.index, end: m.index + m[0].length, word: m[0] }));
  const parts: TextPart[] = [];
  let cursor = 0;
  const push = (part: TextPart): void => {
    const last = parts[parts.length - 1];
    if (!part.unitId && last && !last.unitId) last.text += part.text;
    else if (part.text) parts.push(part);
  };

  for (let i = 0; i < words.length; ) {
    let matched: { end: number; unitId: string; used: number } | null = null;
    for (let n = Math.min(index.maxNameWords, words.length - i); n >= 1 && !matched; n -= 1) {
      const last = words[i + n - 1]!;
      const candidate = text.slice(words[i]!.start, last.end);
      // a multi-word name must be written with single spaces between its words
      const unitId = index.names.get(candidate) ?? (n === 1 && index.ids.has(candidate) ? candidate : undefined);
      if (unitId) matched = { end: last.end, unitId, used: n };
    }
    if (!matched) {
      i += 1;
      continue;
    }
    push({ text: text.slice(cursor, words[i]!.start) });
    push({ text: text.slice(words[i]!.start, matched.end), unitId: matched.unitId });
    cursor = matched.end;
    i += matched.used;
  }
  push({ text: text.slice(cursor) });
  return parts;
}
