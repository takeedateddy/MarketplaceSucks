/**
 * Collapsible filter section with label, item count badge, and
 * smooth expand/collapse animation.
 *
 * Used inside the FilterPanel to group related filter controls
 * (e.g. "Price", "Location", "Condition").
 *
 * @module design-system/composites/FilterGroup
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

/** Props for the {@link FilterGroup} component. */
export interface FilterGroupProps {
  /** Section heading label. */
  label: string;
  /** Optional count badge (e.g. number of active filters in this group). */
  count?: number;
  /** Whether the section starts expanded. Defaults to `false`. */
  defaultExpanded?: boolean;
  /** Filter controls to render inside the collapsible body. */
  children: React.ReactNode;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A collapsible filter section with a header row containing a label,
 * optional count badge, and a chevron that rotates on expand/collapse.
 *
 * @example
 * ```tsx
 * <FilterGroup label="Price" count={2} defaultExpanded>
 *   <Slider min={0} max={1000} />
 * </FilterGroup>
 * ```
 */
export const FilterGroup: React.FC<FilterGroupProps> = ({
  label,
  count,
  defaultExpanded = false,
  children,
  className,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    defaultExpanded ? undefined : 0,
  );
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    if (expanded) {
      setContentHeight(contentRef.current.scrollHeight);
      // After the transition, switch to auto so dynamically-sized content works
      const timer = setTimeout(() => setContentHeight(undefined), 250);
      return () => clearTimeout(timer);
    } else {
      // First set an explicit height so the transition fires, then collapse
      setContentHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setContentHeight(0));
      });
    }
  }, [expanded]);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    cursor: 'pointer',
    userSelect: 'none',
    borderRadius: 'var(--mps-radius-sm)',
    transition: `background-color var(--mps-duration-fast) var(--mps-easing-ease)`,
    fontFamily: 'var(--mps-font-family-primary)',
    fontSize: 'var(--mps-font-size-sm)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    color: 'var(--mps-color-text-primary)',
  };

  const chevronStyle: React.CSSProperties = {
    display: 'inline-block',
    transition: `transform var(--mps-duration-normal) var(--mps-easing-ease-in-out)`,
    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
    marginRight: 'var(--mps-spacing-xs)',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '18px',
    height: '18px',
    padding: '0 var(--mps-spacing-xs)',
    borderRadius: 'var(--mps-radius-full)',
    backgroundColor: 'var(--mps-color-primary)',
    color: '#fff',
    fontSize: 'var(--mps-font-size-xs)',
    fontWeight: 'var(--mps-font-weight-medium)' as never,
    lineHeight: 1,
  };

  const bodyStyle: React.CSSProperties = {
    overflow: 'hidden',
    height: contentHeight !== undefined ? `${contentHeight}px` : 'auto',
    transition: `height var(--mps-duration-normal) var(--mps-easing-ease-in-out)`,
  };

  const innerStyle: React.CSSProperties = {
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
  };

  const containerStyle: React.CSSProperties = {
    borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
  };

  return (
    <div className={className} style={containerStyle}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        style={headerStyle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mps-spacing-xs)' }}>
          <span style={chevronStyle} aria-hidden="true">
            &#9654;
          </span>
          <span>{label}</span>
          {count !== undefined && count > 0 && <span style={badgeStyle}>{count}</span>}
        </div>
      </div>
      <div style={bodyStyle}>
        <div ref={contentRef} style={innerStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};
