import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export type TabsVariant = 'default' | 'armada' | 'cortex';

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: TabsVariant;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  variant = 'default',
  className = ''
}) => {
  const activeClass =
    variant === 'armada' ? 'active-armada' : variant === 'cortex' ? 'active-cortex' : 'active-default';

  return (
    <div role="tablist" className={`flex items-end gap-1 border-b-2 border-[#222536] ${className}`.trim()}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`pixel-tab text-[10px] ${isActive ? activeClass : ''}`.trim()}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="ml-1.5 opacity-75 font-mono text-[11px]">({tab.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
