import { describe, expect, it } from 'vitest';
import * as core from '../index';
import * as schemas from './index';

describe('schemas index re-exports', () => {
  it('exports all schemas from core and schemas index', () => {
    expect(core.BuildPlanSchema).toBeDefined();
    expect(schemas.BuildPlanSchema).toBeDefined();
    expect(core.defaultSettings).toBeDefined();
    expect(schemas.defaultSettings).toBeDefined();
    expect(core.LiveSnapshotSchema).toBeDefined();
    expect(core.AlertIdSchema).toBeDefined();
  });
});
