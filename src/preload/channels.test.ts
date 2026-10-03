import { describe, expect, it } from 'vitest';
import { assertIpcChannel, assertIpcEventChannel } from './channels';

describe('preload channel filters', () => {
  it('accepts valid IPC contract channels', () => {
    const validChannels = [
      'app:getInfo',
      'settings:get',
      'settings:set',
      'game:locate',
      'game:installWidget',
      'game:uninstallWidget',
      'coach:start',
      'coach:stop',
      'registry:getSnapshot',
      'maps:list',
      'maps:get',
      'plans:list',
      'plans:get',
      'plans:save',
      'plans:delete',
      'plans:import',
      'plans:export',
      'demo:list',
      'coach:manual',
      'coach:markDone',
      'coach:toggleWindow',
      'coach:getShortcutStatus',
      'game:browse',
      'data:openFolder',
      'data:exportAllPlans',
      'data:clearSessions'
    ];

    for (const ch of validChannels) {
      expect(() => assertIpcChannel(ch)).not.toThrow();
    }
  });

  it('rejects unknown or disallowed IPC channels', () => {
    const invalid = ['shell:spawn', 'fs:read', 'arbitrary:code', ''];
    for (const ch of invalid) {
      expect(() => assertIpcChannel(ch)).toThrow(/Unknown or disallowed IPC channel/);
    }
  });

  it('accepts valid IPC event channels', () => {
    const validEvents = ['live:health', 'live:state', 'coach:update', 'coach:cue', 'review:ready'];

    for (const ev of validEvents) {
      expect(() => assertIpcEventChannel(ev)).not.toThrow();
    }
  });

  it('rejects unknown or disallowed IPC event channels', () => {
    const invalid = ['live:secret', 'window:destroy', ''];
    for (const ev of invalid) {
      expect(() => assertIpcEventChannel(ev)).toThrow(/Unknown or disallowed IPC event channel/);
    }
  });
});
