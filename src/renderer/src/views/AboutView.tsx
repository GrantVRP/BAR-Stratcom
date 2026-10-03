import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';

export function AboutView(): React.JSX.Element {
  return (
    <div data-testid="view-about">
      <ViewPlaceholder
        title="ABOUT BAR STRATCOM"
        code="ABO"
        description="Free, unofficial community companion for Beyond All Reason. Not affiliated with the Beyond All Reason team."
        badge="UNOFFICIAL TOOL"
      />
    </div>
  );
}
