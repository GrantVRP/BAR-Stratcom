import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function MapsView(): React.JSX.Element {
  return (
    <div data-testid="view-maps">
      <ViewPlaceholder
        title="MAP TOPOGRAPHY & WIND INTEL"
        code="MAP"
        description="Measured map parameters, wind speed distributions, tidal yields, and start positions."
      />
    </div>
  );
}
