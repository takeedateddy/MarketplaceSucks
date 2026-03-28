import React from 'react';

/** A single tab definition. */
export interface Tab {
  /** Unique identifier for the tab. */
  id: string;
  /** Display label. */
  label: string;
}

/** Props for the {@link Tabs} component. */
export interface TabsProps {
  /** List of tabs to display. */
  tabs: Tab[];
  /** ID of the currently active tab. */
  activeTab: string;
  /** Callback when a tab is selected. */
  onTabChange: (tabId: string) => void;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A horizontal tab navigation bar with an active tab indicator.
 *
 * @example
 * ```tsx
 * <Tabs
 *   tabs={[{ id: 'details', label: 'Details' }, { id: 'history', label: 'History' }]}
 *   activeTab="details"
 *   onTabChange={setActiveTab}
 * />
 * ```
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  const listStyle: React.CSSProperties = {
    display: 'flex', gap: 'var(--mps-spacing-xs)', padding: 0, margin: 0, listStyle: 'none',
    borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    fontFamily: 'var(--mps-font-family-primary)',
  };
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    fontSize: 'var(--mps-font-size-base)', cursor: 'pointer', background: 'none',
    fontWeight: (active ? 'var(--mps-font-weight-semibold)' : 'var(--mps-font-weight-normal)') as never,
    color: active ? 'var(--mps-color-primary)' : 'var(--mps-color-text-secondary)',
    border: 'none', borderBottomStyle: 'solid', marginBottom: '-1px',
    borderBottomWidth: 'var(--mps-border-width-medium)',
    borderBottomColor: active ? 'var(--mps-color-primary)' : 'transparent',
    transition: `all var(--mps-duration-fast) var(--mps-easing-ease)`,
  });

  return (
    <div className={className} role="tablist" style={listStyle}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTab}
          style={tabStyle(tab.id === activeTab)}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
