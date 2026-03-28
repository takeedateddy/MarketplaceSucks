/**
 * Floating bottom bar that slides up from the viewport bottom.
 * Used as the comparison queue bar showing selected listings.
 *
 * @module design-system/layouts/FloatingBar
 */

import React from 'react';

/** Props for the {@link FloatingBar} component. */
export interface FloatingBarProps {
  /** Content rendered inside the bar. */
  children: React.ReactNode;
  /** Whether the bar is currently visible. */
  isVisible: boolean;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A fixed-position bar pinned to the bottom of the viewport.
 * Slides in/out with a smooth animation controlled by `isVisible`.
 *
 * @example
 * ```tsx
 * <FloatingBar isVisible={comparisonQueue.length > 0}>
 *   {comparisonQueue.map(id => <Chip key={id}>{id}</Chip>)}
 *   <Button onClick={compare}>Compare</Button>
 * </FloatingBar>
 * ```
 */
export const FloatingBar: React.FC<FloatingBarProps> = ({
  children,
  isVisible,
  className,
}) => {
  const barStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 'var(--mps-z-comparison-bar)' as never,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--mps-spacing-sm)',
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-lg)',
    backgroundColor: 'var(--mps-color-surface-elevated)',
    borderTop: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    boxShadow: 'var(--mps-shadow-lg)',
    fontFamily: 'var(--mps-font-family-primary)',
    transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
    transition: `transform var(--mps-duration-normal) var(--mps-easing-ease-in-out)`,
    pointerEvents: isVisible ? 'auto' : 'none',
  };

  return (
    <div
      className={className}
      style={barStyle}
      role="toolbar"
      aria-label="Comparison queue"
      aria-hidden={!isVisible}
    >
      {children}
    </div>
  );
};
