import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function IntelView(): React.JSX.Element {
  return (
    <div data-testid="view-intel">
      <ViewPlaceholder
        title="TACTICAL INTEL"
        code="INT"
        description="Live multiplayer battles, season leaderboard, replay capture, and balance patch logs."
      />
    </div>
  );
}
