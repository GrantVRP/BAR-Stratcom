import type { PlanOpening } from '../../src/core/schemas/plans';

/** The matrix the curated library should cover (T08.3): faction × opening × mode group. */
export const CURATE_FACTIONS = ['armada', 'cortex'] as const;
export const CURATE_OPENINGS = ['bot', 'vehicle', 'air'] as const;
export const CURATE_MODES = ['1v1', 'team'] as const;

export const MIN_STEPS = 12;
export const FACTORY_BEFORE_SEC = 180;

export interface SelectableCandidate {
  /** Stable key (plan id) for deterministic ordering. */
  key: string;
  player: string;
  skill: number;
  faction: string;
  opening: PlanOpening;
  modeGroup: (typeof CURATE_MODES)[number];
  steps: number;
  firstFactorySec: number | null;
  errors: number;
}

export function cellKey(c: Pick<SelectableCandidate, 'faction' | 'opening' | 'modeGroup'>): string {
  return `${c.faction}/${c.opening}/${c.modeGroup}`;
}

export const MATRIX_CELLS: string[] = CURATE_FACTIONS.flatMap((faction) =>
  CURATE_OPENINGS.flatMap((opening) => CURATE_MODES.map((modeGroup) => cellKey({ faction, opening, modeGroup })))
);

/** ≥ 12 steps, a factory before 3:00, and no validation errors. */
export function isEligible(c: SelectableCandidate): boolean {
  return c.steps >= MIN_STEPS && c.firstFactorySec !== null && c.firstFactorySec < FACTORY_BEFORE_SEC && c.errors === 0;
}

const byBest = (a: SelectableCandidate, b: SelectableCandidate): number =>
  b.skill - a.skill || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

/**
 * Picks candidates round-robin over the matrix cells, best player skill first, so every cell that has
 * data is covered before any cell gets a second pick. Each player is picked at most once; only if that
 * leaves fewer than `minimum`, a second pick per player is allowed.
 */
export function selectCandidates<T extends SelectableCandidate>(
  candidates: readonly T[],
  opts: { target: number; minimum: number }
): T[] {
  const byCell = new Map<string, T[]>();
  for (const c of candidates) {
    if (!isEligible(c) || !MATRIX_CELLS.includes(cellKey(c))) continue;
    const list = byCell.get(cellKey(c)) ?? [];
    list.push(c);
    byCell.set(cellKey(c), list);
  }
  for (const list of byCell.values()) list.sort(byBest);

  const picked: T[] = [];
  const perPlayer = new Map<string, number>();
  for (const cap of [1, 2]) {
    let progress = true;
    while (picked.length < opts.target && progress) {
      progress = false;
      for (const cell of MATRIX_CELLS) {
        if (picked.length >= opts.target) break;
        const next = byCell
          .get(cell)
          ?.find((c) => !picked.includes(c) && (perPlayer.get(c.player.toLowerCase()) ?? 0) < cap);
        if (!next) continue;
        picked.push(next);
        perPlayer.set(next.player.toLowerCase(), (perPlayer.get(next.player.toLowerCase()) ?? 0) + 1);
        progress = true;
      }
    }
    if (picked.length >= opts.minimum) break;
  }
  return picked;
}

/** Per matrix cell: eligible candidates available and how many were picked. */
export function coverage(
  candidates: readonly SelectableCandidate[],
  picked: readonly SelectableCandidate[]
): Array<{ cell: string; available: number; picked: number }> {
  return MATRIX_CELLS.map((cell) => ({
    cell,
    available: candidates.filter((c) => isEligible(c) && cellKey(c) === cell).length,
    picked: picked.filter((c) => cellKey(c) === cell).length
  }));
}
