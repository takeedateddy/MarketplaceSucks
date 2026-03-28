/**
 * A single row in the side-by-side comparison view. Displays a
 * dimension label and the corresponding value for each listing,
 * optionally highlighting the best value.
 *
 * @module design-system/composites/ComparisonRow
 */

import React from 'react';

/** Props for the {@link ComparisonRow} component. */
export interface ComparisonRowProps {
  /** Dimension label (e.g. "Price", "Condition"). */
  label: string;
  /** Values keyed by listing ID. */
  values: Record<string, string>;
  /** Listing ID with the best value for this dimension, or null. */
  bestId?: string | null;
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * Renders a horizontal comparison row with a label column and one
 * value column per listing. The best value is visually highlighted.
 *
 * @example
 * ```tsx
 * <ComparisonRow
 *   label="Price"
 *   values={{ a: '$50', b: '$75', c: '$120' }}
 *   bestId="a"
 * />
 * ```
 */
export const ComparisonRow: React.FC<ComparisonRowProps> = ({
  label,
  values,
  bestId,
  className,
}) => {
  const ids = Object.keys(values);

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `120px repeat(${ids.length}, 1fr)`,
    gap: 'var(--mps-spacing-xs)',
    alignItems: 'center',
    padding: 'var(--mps-spacing-xs) var(--mps-spacing-sm)',
    borderBottom: 'var(--mps-border-width-thin) solid var(--mps-color-border)',
    fontFamily: 'var(--mps-font-family-primary)',
    fontSize: 'var(--mps-font-size-sm)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--mps-color-text-secondary)',
    fontWeight: 'var(--mps-font-weight-medium)' as never,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const valueStyle = (id: string): React.CSSProperties => {
    const isBest = bestId != null && id === bestId;
    return {
      textAlign: 'center',
      color: isBest ? 'var(--mps-color-status-success)' : 'var(--mps-color-text-primary)',
      fontWeight: isBest ? ('var(--mps-font-weight-semibold)' as never) : ('var(--mps-font-weight-normal)' as never),
    };
  };

  return (
    <div className={className} style={rowStyle} role="row">
      <div style={labelStyle} role="rowheader">{label}</div>
      {ids.map((id) => (
        <div key={id} style={valueStyle(id)} role="cell">
          {values[id]}
        </div>
      ))}
    </div>
  );
};
