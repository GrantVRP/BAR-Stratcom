import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function SettingsView(): React.JSX.Element {
  return (
    <div data-testid="view-settings">
      <ViewPlaceholder
        title="SYSTEM SETTINGS"
        code="SET"
        description="BAR data directory locator, widget installer/uninstaller, coach profiles, and audio."
      />
    </div>
  );
}
