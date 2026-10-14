import React from 'react';
import { Tag } from '../components/ui';
import { PageHeader } from '../components/ui/PageHeader';

export interface ViewPlaceholderProps {
  title: string;
  badge?: string;
  children?: React.ReactNode;
}

/** A page that is not built yet: just its title and a tag (no filler copy). */
export function ViewPlaceholder({ title, badge = 'COMING SOON', children }: ViewPlaceholderProps): React.JSX.Element {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader title={title} badge={<Tag variant="warn">{badge}</Tag>} />
      {children}
    </div>
  );
}
