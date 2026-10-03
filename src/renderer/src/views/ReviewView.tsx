import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function ReviewView(): React.JSX.Element {
  return (
    <div data-testid="view-review">
      <ViewPlaceholder
        title="MATCH REVIEW & BENCHMARKS"
        code="REV"
        description="Execution grades, timeline drift, stall/float analysis, and opening plan capture."
      />
    </div>
  );
}
