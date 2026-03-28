/**
 * Sales forecast indicator showing a clock icon with the estimated
 * time-to-sell and an urgency color code.
 *
 * @module design-system/composites/ForecastIndicator
 */

import React from 'react';

/** Props for the {@link ForecastIndicator} component. */
export interface ForecastIndicatorProps {
  /** Human-readable time estimate (e.g. "~2 days", "~1 week"). */
  displayEstimate: string;
  /** Urgency tier: 'act-fast' | 'moderate' | 'take-your-time'. */
  urgency: string;
  /** Additional CSS class for composition. */
  className?: string;
}

/** Map urgency to a CSS color variable. */
function urgencyColor(urgency: string): string {
  switch (urgency) {
    case 'act-fast':
      return 'var(--mps-color-status-error)';
    case 'moderate':
      return 'var(--mps-color-status-warning)';
    case 'take-your-time':
      return 'var(--mps-color-status-success)';
    default:
      return 'var(--mps-color-text-secondary)';
  }
}

/** Map urgency to a label. */
function urgencyLabel(urgency: string): string {
  switch (urgency) {
    case 'act-fast':
      return 'Act Fast';
    case 'moderate':
      return 'Moderate';
    case 'take-your-time':
      return 'Take Your Time';
    default:
      return urgency;
  }
}

/**
 * Displays a time-to-sell forecast with a clock icon and urgency
 * coloring to help buyers decide how quickly to act.
 *
 * @example
 * ```tsx
 * <ForecastIndicator displayEstimate="~2 days" urgency="act-fast" />
 * ```
 */
export const ForecastIndicator: React.FC<ForecastIndicatorProps> = ({
  displayEstimate,
  urgency,
  className,
}) => {
  const color = urgencyColor(urgency);

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-xs)',
    fontFamily: 'var(--mps-font-family-primary)',
    fontSize: 'var(--mps-font-size-sm)',
    color,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-base)',
    lineHeight: 1,
  };

  const estimateStyle: React.CSSProperties = {
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)',
    color: 'var(--mps-color-text-secondary)',
  };

  return (
    <span
      className={className}
      style={containerStyle}
      aria-label={`Forecast: ${displayEstimate} (${urgencyLabel(urgency)})`}
    >
      <span style={iconStyle} aria-hidden="true">&#x1F552;</span>
      <span style={estimateStyle}>{displayEstimate}</span>
      <span style={labelStyle}>{urgencyLabel(urgency)}</span>
    </span>
  );
};
