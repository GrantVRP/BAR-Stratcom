import type { BuildPlan } from '../../../core/schemas/plans';
import type { DemoInfo } from '../../../shared/ipc';

/**
 * Finds a bundled demo fixture whose sessionId matches the active plan's source sessionId.
 */
export function findMatchingDemoFixture(
  plan: BuildPlan | null | undefined,
  demos: readonly DemoInfo[]
): DemoInfo | null {
  if (!plan?.source) return null;
  const source = plan.source as { sessionId?: string; kind?: string };
  if (!source.sessionId || typeof source.sessionId !== 'string') return null;

  return demos.find((d) => d.id === source.sessionId) ?? null;
}

/**
 * Returns the most recent player fixture from the demo list (default selection for picker).
 * Fixture IDs are formatted YYYY-MM-DD-..., so descending sort yields newest first.
 */
export function getMostRecentDemo(demos: readonly DemoInfo[]): DemoInfo | null {
  if (!demos || demos.length === 0) return null;
  const sorted = [...demos].sort((a, b) => b.id.localeCompare(a.id));
  return sorted[0] ?? null;
}

/**
 * Formats the coach view header label for demo mode: `DEMO 4× // <Map> (<Player> vs <Opponent>)`.
 */
export function formatDemoHeader(
  demoId: string | null | undefined,
  plan?: BuildPlan | null,
  demos?: readonly DemoInfo[]
): string {
  if (!demoId) return 'DEMO 4×';

  const demo = demos?.find((d) => d.id === demoId);

  // 1. From active plan source if matched
  if (plan?.source && 'map' in plan.source && typeof plan.source.map === 'string' && plan.source.map) {
    return `DEMO 4× // ${plan.source.map} (owner vs AI)`;
  }

  // 2. Known fixture maps
  if (demoId.includes('barr')) {
    return 'DEMO 4× // BarR 1.1 (owner vs AI)';
  }
  if (demoId.includes('altair')) {
    return 'DEMO 4× // Altair Crossing (owner vs AI)';
  }
  if (demoId.includes('isthmus')) {
    return 'DEMO 4× // Supreme Isthmus (owner vs AI)';
  }
  if (demoId.includes('onyx')) {
    return 'DEMO 4× // Onyx Cauldron (owner vs AI)';
  }

  if (demo?.title) {
    return `DEMO 4× // ${demo.title}`;
  }

  return 'DEMO 4×';
}
