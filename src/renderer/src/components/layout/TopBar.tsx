import React from 'react';
import { Tag } from '../ui/Tag';
import { useLive } from '../../stores/useLive';
import { usePlans } from '../../stores/usePlans';
import { useSettings } from '../../stores/useSettings';
import type { HealthStatus } from '../../../../shared/ipc';

const STATUS_LABELS: Record<HealthStatus, { text: string; variant: 'good' | 'warn' | 'danger' | 'default' }> = {
  'no-bar': { text: 'NO BAR', variant: 'danger' },
  'widget-missing': { text: 'WIDGET MISSING', variant: 'warn' },
  'widget-outdated': { text: 'WIDGET UPDATE', variant: 'warn' },
  'bar-idle': { text: 'BAR IDLE', variant: 'warn' },
  'pregame': { text: 'PREGAME', variant: 'good' },
  'live': { text: 'LIVE', variant: 'good' },
  'spectating': { text: 'SPECTATING', variant: 'default' },
  'replay': { text: 'REPLAY', variant: 'default' },
  'widgets-disabled': { text: 'WIDGETS DISABLED', variant: 'danger' },
  'widget-stalled': { text: 'WIDGET STALLED', variant: 'danger' },
  'protocol-mismatch': { text: 'PROTOCOL ERROR', variant: 'danger' }
};

export function TopBar(): React.JSX.Element {
  const health = useLive((s) => s.health);
  const activePlan = usePlans((s) => s.getActivePlan());
  const settings = useSettings((s) => s.settings);

  const statusMeta = STATUS_LABELS[health.status] ?? {
    text: health.status.toUpperCase(),
    variant: 'danger' as const
  };

  const profile = settings?.profile ? settings.profile.toUpperCase() : 'INTERMEDIATE';

  return (
    <header className="flex h-14 items-center justify-between border-b-2 border-zinc-800 bg-[#0c0e18] px-4 select-none">
      {/* Left side: telemetry chips */}
      <div className="flex items-center gap-3">
        {/* Health Chip */}
        <div
          data-testid="health-chip"
          title={health.message}
          className="flex items-center gap-2 border border-zinc-800 bg-[#0a0c14] px-2.5 py-1"
        >
          <span
            className={`h-2 w-2 ${
              statusMeta.variant === 'good'
                ? 'bg-[#4ade80]'
                : statusMeta.variant === 'warn'
                  ? 'bg-[#fbbf24]'
                  : 'bg-[#f87171]'
            }`}
          />
          <span
            style={{ fontFamily: "'Press Start 2P', monospace" }}
            className="text-[10px] uppercase tracking-wider text-zinc-200"
          >
            {statusMeta.text}
          </span>
        </div>

        {/* Active Plan Chip */}
        <div
          data-testid="active-plan-chip"
          className="flex items-center gap-2 border border-zinc-800 bg-[#0a0c14] px-2.5 py-1"
        >
          <span
            style={{ fontFamily: "'Press Start 2P', monospace" }}
            className="text-[10px] text-zinc-500 uppercase"
          >
            PLAN:
          </span>
          <span
            style={{ fontFamily: "'Press Start 2P', monospace" }}
            className="text-[10px] uppercase text-[#449bed] truncate max-w-[200px]"
          >
            {activePlan ? activePlan.title : 'NONE ACTIVE'}
          </span>
        </div>

        {/* Profile Chip */}
        <div
          data-testid="profile-chip"
          className="flex items-center gap-2 border border-zinc-800 bg-[#0a0c14] px-2.5 py-1"
        >
          <span
            style={{ fontFamily: "'Press Start 2P', monospace" }}
            className="text-[10px] text-zinc-500 uppercase"
          >
            COACH:
          </span>
          <span
            style={{ fontFamily: "'Press Start 2P', monospace" }}
            className="text-[10px] uppercase text-zinc-300"
          >
            {profile}
          </span>
        </div>
      </div>

      {/* Right side: Unofficial Tag linking to About */}
      <div className="flex items-center gap-3">
        <a href="#/about" data-testid="unofficial-tag" title="Unofficial community software (click for details)">
          <Tag variant="warn">UNOFFICIAL</Tag>
        </a>
      </div>
    </header>
  );
}
