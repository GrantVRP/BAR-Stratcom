import { describe, expect, it } from 'vitest';
import { defaultSettings, SettingsSchema, SoundSettingsSchema } from './settings';

describe('settings schemas', () => {
  it('defaultSettings produces valid settings', () => {
    const defaults = defaultSettings();
    expect(SettingsSchema.parse(defaults)).toEqual(defaults);
    expect(defaults.assist.armNext).toBe(false);
    expect(defaults.assist.factoryQueue).toBe(false);
    expect(defaults.globalShortcut).toBe('Ctrl+Alt+S');
    expect(defaults.updates.checkOnLaunch).toBe(true);
    expect(defaults.launcher.showOnStart).toBe(true);
  });

  it('accepts alert overrides', () => {
    const custom = {
      ...defaultSettings(),
      alerts: {
        E_STALL_SOON: {
          enabled: true,
          threshold: 12
        }
      }
    };
    expect(SettingsSchema.parse(custom)).toEqual(custom);
  });

  it('rejects invalid alert ID in overrides', () => {
    const invalid = {
      ...defaultSettings(),
      alerts: {
        UNKNOWN_ALERT: {
          enabled: true
        }
      }
    };
    expect(SettingsSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects volume out of 0..1 bounds', () => {
    expect(SoundSettingsSchema.safeParse({ enabled: true, volume: -0.1 }).success).toBe(false);
    expect(SoundSettingsSchema.safeParse({ enabled: true, volume: 1.1 }).success).toBe(false);
    expect(SoundSettingsSchema.safeParse({ enabled: true, volume: 0.5 }).success).toBe(true);
  });

  it('rejects unknown AI provider or extra keys', () => {
    const invalidAi = {
      ...defaultSettings(),
      ai: {
        provider: 'chatgpt-v2',
        model: null,
        baseUrl: null,
        anthropicFallbacks: false
      }
    };
    expect(SettingsSchema.safeParse(invalidAi).success).toBe(false);

    const extraKey = {
      ...defaultSettings(),
      unexpected: true
    };
    expect(SettingsSchema.safeParse(extraKey).success).toBe(false);
  });
});
