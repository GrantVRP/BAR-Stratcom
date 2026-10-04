import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function MapsView(): React.JSX.Element {
  return (
    <div data-testid="view-maps">
      <ViewPlaceholder
        title="MAPS"
      />
    </div>
  );
}
