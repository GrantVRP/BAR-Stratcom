import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function CoachView(): React.JSX.Element {
  return (
    <div data-testid="view-coach">
      <ViewPlaceholder
        title="LIVE COACHING CONSOLE"
        code="COA"
        description="Live match tracking, step timing evaluation, economy runway, and audio cues."
      />
    </div>
  );
}
