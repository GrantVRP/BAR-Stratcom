import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function IntelView(): React.JSX.Element {
  return (
    <div data-testid="view-intel">
      <ViewPlaceholder
        title="INTEL"
      />
    </div>
  );
}
