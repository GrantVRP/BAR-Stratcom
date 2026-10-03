import { describe, expect, it } from 'vitest';
import { executeIpcHandler } from './register';

describe('IPC register and executor', () => {
  it('executes valid request and returns envelope with ok: true', async () => {
    const result = await executeIpcHandler('maps:get', { fileName: 'isthmus' }, async (req) => {
      return {
        fileName: req.fileName,
        scriptName: 'Supreme Isthmus',
        name: 'Supreme Isthmus',
        author: 'Beherith',
        sizeX: 16,
        sizeZ: 16,
        wind: { min: 2, max: 18 },
        tidalStrength: 15,
        maxMetal: 2.2,
        extractorRadius: 60,
        gravity: 130,
        startPositions: [{ x: 100, z: 200 }],
        hasWater: true,
        popularity: null,
        mexYield: null
      };
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.fileName).toBe('isthmus');
    }
  });

  it('rejects invalid request with code E_BAD_REQUEST', async () => {
    const result = await executeIpcHandler(
      'maps:get',
      { wrongField: 123 }, // fileName missing
      async () => null
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('E_BAD_REQUEST');
      expect(result.message).toBeDefined();
    }
  });

  it('catches handler exception and returns code E_HANDLER_ERROR', async () => {
    const result = await executeIpcHandler('app:getInfo', undefined, async () => {
      throw new Error('Database connection failed');
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('E_HANDLER_ERROR');
      expect(result.message).toBe('Database connection failed');
    }
  });

  it('validates and executes game:locate with optional manualPath', async () => {
    const result = await executeIpcHandler('game:locate', { manualPath: 'C:\\BAR\\data' }, async (req) => {
      return {
        dataDir: req?.manualPath ?? '',
        source: 'manual'
      };
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.dataDir).toBe('C:\\BAR\\data');
      expect(result.data?.source).toBe('manual');
    }
  });

  it('rejects invalid game:locate request with unexpected types', async () => {
    const result = await executeIpcHandler('game:locate', { manualPath: 12345 }, async () => null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('E_BAD_REQUEST');
    }
  });
});
