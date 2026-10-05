import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { IntelCache } from './cache';
import { fakeIntelEnabled, fixtureFetch } from './fake';
import { IntelService } from './service';

describe('fake intel for e2e (T10.2)', () => {
  it('is off unless the flag is set, and off outside an unpackaged Electron app', () => {
    expect(fakeIntelEnabled({})).toBe(false);
    expect(fakeIntelEnabled({ STRATCOM_FAKE_INTEL: '1' })).toBe(false); // vitest: no Electron app object
  });

  it('serves every intel call from the recorded fixtures', async () => {
    const service = new IntelService(new IntelCache({ dir: null }), fixtureFetch(path.join(__dirname, '__fixtures__')));
    expect((await service.battles()).data).toHaveLength(2);
    expect((await service.leaderboard()).data.season).toBe(3);
    expect((await service.replays({ map: 'Great Divide V1' })).data.data.length).toBeGreaterThan(0);
    expect((await service.replay('2ccec16a84002600f94d50118c7fd1b8')).data.id).toMatch(/^[0-9a-f]{32}$/);
    expect((await service.balanceChanges(1)).data.data[0]!.changes[0]!.unit.propertyId).toBe('armemp');
    expect((await fixtureFetch(__dirname)('https://example.invalid/nothing')).status).toBe(404);
  });
});
