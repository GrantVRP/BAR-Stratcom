import { describe, expect, it } from 'vitest';
import type { Registry } from '../registry/types';
import type { UnitDefRecord } from '../schemas';
import type { BuildPlan } from '../schemas/plans';
import { planFileName, planFromFile, planToDiscordText, planToFile } from './files';

const mockUnits: Record<string, Partial<UnitDefRecord>> = {
  armsolar: { id: 'armsolar', name: 'Solar Collector', factionId: 'armada' },
  armmex: { id: 'armmex', name: 'Metal Extractor', factionId: 'armada' },
  armlab: { id: 'armlab', name: 'Bot Lab', factionId: 'armada' },
  armpw: { id: 'armpw', name: 'Paw', factionId: 'armada' },
  armck: { id: 'armck', name: 'Construction Kbot', factionId: 'armada' }
};

const mockRegistry: Registry = {
  gameVersion: '105.1.1-2550',
  get: (id: string) => mockUnits[id] as UnitDefRecord | undefined,
  resolve: () => ({ kind: 'none' }),
  byFaction: () => [],
  commanderOf: () => mockUnits['armsolar'] as UnitDefRecord,
  canBuild: () => true,
  buildersOf: () => [],
  classify: () => 'combat'
};

const samplePlan: BuildPlan = {
  schemaVersion: 1,
  id: 'armada-rocketeer-rush-01',
  title: 'Rocketeer Rush',
  description: 'Fast bot aggression into rocketeers',
  factionId: 'armada',
  gameVersion: '105.1.1-2550',
  modes: ['1v1'],
  role: 'front',
  skill: 'beginner',
  opening: 'bot',
  energyStyle: 'solar',
  source: {
    kind: 'manual',
    createdAt: '2026-09-01T00:00:00Z'
  },
  steps: [
    {
      id: 'step-1',
      actor: { kind: 'commander' },
      action: 'build',
      unitId: 'armsolar',
      count: 1,
      targetTime: 0
    },
    {
      id: 'step-2',
      actor: { kind: 'commander' },
      action: 'build',
      unitId: 'armmex',
      count: 2,
      targetTime: 22
    },
    {
      id: 'step-3',
      actor: { kind: 'commander' },
      action: 'build',
      unitId: 'armlab',
      count: 1,
      targetTime: 65
    },
    {
      id: 'step-4',
      actor: { kind: 'factory', unitId: 'armlab', index: 1 },
      action: 'build',
      unitId: 'armpw',
      count: 3,
      targetTime: 120
    },
    {
      id: 'step-5',
      actor: { kind: 'builder', unitId: 'armck', index: 2 },
      action: 'build',
      unitId: 'armsolar',
      count: 1,
      targetTime: 150
    },
    {
      id: 'step-6',
      actor: { kind: 'commander' },
      action: 'reclaim',
      count: 1,
      reclaim: { metal: 60, energy: 0, durationSec: 3 }
    },
    {
      id: 'step-7',
      actor: { kind: 'commander' },
      action: 'assist',
      count: 1,
      assistStepId: 'step-4'
    },
    {
      id: 'step-8',
      actor: { kind: 'commander' },
      action: 'note',
      count: 1,
      text: 'Scout expansion choke'
    }
  ]
};

