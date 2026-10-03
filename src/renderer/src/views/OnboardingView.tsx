import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function OnboardingView(): React.JSX.Element {
  return (
    <div data-testid="view-onboarding">
      <ViewPlaceholder
        title="TACTICAL ONBOARDING WIZARD"
        code="WIZ"
        description="Initial setup: locate BAR data directory, install companion widget, and select player profile."
      />
    </div>
  );
}
