import React from 'react';
import { Panel } from '../components/ui/Panel';
import { Inset } from '../components/ui/Inset';
import { Button } from '../components/ui/Button';

export interface NotFoundViewProps {
  route: string;
}

export function NotFoundView({ route }: NotFoundViewProps): React.JSX.Element {
  return (
    <div data-testid="not-found-view" className="p-8 max-w-xl mx-auto space-y-4">
      <Panel title="TACTICAL CONSOLE // ROUTE UNKNOWN" variant="cortex">
        <Inset className="p-6 space-y-4">
          <div
            style={{ fontFamily: "'Press Start 2P', monospace" }}
            className="text-xs text-[#ff2244] uppercase tracking-wider"
          >
            404 // ROUTE NOT FOUND
          </div>
          <p
            style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}
            className="text-zinc-300"
          >
            The tactical route <span className="text-white bg-zinc-900 px-1 py-0.5 border border-zinc-700">{route}</span> is not recognised.
          </p>
          <div className="pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                window.location.hash = '#/home';
              }}
              data-testid="btn-not-found-home"
            >
              RETURN TO COMMAND HOME
            </Button>
          </div>
        </Inset>
      </Panel>
    </div>
  );
}
