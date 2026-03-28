/**
 * Sidebar container layout with a fixed header, optional tab bar,
 * and a scrollable body area.
 *
 * Slides in from the right edge of the viewport and overlays the
 * Marketplace UI without displacing it.
 *
 * @module design-system/layouts/SidebarLayout
 */

import React from 'react';

/** Props for the {@link SidebarLayout} component. */
export interface SidebarLayoutProps {
  /** Whether the sidebar is currently visible. */
  isOpen: boolean;
  /** Callback to close the sidebar. */
  onClose: () => void;
  /** Content rendered inside the scrollable body. */
  children: React.ReactNode;
  /** Sidebar width in pixels. Defaults to 360. */
  width?: number;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * The root sidebar shell. Handles open/close animation, close button,
 * and scrollable content area.
 *
 * @example
 * ```tsx
 * <SidebarLayout isOpen={open} onClose={close}>
 *   <TabBar />
 *   <ActivePanel />
 * </SidebarLayout>
 * ```
 */
export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  isOpen,
  onClose,
  children,
  width = 360,
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: `${width}px`,
    zIndex: 'var(--mps-z-sidebar)' as never,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--mps-color-background)',
    borderLeft: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    boxShadow: 'var(--mps-shadow-xl)',
    fontFamily: 'var(--mps-font-family-primary)',
    transform: isOpen ? 'translateX(0)' : `translateX(${width}px)`,
    transition: `transform var(--mps-duration-normal) var(--mps-easing-ease-in-out)`,
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    backgroundColor: 'var(--mps-color-surface)',
    flexShrink: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-md)',
    fontWeight: 'var(--mps-font-weight-bold)' as never,
    color: 'var(--mps-color-text-primary)',
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 'var(--mps-spacing-xs)',
    fontSize: 'var(--mps-font-size-lg)',
    color: 'var(--mps-color-text-secondary)',
    lineHeight: 1,
    borderRadius: 'var(--mps-radius-sm)',
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  return (
    <aside
      className={className}
      style={containerStyle}
      aria-label="MarketplaceSucks sidebar"
      aria-hidden={!isOpen}
    >
      <div style={headerStyle}>
        <span style={titleStyle}>MarketplaceSucks</span>
        <button
          type="button"
          style={closeButtonStyle}
          onClick={onClose}
          aria-label="Close sidebar"
        >
          &#x2715;
        </button>
      </div>
      <div style={bodyStyle}>{children}</div>
    </aside>
  );
};
