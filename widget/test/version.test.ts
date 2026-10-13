import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseWidgetVersion } from '../../src/main/game/installer';

const source = fs.readFileSync(path.join(process.cwd(), 'widget/gui_stratcom.lua'), 'utf-8');

describe('widget version markers (S-8)', () => {
  // regression (T11.4): T09.3–T09.6 bumped only WIDGET_VERSION, so the header stayed 3.0.3 and the
  // app's installer — which reads the header — never offered the update
  it('the header the installer reads equals the version the widget reports', () => {
    const reported = /local WIDGET_VERSION = "([^"]+)"/.exec(source)?.[1];
    expect(reported).toBeDefined();
    expect(parseWidgetVersion(source)).toBe(reported);
  });
});
