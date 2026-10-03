import React from 'react';
import { Panel, Inset, Tag } from '../components/ui';

export interface ViewPlaceholderProps {
  title: string;
  code: string;
  description: string;
  badge?: string;
  children?: React.ReactNode;
}

export function ViewPlaceholder({
  title,
  code,
  description,
  badge = 'PORTING IN PROGRESS',
  children
}: ViewPlaceholderProps): React.JSX.Element {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2
              style={{ fontFamily: "'Press Start 2P', monospace" }}
              className="text-lg uppercase tracking-wider text-white"
            >
              {title}
            </h2>
            <Tag variant="warn">{badge}</Tag>
          </div>
          <div
            style={{ fontFamily: "'VT323', monospace", fontSize: '18px' }}
            className="mt-1 text-zinc-400"
          >
            {description}
          </div>
        </div>
        <div
          style={{ fontFamily: "'Press Start 2P', monospace" }}
          className="text-xs text-zinc-500"
        >
          [SUB-{code}]
        </div>
      </div>

      <Panel title="TACTICAL CONSOLE" variant="default">
        <Inset className="p-6">
          <div
            style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}
            className="text-zinc-300"
          >
            Subsystem operational. Full interface implementation scheduled in upcoming task.
          </div>
          {children}
        </Inset>
      </Panel>
    </div>
  );
}
