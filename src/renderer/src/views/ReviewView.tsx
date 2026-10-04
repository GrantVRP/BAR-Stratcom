import React from 'react';
import { ViewPlaceholder } from './ViewPlaceholder';
import { ProfileSuggestionBanner } from '../components/profile/ProfileSuggestionBanner';

export function ReviewView(): React.JSX.Element {
  return (
    <div data-testid="view-review" className="space-y-4 p-4">
      <ProfileSuggestionBanner />
      <ViewPlaceholder
        title="MATCH REVIEW & BENCHMARKS"
        code="REV"
        description="Execution grades, timeline drift, stall/float analysis, and opening plan capture."
      />
    </div>
  );
}
