import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { Inset } from '../ui/Inset';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Tactical Interface Crash caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/home';
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary-card"
          className="flex min-h-screen items-center justify-center bg-[#0a0c14] p-8 text-[#e4e4e7]"
        >
          <Panel title="SUBSYSTEM RUNTIME ANOMALY" variant="cortex" className="max-w-xl w-full">
            <div className="space-y-4 p-2">
              <div
                style={{ fontFamily: "'VT323', monospace", fontSize: '20px' }}
                className="text-zinc-300"
              >
                Something went wrong on this screen.
              </div>

              <Inset className="p-4">
                <div
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs text-rose-400 break-all"
                >
                  {this.state.error?.message ?? 'Unknown tactical anomaly'}
                </div>
              </Inset>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" onClick={this.handleReload}>
                  RELOAD SUBSYSTEM
                </Button>
                <Button variant="primary" size="sm" onClick={this.handleReset}>
                  RETURN TO HOME
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      );
    }

    return this.props.children;
  }
}
