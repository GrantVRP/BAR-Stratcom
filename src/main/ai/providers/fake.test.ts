import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PlanStore } from '../../plans/store';
import { findDataDir } from '../../registry/loader';
import { SettingsStore } from '../../settings/store';
import { runDraft } from '../handlers';
import { createFakeProvider, FAKE_AI_MODEL, fakeAiEnabled } from './fake';

describe('fake AI provider for e2e (T08.8)', () => {
  it('is off unless the flag is set, and off outside an unpackaged Electron app', () => {
    expect(fakeAiEnabled({})).toBe(false);
    // vitest runs outside Electron (no app object): treated as packaged, so still off
    expect(fakeAiEnabled({ STRATCOM_FAKE_AI: '1' })).toBe(false);
  });

  it('answers with the first example build of the context, or with text when there is none', async () => {
    const fake = createFakeProvider('ollama');
    expect(await fake.listModels(new AbortController().signal)).toEqual([{ id: FAKE_AI_MODEL, label: 'Fake provider (tests)' }]);
    const draft = { title: 'x', steps: [] };
    const user = `INTENT\n\nEXAMPLES (real builds)\nExample 1, the player's own game on Isthmus, 2026-10-02:\n${JSON.stringify(draft)}\nExample 2, b:\n{}`;
    expect(await fake.draft({ system: '', user, schema: undefined as never, model: FAKE_AI_MODEL }, new AbortController().signal)).toEqual(draft);
    expect(await fake.draft({ system: '', user: 'INTENT', schema: undefined as never, model: FAKE_AI_MODEL }, new AbortController().signal)).toBe('No example build to copy');
  });

  it('drafts a valid plan through the real pipeline from a real library build', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-fake-ai-'));
    try {
      const settings = new SettingsStore(dir);
      settings.updateSettings({ ai: { provider: 'ollama', model: null, baseUrl: null, anthropicFallbacks: false } });
      const library = new PlanStore({ userDataDir: dir, bundledDir: path.join(findDataDir(), 'builds') }).list();
      const result = await runDraft(
        { factionId: 'armada', mode: '1v1', role: 'any', opening: 'hover', skill: 'beginner' },
        new AbortController().signal,
        { settings, fake: true, library: () => library, progress: () => undefined }
      );
      expect(result.report.errors).toEqual([]);
      expect(result.plan!.source).toMatchObject({ kind: 'ai-draft', provider: 'ollama', model: FAKE_AI_MODEL, repairRounds: 0 });
      expect(result.report.sim).not.toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
