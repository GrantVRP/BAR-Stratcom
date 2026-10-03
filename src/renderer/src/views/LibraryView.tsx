import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function LibraryView(): React.JSX.Element {
  return (
    <div data-testid="view-library">
      <ViewPlaceholder
        title="PLAN LIBRARY"
        code="LIB"
        description="Curated build plans, user openings, map-adapted strategies, and share codes."
      />
    </div>
  );
}
