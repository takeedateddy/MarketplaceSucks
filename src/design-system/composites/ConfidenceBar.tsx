/**
 * Visual confidence level indicator rendered as a segmented bar
 * with color coding by level.
 *
 * @module design-system/composites/ConfidenceBar
 */

import React from 'react';

/** Props for the {@link ConfidenceBar} component. */
export interface ConfidenceBarProps {
  /** Confidence level. */
  level: 'high' | 'medium' | 'low' | 'insufficient';
  /** Additional CSS class for composition. */
  className?: string;
}

/** Number of filled segments for each level. */
const LEVEL_SEGMENTS: Record<string, number> = {
  high: 4,
  medium: 3,
  low: 2,
  insufficient: 1,
};

/** Color for each confidence level. */
const LEVEL_COLOR: Record<string, string> = {
  high: 'var(--mps-color-status-success)',
  medium: 'var(--mps-color-status-warning)',
  low: 'var(--mps-color-status-warning)',
  insufficient: 'var(--mps-color-status-error)',
};

/** Human-readable label for each confidence level. */
const LEVEL_LABEL: Record<string, string> = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
  insufficient: 'Insufficient Data',
};

const TOTAL_SEGMENTS = 4;

/**
 * A segmented horizontal bar that visually communicates the confidence
 * level of an analysis result (e.g. price rating, trust score).
 *
 * @example
 * ```tsx
 * <ConfidenceBar level="medium" />
 * ```
 */
export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  level,
  className,
}) => {
  const filled = LEVEL_SEGMENTS[level] ?? 1;
  const color = LEVEL_COLOR[level] ?? 'var(--mps-color-text-secondary)';
  const label = LEVEL_LABEL[level] ?? level;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-xs)',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const barContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '2px',
  };

  const segmentBase: React.CSSProperties = {
    width: '12px',
    height: '4px',
    borderRadius: '1px',
    transition: `background-color var(--mps-duration-fast) var(--mps-easing-ease)`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
  };

  return (
    <div className={className} style={containerStyle} aria-label={label}>
      <div style={barContainerStyle}>
        {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => (
          <div
            key={i}
            style={{
              ...segmentBase,
              backgroundColor: i < filled ? color : 'var(--mps-color-border)',
            }}
          />
        ))}
      </div>
      <span style={labelStyle}>{label}</span>
    </div>
  );
};
