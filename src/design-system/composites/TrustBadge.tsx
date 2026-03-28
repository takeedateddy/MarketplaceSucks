/**
 * Badge displaying a seller trust score with color coding and an
 * optional tooltip showing the score breakdown by factor.
 *
 * @module design-system/composites/TrustBadge
 */

import React, { useState, useCallback } from 'react';

/** Props for the {@link TrustBadge} component. */
export interface TrustBadgeProps {
  /** Overall trust score (0-100). */
  score: number;
  /** Optional per-factor breakdown for the tooltip. */
  breakdown?: Record<string, number>;
  /** Badge size preset. Defaults to `'md'`. */
  size?: 'sm' | 'md';
  /** Additional CSS class for composition. */
  className?: string;
}

/** Map a trust score to the appropriate CSS color variable suffix. */
function trustColor(score: number): string {
  if (score >= 80) return 'var(--mps-color-trust-high)';
  if (score >= 60) return 'var(--mps-color-trust-moderate)';
  if (score >= 40) return 'var(--mps-color-trust-caution)';
  return 'var(--mps-color-trust-low)';
}

/** Map a trust score to a human-readable tier label. */
function trustLabel(score: number): string {
  if (score >= 80) return 'Trusted';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Caution';
  return 'Low Trust';
}

/**
 * A compact badge that visualises a seller's trust score with color
 * coding and an expandable tooltip breakdown.
 *
 * @example
 * ```tsx
 * <TrustBadge score={82} breakdown={{ accountAge: 20, rating: 25 }} />
 * ```
 */
export const TrustBadge: React.FC<TrustBadgeProps> = ({
  score,
  breakdown,
  size = 'md',
  className,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleEnter = useCallback(() => setShowTooltip(true), []);
  const handleLeave = useCallback(() => setShowTooltip(false), []);

  const color = trustColor(score);
  const label = trustLabel(score);
  const isSm = size === 'sm';

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: isSm ? 'var(--mps-spacing-xxs)' : 'var(--mps-spacing-xs)',
    padding: isSm
      ? 'var(--mps-spacing-xxs) var(--mps-spacing-xs)'
      : 'var(--mps-spacing-xs) var(--mps-spacing-sm)',
    borderRadius: 'var(--mps-radius-full)',
    backgroundColor: color,
    color: '#fff',
    fontFamily: 'var(--mps-font-family-primary)',
    fontSize: isSm ? 'var(--mps-font-size-xs)' : 'var(--mps-font-size-sm)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    lineHeight: 1,
    position: 'relative',
    cursor: breakdown ? 'help' : 'default',
    whiteSpace: 'nowrap',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 'var(--mps-spacing-xs)',
    padding: 'var(--mps-spacing-sm)',
    backgroundColor: 'var(--mps-color-surface-elevated)',
    color: 'var(--mps-color-text-primary)',
    borderRadius: 'var(--mps-radius-md)',
    boxShadow: 'var(--mps-shadow-lg)',
    fontSize: 'var(--mps-font-size-xs)',
    fontWeight: 'var(--mps-font-weight-normal)' as never,
    whiteSpace: 'nowrap',
    zIndex: 'var(--mps-z-tooltip)' as never,
    pointerEvents: 'none',
  };

  return (
    <span
      className={className}
      style={badgeStyle}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      aria-label={`Trust score: ${score}/100 (${label})`}
    >
      <span aria-hidden="true" style={{ fontSize: isSm ? '10px' : '12px' }}>&#x1F6E1;</span>
      <span>{score}</span>

      {showTooltip && breakdown && (
        <div style={tooltipStyle} role="tooltip">
          <div style={{ fontWeight: 'var(--mps-font-weight-semibold)' as never, marginBottom: 'var(--mps-spacing-xs)' }}>
            {label} ({score}/100)
          </div>
          {Object.entries(breakdown).map(([factor, value]) => (
            <div key={factor} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--mps-spacing-md)' }}>
              <span style={{ color: 'var(--mps-color-text-secondary)' }}>{factor}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
};
