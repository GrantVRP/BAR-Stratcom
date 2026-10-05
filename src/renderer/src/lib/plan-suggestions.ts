import type { BuildPlan, PlanSkill } from '../../../core/schemas';

const SKILLS: PlanSkill[] = ['beginner', 'intermediate', 'advanced'];

/** Curated plans and the beginner variants that cite them (T08.9). */
export function curatedLibrary(plans: readonly BuildPlan[]): BuildPlan[] {
  const curated = new Set(plans.filter((p) => p.source.kind === 'curated').map((p) => p.id));
  return plans.filter((p) => curated.has(p.id) || (p.source.kind === 'adapted' && curated.has(p.source.fromPlanId)));
}

/**
 * Onboarding suggestions (06 §4.11): from the curated library, closest skill to the profile first, then
 * 1v1 plans (the first game is usually against the AI), then real builds before variants; one per
 * faction and opening while there is choice. Without a curated library, the first plans as they come.
 */
export function suggestPlans(plans: readonly BuildPlan[], profile: PlanSkill, count = 3): BuildPlan[] {
  const pool = curatedLibrary(plans);
  if (pool.length === 0) return plans.slice(0, count);
  const distance = (p: BuildPlan): number => Math.abs(SKILLS.indexOf(p.skill) - SKILLS.indexOf(profile));
  const ranked = [...pool].sort(
    (a, b) =>
      distance(a) - distance(b) ||
      Number(!a.modes.includes('1v1')) - Number(!b.modes.includes('1v1')) ||
      Number(a.source.kind !== 'curated') - Number(b.source.kind !== 'curated') ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  const picked: BuildPlan[] = [];
  const kinds = new Set<string>();
  for (const p of ranked) {
    const kind = `${p.factionId}:${p.opening}`;
    if (picked.length < count && !kinds.has(kind)) {
      picked.push(p);
      kinds.add(kind);
    }
  }
  for (const p of ranked) if (picked.length < count && !picked.includes(p)) picked.push(p);
  return picked;
}
