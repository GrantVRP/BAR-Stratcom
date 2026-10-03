import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function HomeView(): React.JSX.Element {
  return (
    <div data-testid="view-home">
      <ViewPlaceholder
        title="COMMAND HOME"
        code="HOM"
        description="Real-time match status, active plan orchestration, and quick start controls."
      />
    </div>
  );
}
