import { describe, it, expect } from 'vitest';
import type { BuildPlan } from '../../../core/schemas/plans';
import type { DemoInfo } from '../../../shared/ipc';
import {
  findMatchingDemoFixture,
  getMostRecentDemo,
  formatDemoHeader
} from './demo-pairing';

describe('demo-pairing helpers (T06.12)', () => {
  const sampleDemos: DemoInfo[] = [
    {
      id: '2026-10-01-cortex-1v1-vs-ai-barr',
      title: 'Cortex on BarR 1.1',
      description: '1v1 vs AI • 33:45',
      durationSec: 2025
    },
    {
      id: '2026-10-01-cortex-1v1-vs-ai-barr-499s',
      title: 'Cortex on BarR 1.1 #2',
      description: '1v1 vs AI • 8:19',
      durationSec: 499
    },
    {
      id: '2026-10-02-cortex-1v1-vs-ai-altair',
      title: 'Cortex on Altair Crossing V4.1',
      description: '1v1 vs AI • 37:00',
      durationSec: 2220
    },
    {
      id: '2026-10-02-armada-1v1-vs-ai-isthmus',
      title: 'Armada on Supreme Isthmus v1.7',
      description: '1v1 vs AI • 44:12',
      durationSec: 2652
    }
  ];

  it('finds matching demo fixture when plan source sessionId matches a fixture', () => {
    const planWithMatch: BuildPlan = {
      schemaVersion: 1,
      id: 'plan-barr-499s',
      title: 'Sample // Cortex vehicle on BarR 1.1 #2',
      factionId: 'cortex',
      gameVersion: 'release',
      modes: ['1v1'],
      role: 'any',
      skill: 'intermediate',
      opening: 'vehicle',
      energyStyle: 'wind',
      source: {
        kind: 'own-game',
        sessionId: '2026-10-01-cortex-1v1-vs-ai-barr-499s',
        map: 'BarR 1.1',
        capturedAt: '2026-10-01'
      },
      steps: []
    };

    const match = findMatchingDemoFixture(planWithMatch, sampleDemos);
    expect(match).not.toBeNull();
    expect(match?.id).toBe('2026-10-01-cortex-1v1-vs-ai-barr-499s');
  });

  it('returns null when plan has no matching source sessionId or no source', () => {
    const planWithoutMatch: BuildPlan = {
      schemaVersion: 1,
      id: 'plan-manual',
      title: 'Manual Plan',
      factionId: 'armada',
      gameVersion: 'release',
      modes: ['1v1'],
      role: 'any',
      skill: 'beginner',
      opening: 'bot',
      energyStyle: 'solar',
      source: {
        kind: 'manual',
        createdAt: '2026-10-02'
      },
      steps: []
    };

    expect(findMatchingDemoFixture(planWithoutMatch, sampleDemos)).toBeNull();
    expect(findMatchingDemoFixture(null, sampleDemos)).toBeNull();
  });

  it('selects the most recent player fixture as default for picker', () => {
    const mostRecent = getMostRecentDemo(sampleDemos);
    expect(mostRecent).not.toBeNull();
    // 2026-10-02 fixtures are more recent than 2026-10-01
    expect(mostRecent?.id.startsWith('2026-10-02')).toBe(true);
    expect(getMostRecentDemo([])).toBeNull();
  });

  it('formats coach header properly with DEMO 4× and map/opponent info', () => {
    expect(formatDemoHeader(null)).toBe('DEMO 4×');
    expect(formatDemoHeader('2026-10-01-cortex-1v1-vs-ai-barr-499s')).toBe(
      'DEMO 4× // BarR 1.1 (owner vs AI)'
    );
    expect(formatDemoHeader('2026-10-02-armada-1v1-vs-ai-isthmus')).toBe(
      'DEMO 4× // Supreme Isthmus (owner vs AI)'
    );
  });
});
