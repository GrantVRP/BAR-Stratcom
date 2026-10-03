import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function UnitsView(): React.JSX.Element {
  return (
    <div data-testid="view-units">
      <ViewPlaceholder
        title="UNIT CATALOG & DOSSIER"
        code="UNI"
        description="Measured unit definitions from active game version, classifications, and tech dossiers."
      />
    </div>
  );
}
