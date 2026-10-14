import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Small tag next to the title (e.g. COMING SOON). */
  badge?: React.ReactNode;
  /** Page-level actions, right-aligned; at most one primary. */
  actions?: React.ReactNode;
  testId?: string;
}

/** The one title of a page (level 1 of the visual hierarchy). */
export function PageHeader({ title, subtitle, badge, actions, testId }: PageHeaderProps): React.JSX.Element {
  return (
    <header data-testid={testId} className="flex flex-wrap items-end justify-between gap-4 pb-2">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="font-['Press_Start_2P'] text-lg tracking-wide text-white">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-2 font-mono text-xs text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