describe('planToFile and planFileName', () => {
  it('serializes plan to formatted JSON with 2 spaces and trailing newline', () => {
    const json = planToFile(samplePlan);
    expect(json.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(samplePlan);
    expect(json).toContain('  "title": "Rocketeer Rush"');
  });

  it('generates clean slugged filenames', () => {
    expect(planFileName(samplePlan)).toBe('rocketeer-rush.stratcom.json');

    const specialTitlePlan = { ...samplePlan, title: 'T2 Eco & Air @ North!' };
    expect(planFileName(specialTitlePlan)).toBe('t2-eco-air-north.stratcom.json');

    const emptyTitlePlan = { ...samplePlan, title: '!!!' };
    expect(planFileName(emptyTitlePlan)).toBe('plan.stratcom.json');
  });
});

describe('planFromFile', () => {
  it('parses valid plan JSON correctly', () => {
    const json = JSON.stringify(samplePlan);
    const result = planFromFile(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(samplePlan);
      expect(result.plan).toEqual(samplePlan);
    }
  });

  it('fails on malformed JSON string', () => {
    const result = planFromFile('{ not valid json }');
    expect(result.ok).toBe(false);
  });

  it('fails on JSON that does not match BuildPlanSchema', () => {
    const result = planFromFile(JSON.stringify({ notAField: true }));
    expect(result.ok).toBe(false);
  });
});

describe('planToDiscordText', () => {
  it('formats plan steps and header with registry names', () => {
    const discordText = planToDiscordText(samplePlan, mockRegistry);

    expect(discordText.startsWith('**Rocketeer Rush** (armada)\n')).toBe(true);
    expect(discordText).toContain('0:00  Commander  1× Solar Collector');
    expect(discordText).toContain('0:22  Commander  2× Metal Extractor');
    expect(discordText).toContain('1:05  Commander  1× Bot Lab');
    expect(discordText).toContain('2:00  Bot Lab  3× Paw');
    expect(discordText).toContain('2:30  Construction Kbot #2  1× Solar Collector');
    expect(discordText).toContain('Commander  Reclaim');
    expect(discordText).toContain('Commander  Assist');
    expect(discordText).toContain('Commander  Note: Scout expansion choke');
    expect(discordText).toContain('BSC1.');
    expect(discordText.length).toBeLessThanOrEqual(1900);
  });

  it('falls back gracefully when registry is not provided', () => {
    const discordText = planToDiscordText(samplePlan);

    expect(discordText.startsWith('**Rocketeer Rush** (armada)\n')).toBe(true);
    expect(discordText).toContain('0:00  Commander  1× armsolar');
    expect(discordText).toContain('1:05  Commander  1× armlab');
    expect(discordText).toContain('2:00  armlab  3× armpw');
    expect(discordText).toContain('2:30  armck #2  1× armsolar');
    expect(discordText.length).toBeLessThanOrEqual(1900);
  });

  it('truncates steps with "…+n more" when total text would exceed 1900 characters', () => {
    // Construct a plan with 80 steps to easily exceed 1900 characters
    const manySteps = Array.from({ length: 80 }, (_, i) => ({
      id: `step-${i + 1}`,
      actor: { kind: 'commander' as const },
      action: 'build' as const,
      unitId: 'armsolar',
      count: 1,
      targetTime: i * 10
    }));

    const hugePlan: BuildPlan = {
      ...samplePlan,
      title: 'Very Long Grand Macro Plan With Many Steps',
      steps: manySteps
    };

    const text = planToDiscordText(hugePlan, mockRegistry);

    expect(text.length).toBeLessThanOrEqual(1900);
    expect(text).toMatch(/…\+\d+ more/);
    expect(text).toContain('BSC1.');
  });

  it('handles plans with large metadata where even step 1 cannot fit', () => {
    // Generate large notes to test truncation fallback
    const largePlan: BuildPlan = {
      ...samplePlan,
      title: 'X'.repeat(60),
      notes: 'Z'.repeat(2000),
      steps: [
        {
          id: 'step-1',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'armsolar',
          count: 1,
          targetTime: 0
        },
        {
          id: 'step-2',
          actor: { kind: 'commander' },
          action: 'build',
          unitId: 'armsolar',
          count: 1,
          targetTime: 0
        }
      ]
    };

    const text = planToDiscordText(largePlan, mockRegistry);
    expect(text.length).toBeLessThanOrEqual(1900);
  });

  it('matches snapshot for canonical plan Discord text', () => {
    const discordText = planToDiscordText(samplePlan, mockRegistry);
    expect(discordText).toMatchSnapshot();
  });
});
