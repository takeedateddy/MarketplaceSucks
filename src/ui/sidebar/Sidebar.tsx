/**
 * Main sidebar orchestrator. Manages tab state and renders the
 * currently active tab panel within the SidebarLayout shell.
 *
 * This is the top-level entry point for the sidebar UI.
 *
 * @module ui/sidebar/Sidebar
 */

import React, { useState, useCallback, useMemo } from 'react';
import { SidebarLayout } from '@/design-system/layouts/SidebarLayout';
import { FilterPanel } from '@/ui/sidebar/FilterPanel';
import { SortPanel } from '@/ui/sidebar/SortPanel';
import { SavedSearches } from '@/ui/sidebar/SavedSearches';
import { PriceAnalytics } from '@/ui/sidebar/PriceAnalytics';
import { SellerTrustPanel } from '@/ui/sidebar/SellerTrustPanel';
import { ImageAnalysisPanel } from '@/ui/sidebar/ImageAnalysisPanel';
import { ComparisonView } from '@/ui/sidebar/ComparisonView';
import { HeatMap } from '@/ui/sidebar/HeatMap';
import { SalesForecast } from '@/ui/sidebar/SalesForecast';
import { ListingHistory } from '@/ui/sidebar/ListingHistory';
import { Settings } from '@/ui/sidebar/Settings';

/** Supported sidebar tab identifiers. */
export type SidebarTabId =
  | 'filters'
  | 'sort'
  | 'saved'
  | 'analytics'
  | 'trust'
  | 'images'
  | 'compare'
  | 'heat'
  | 'forecast'
  | 'history'
  | 'settings';

/** Tab metadata for rendering the tab bar. */
interface TabMeta {
  id: SidebarTabId;
  label: string;
  icon: string;
}

/** Ordered list of tabs shown in the tab bar. */
const TABS: TabMeta[] = [
  { id: 'filters', label: 'Filters', icon: '\u{1F50D}' },
  { id: 'sort', label: 'Sort', icon: '\u{1F503}' },
  { id: 'saved', label: 'Saved', icon: '\u{1F4BE}' },
  { id: 'analytics', label: 'Analytics', icon: '\u{1F4CA}' },
  { id: 'trust', label: 'Trust', icon: '\u{1F6E1}' },
  { id: 'images', label: 'Images', icon: '\u{1F5BC}' },
  { id: 'compare', label: 'Compare', icon: '\u{2696}' },
  { id: 'heat', label: 'Heat', icon: '\u{1F525}' },
  { id: 'forecast', label: 'Forecast', icon: '\u{1F552}' },
  { id: 'history', label: 'History', icon: '\u{1F4C5}' },
  { id: 'settings', label: 'Settings', icon: '\u2699' },
];

/** Props for the {@link Sidebar} component. */
export interface SidebarProps {
  /** Whether the sidebar is open. */
  isOpen: boolean;
  /** Callback to close the sidebar. */
  onClose: () => void;
  /** Initial active tab. Defaults to `'filters'`. */
  defaultTab?: SidebarTabId;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * Top-level sidebar component that renders a tab bar and the active
 * panel for the selected tab.
 *
 * @example
 * ```tsx
 * <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
 * ```
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  defaultTab = 'filters',
  className,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTabId>(defaultTab);

  const handleTabClick = useCallback((tabId: SidebarTabId) => {
    setActiveTab(tabId);
  }, []);

  const panelMap = useMemo<Record<SidebarTabId, React.ReactNode>>(
    () => ({
      filters: <FilterPanel />,
      sort: <SortPanel />,
      saved: <SavedSearches />,
      analytics: <PriceAnalytics />,
      trust: <SellerTrustPanel />,
      images: <ImageAnalysisPanel />,
      compare: <ComparisonView />,
      heat: <HeatMap />,
      forecast: <SalesForecast />,
      history: <ListingHistory />,
      settings: <Settings />,
    }),
    [],
  );

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0',
    borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    backgroundColor: 'var(--mps-color-surface)',
    flexShrink: 0,
    overflowX: 'auto',
    overflowY: 'hidden',
  };

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: 'var(--mps-spacing-xs) var(--mps-spacing-sm)',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 'var(--mps-font-size-xs)',
    fontFamily: 'var(--mps-font-family-primary)',
    color: isActive ? 'var(--mps-color-primary)' : 'var(--mps-color-text-secondary)',
    borderBottom: isActive
      ? 'var(--mps-border-width-medium) solid var(--mps-color-primary)'
      : 'var(--mps-border-width-medium) solid transparent',
    transition: `color var(--mps-duration-fast) var(--mps-easing-ease),
                 border-color var(--mps-duration-fast) var(--mps-easing-ease)`,
    whiteSpace: 'nowrap',
    minWidth: 0,
    flexShrink: 0,
  });

  const iconStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-base)',
    lineHeight: 1,
  };

  return (
    <SidebarLayout isOpen={isOpen} onClose={onClose} className={className}>
      <nav style={tabBarStyle} role="tablist" aria-label="Sidebar tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            style={tabButtonStyle(activeTab === tab.id)}
            onClick={() => handleTabClick(tab.id)}
          >
            <span style={iconStyle} aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        style={{ flex: 1, overflow: 'auto' }}
      >
        {panelMap[activeTab]}
      </div>
    </SidebarLayout>
  );
};
