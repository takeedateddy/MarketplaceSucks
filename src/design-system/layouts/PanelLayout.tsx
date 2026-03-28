/**
 * Generic panel layout with a header row (title + optional actions)
 * and a scrollable body. Used for individual sidebar tab panels.
 *
 * @module design-system/layouts/PanelLayout
 */

import React from 'react';

/** Props for the {@link PanelLayout} component. */
export interface PanelLayoutProps {
  /** Panel heading text. */
  title: string;
  /** Content rendered in the scrollable body. */
  children: React.ReactNode;
  /** Optional action buttons rendered at the trailing end of the header. */
  actions?: React.ReactNode;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A panel with a header row and scrollable content area. Designed to
 * be rendered inside the sidebar body for each tab.
 *
 * @example
 * ```tsx
 * <PanelLayout title="Filters" actions={<Button size="sm">Reset</Button>}>
 *   <FilterGroup label="Price">...</FilterGroup>
 * </PanelLayout>
 * ```
 */
export const PanelLayout: React.FC<PanelLayoutProps> = ({
  title,
  children,
  actions,
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    flexShrink: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-md)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    color: 'var(--mps-color-text-primary)',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-xs)',
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  return (
    <div className={className} style={containerStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>{title}</span>
        {actions && <div style={actionsStyle}>{actions}</div>}
      </div>
      <div style={bodyStyle}>{children}</div>
    </div>
  );
};
