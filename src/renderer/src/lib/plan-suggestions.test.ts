import { describe, expect, it } from 'vitest';
import type { BuildPlan } from '../../../core/schemas';
import { curatedLibrary, suggestPlans } from './plan-suggestions';

const base = (id: string, over: Partial<BuildPlan>): BuildPlan => ({
  schemaVersion: 1,
  id,
  title: id,
  factionId: 'armada',
  gameVersion: 'test',
  modes: ['1v1'],
  role: 'any',
  skill: 'advanced',
  opening: 'bot',
  energyStyle: 'wind',
  source: { kind: 'curated', replayId: '0'.repeat(32), player: 'P', map: 'M', playedAt: '2026-09-01', gameVersion: 'test', reviewedBy: 'R', reviewedAt: '2026-10-05' },
  steps: [],
  ...over
});
const variant = (parent: BuildPlan): BuildPlan =>
  base(`${parent.id}-beginner`, { ...parent, id: `${parent.id}-beginner`, skill: 'beginner', source: { kind: 'adapted', fromPlanId: parent.id, transforms: ['simplify(12)'], createdAt: '2026-10-05' } });

const armBot = base('arm-bot', {});
const armBotTeam = base('arm-bot-team', { modes: ['large-team'] });
const armVeh = base('arm-veh', { opening: 'vehicle' });
const corBot = base('cor-bot', { factionId: 'cortex' });
const corAir = base('cor-air', { factionId: 'cortex', opening: 'air', modes: ['large-team'] });
const sample = base('own', { skill: 'beginner', source: { kind: 'own-game', sessionId: 's', map: 'M', capturedAt: '2026-10-01' } });
const userPlan = base('mine', { skill: 'beginner', source: { kind: 'manual', createdAt: '2026-10-01' } });
const strayVariant = base('stray', { skill: 'beginner', source: { kind: 'adapted', fromPlanId: 'own', transforms: [], createdAt: '' } });
const library = [sample, userPlan, strayVariant, armBot, armBotTeam, armVeh, corBot, corAir, variant(armBot), variant(corBot), variant(armVeh)];

describe('onboarding plan suggestions (T08.9)', () => {
  it('draws only from curated plans and the variants that cite them', () => {
    expect(curatedLibrary(library).map((p) => p.id)).toEqual(['arm-bot', 'arm-bot-team', 'arm-veh', 'cor-bot', 'cor-air', 'arm-bot-beginner', 'cor-bot-beginner', 'arm-veh-beginner']);
  });

  it('beginners get the beginner variants, 1v1 first and varied by faction and opening', () => {
    expect(suggestPlans(library, 'beginner').map((p) => p.id)).toEqual(['arm-bot-beginner', 'arm-veh-beginner', 'cor-bot-beginner']);
  });

  it('advanced players get the real builds, 1v1 before team games', () => {
    expect(suggestPlans(library, 'advanced').map((p) => p.id)).toEqual(['arm-bot', 'arm-veh', 'cor-bot']);
  });

  it('intermediate (no plans at that level) gets real builds first on equal distance; fills up when variety runs out', () => {
    expect(suggestPlans(library, 'intermediate').map((p) => p.id)).toEqual(['arm-bot', 'arm-veh', 'cor-bot']);
    expect(suggestPlans([armBot, armBotTeam], 'advanced', 3).map((p) => p.id)).toEqual(['arm-bot', 'arm-bot-team']);
  });

  it('without a curated library, offers the first plans', () => {
    expect(suggestPlans([sample, userPlan], 'beginner').map((p) => p.id)).toEqual(['own', 'mine']);
  });
});
