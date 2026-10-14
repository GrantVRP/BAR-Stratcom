import React from 'react';
import {
  Home,
  BookOpen,
  Crosshair,
  BarChart2,
  Cpu,
  Radar,
  Map as MapIcon,
  Settings,
  Info,
  Palette
} from 'lucide-react';

export interface LeftRailProps {
  currentRoute: string;
  version: string;
}

interface NavItem {
  id: string;
  hash: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Every view has its page now; no "coming soon" entries.
const NAV_ITEMS: NavItem[] = [
  { id: 'home', hash: '#/home', label: 'HOME', icon: Home },
  { id: 'library', hash: '#/library', label: 'LIBRARY', icon: BookOpen },
  { id: 'coach', hash: '#/coach', label: 'COACH', icon: Crosshair },
  { id: 'review', hash: '#/review', label: 'REVIEW', icon: BarChart2 },
  { id: 'intel', hash: '#/intel', label: 'INTEL', icon: Radar },
  { id: 'units', hash: '#/units', label: 'UNITS', icon: Cpu },
  { id: 'maps', hash: '#/maps', label: 'MAPS', icon: MapIcon },
  { id: 'settings', hash: '#/settings', label: 'SETTINGS', icon: Settings }
];

export function LeftRail({ currentRoute, version }: LeftRailProps): React.JSX.Element {
  const normalizedRoute = currentRoute === '' || currentRoute === '#/' ? '#/home' : currentRoute;

  return (
    <aside className="flex w-56 flex-col justify-between border-r-2 border-zinc-800 bg-[#0c0e18] select-none">
      {/* Branding Header */}
      <div>
        <div className="border-b-2 border-zinc-800 p-4">
          <h1
            style={{ fontFamily: "'Press Start 2P', monospace" }}
            className="text-xs font-bold uppercase tracking-wider text-white"
          >
            BAR STRATCOM
          </h1>
          <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="mt-1 text-[11px] text-zinc-400">
            {version}
          </p>
        </div>

        {/* Primary Navigation */}
        <nav className="p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = normalizedRoute === item.hash || normalizedRoute.startsWith(item.hash + '/');

            return (
              <a
                key={item.id}
                href={item.hash}
                data-testid={`nav-${item.id}`}
                className={`flex items-center justify-between px-3 py-2 text-left transition-none ${
                  isActive
                    ? 'border-2 border-[#449bed] bg-[#0a1c32] text-[#449bed] font-bold shadow-[2px_2px_0px_#000]'
                    : 'border-2 border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-[#12131a] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span
                    style={{ fontFamily: "'Press Start 2P', monospace" }}
                    className="text-[10px] tracking-wider uppercase"
                  >
                    {item.label}
                  </span>
                </div>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Bottom Secondary Links */}
      <div className="border-t-2 border-zinc-800 p-2 space-y-1">
        <a
          href="#/about"
          data-testid="nav-about"
          className={`flex items-center gap-2.5 px-3 py-1.5 text-xs transition-none ${
            normalizedRoute.startsWith('#/about')
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:bg-[#12131a] hover:text-zinc-200'
          }`}
        >
          <Info className="h-3.5 w-3.5" />
          <span style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-[10px]">
            ABOUT
          </span>
        </a>
        {/* developer gallery: development builds only */}
        {import.meta.env.DEV && (
          <a
            href="#/dev/ui"
            data-testid="nav-dev-ui"
            className={`flex items-center gap-2.5 px-3 py-1.5 text-xs transition-none ${
              normalizedRoute.startsWith('#/dev/ui')
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:bg-[#12131a] hover:text-zinc-300'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span style={{ fontFamily: "'Press Start 2P', monospace" }} className="text-[10px]">
              DEV UI
            </span>
          </a>
        )}
      </div>
    </aside>
  );
}
