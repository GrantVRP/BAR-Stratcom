/**
 * Launcher scene sprites made by tools/build-launch-scene.ts. The ground is the Greenest
 * Fields map texture by IceXuick; the runners are the 32-bit Sprinter and Fiend (unit icons by
 * IceXuick and Floris).
 */
import { LAUNCH_RUNNER } from './constants';

const files = import.meta.glob('../../assets/launch/*.png', { eager: true, query: '?url', import: 'default' });

const byName = new Map<string, string>();
for (const [file, url] of Object.entries(files)) {
  byName.set(file.slice(file.lastIndexOf('/') + 1, -'.png'.length), String(url));
}

export type SceneFaction = 'armada' | 'cortex';

export const RUNNER_UNIT: Record<SceneFaction, string> = LAUNCH_RUNNER;

/** URL of a scene sprite by file name (without .png); throws if the asset build is missing it. */
export function sceneAsset(name: string): string {
  const url = byName.get(name);
  if (!url) throw new Error(`Launch scene asset missing: ${name}.png (run npx tsx tools/build-launch-scene.ts)`);
  return url;
}

export const SCENE_CREDIT = 'Launch scene: the Greenest Fields map by IceXuick.';

