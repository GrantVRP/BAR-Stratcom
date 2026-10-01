import { describe, expect, it } from 'vitest';
import {
  AppInfoSchema,
  DemoInfoSchema,
  GameLocationSchema,
  HealthStateSchema,
  InstallResultSchema,
  ipcContract,
  ipcEvents,
  isIpcChannel,
  isIpcEventChannel
} from './ipc';

describe('IPC contract schemas', () => {
  it('validates AppInfoSchema', () => {
    const valid = {
      version: '3.0.0-dev.0',
      platform: 'win32',
      dataPaths: {
        userData: 'C:\\Users\\test\\AppData\\Roaming\\bar-stratcom',
        barData: null
      }
    };
    expect(AppInfoSchema.parse(valid)).toEqual(valid);
    expect(AppInfoSchema.safeParse({ version: 123 }).success).toBe(false);
  });

  it('validates HealthStateSchema', () => {
    const valid = {
      status: 'live' as const,
      message: 'Live match running',
      lastHeartbeat: 1727740000
    };
    expect(HealthStateSchema.parse(valid)).toEqual(valid);
    expect(HealthStateSchema.safeParse({ status: 'unknown-status', message: 'm' }).success).toBe(false);
  });

  it('validates GameLocationSchema and InstallResultSchema', () => {
    const loc = {
      dataDir: 'C:\\Games\\Beyond All Reason\\data',
      source: 'registry' as const
    };
    expect(GameLocationSchema.parse(loc)).toEqual(loc);

    const install = {
      success: true,
      message: 'Widget installed successfully'
    };
    expect(InstallResultSchema.parse(install)).toEqual(install);
  });

  it('validates DemoInfoSchema', () => {
    const demo = {
      id: '2026-10-04-arm-1v1',
      title: 'Armada Rocketeer Rush Demo',
      description: 'Recorded 1v1 match vs AI',
      durationSec: 480
    };
    expect(DemoInfoSchema.parse(demo)).toEqual(demo);
  });

  it('has contract definitions for all required channels', () => {
    const requiredChannels = [
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
      'demo:list'
    ];

    for (const channel of requiredChannels) {
      expect(isIpcChannel(channel)).toBe(true);
      expect(ipcContract[channel as keyof typeof ipcContract]).toBeDefined();
    }
    expect(isIpcChannel('unregistered:channel')).toBe(false);
  });

  it('has event definitions for all required events', () => {
    const requiredEvents = ['live:health', 'live:state', 'coach:update', 'coach:cue', 'review:ready'];

    for (const event of requiredEvents) {
      expect(isIpcEventChannel(event)).toBe(true);
      expect(ipcEvents[event as keyof typeof ipcEvents]).toBeDefined();
    }
    expect(isIpcEventChannel('unregistered:event')).toBe(false);
  });
});
