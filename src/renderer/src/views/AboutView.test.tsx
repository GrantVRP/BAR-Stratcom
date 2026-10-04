// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { AboutView } from './AboutView';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AboutView (T06.16)', () => {
  it('holds the version, unofficial notice, licences and credits in one place, without a placeholder', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => root.render(<AboutView />));
    expect(container.querySelector('[data-testid="app-version-badge"]')).not.toBeNull();
    expect(container.textContent).toContain('UNOFFICIAL COMMUNITY TOOL');
    expect(container.textContent).toContain('LICENSES & OPEN SOURCE');
    expect(container.querySelector('[data-testid="about-credits"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Subsystem operational');
    act(() => root.unmount());
  });
});
