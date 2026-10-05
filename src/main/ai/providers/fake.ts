import { app } from 'electron';
import type { AiProvider, ProviderId } from '../types';

export const FAKE_AI_MODEL = 'stratcom-fake';

/** STRATCOM_FAKE_AI=1 swaps every provider for the fake one, in non-packaged builds only (T08.8 e2e). */
export function fakeAiEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.STRATCOM_FAKE_AI !== '1') return false;
  try {
    return !app.isPackaged;
  } catch {
    return false; // outside Electron: treat as packaged
  }
}

/**
 * Test stand-in for a provider: it answers with the first example build of the context, which is a
 * real captured plan, so it never invents game content (S-10). Without an example it answers with
 * text, which the pipeline reports as not JSON.
 */
export function createFakeProvider(id: ProviderId): AiProvider {
  return {
    id,
    needsKey: false,
    async listModels() {
      return [{ id: FAKE_AI_MODEL, label: 'Fake provider (tests)' }];
    },
    async draft(req) {
      const example = /^Example 1, [^\n]*:\n(.+)$/m.exec(req.user);
      return example ? (JSON.parse(example[1]!) as unknown) : 'No example build to copy';
    }
  };
}
