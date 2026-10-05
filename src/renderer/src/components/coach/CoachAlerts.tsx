import React from 'react';
import type { Alert } from '../../../../core/schemas/coach';

export interface CoachAlertsProps {
  alerts: readonly Alert[];
  className?: string;
}

export function CoachAlerts({ alerts, className = '' }: CoachAlertsProps): React.JSX.Element {
  const topAlerts = alerts.slice(0, 3);
  const hasDanger = topAlerts.some((a) => a.severity === 'danger');

  return (
    <div
      role="region"
      aria-label="Coach Alerts"
      aria-live={hasDanger ? 'assertive' : 'polite'}
      data-testid="coach-alerts"
      className={`font-mono space-y-1.5 ${className}`}
    >
      {topAlerts.length === 0 ? (
        <div className="rounded border border-[#27272a]/60 bg-[#12131a]/50 px-3 py-2 text-xs text-[#71717a] flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4ade80]/60" />
          <span>NO ALERTS</span>
        </div>
      ) : (
        topAlerts.map((alert) => {
          let toneBg = 'bg-[#38bdf8]/10 border-[#38bdf8]/40 text-[#38bdf8]';
          let icon = 'ℹ';
          if (alert.severity === 'danger') {
            toneBg = 'bg-[#f87171]/15 border-[#f87171]/50 text-[#f87171]';
            icon = '⚠';
          } else if (alert.severity === 'warn') {
            toneBg = 'bg-[#fbbf24]/15 border-[#fbbf24]/50 text-[#fbbf24]';
            icon = '⚠';
          }

          return (
            <div
              key={alert.dedupeKey}
              data-testid={`coach-alert-${alert.id}`}
              className={`flex items-center gap-2 rounded border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${toneBg}`}
            >
              <span className="text-sm">{icon}</span>
              <span className="truncate">{alert.text}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
