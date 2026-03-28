/**
 * Heat / popularity indicator showing flame icons scaled to the
 * listing's heat tier, with a tooltip displaying the numeric score.
 *
 * @module design-system/composites/HeatIndicator
 */

import React, { useState, useCallback } from 'react';

/** Props for the {@link HeatIndicator} component. */
export interface HeatIndicatorProps {
  /** Heat score (0-100). */
  score: number;
  /** Number of flame icons to display (0-3). */
  flames: number;
  /** Heat tier label (e.g. "Hot", "Fire"). */
  tier: string;
  /** Additional CSS class for composition. */
  className?: string;
}

/** Map tier to the appropriate CSS color variable. */
function tierColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'fire':
      return 'var(--mps-color-heat-fire)';
    case 'hot':
      return 'var(--mps-color-heat-hot)';
    case 'warm':
      return 'var(--mps-color-heat-warm)';
    default:
      return 'var(--mps-color-text-secondary)';
  }
}

/**
 * Renders flame emoji icons proportional to a listing's heat tier,
 * with a tooltip showing the exact score on hover.
 *
 * @example
 * ```tsx
 * <HeatIndicator score={85} flames={3} tier="Fire" />
 * ```
 */
export const HeatIndicator: React.FC<HeatIndicatorProps> = ({
  score,
  flames,
  tier,
  className,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleEnter = useCallback(() => setShowTooltip(true), []);
  const handleLeave = useCallback(() => setShowTooltip(false), []);

  if (flames === 0) return null;

  const color = tierColor(tier);

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-xxs)',
    position: 'relative',
    cursor: 'help',
    fontFamily: 'var(--mps-font-family-primary)',
  };

  const flameStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-sm)',
    lineHeight: 1,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--mps-font-size-xs)',
    fontWeight: 'var(--mps-font-weight-medium)' as never,
    color,
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 'var(--mps-spacing-xs)',
    padding: 'var(--mps-spacing-xs) var(--mps-spacing-sm)',
    backgroundColor: 'var(--mps-color-surface-elevated)',
    color: 'var(--mps-color-text-primary)',
    borderRadius: 'var(--mps-radius-md)',
    boxShadow: 'var(--mps-shadow-lg)',
    fontSize: 'var(--mps-font-size-xs)',
    whiteSpace: 'nowrap',
    zIndex: 'var(--mps-z-tooltip)' as never,
    pointerEvents: 'none',
  };

  return (
    <span
      className={className}
      style={containerStyle}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      aria-label={`Heat: ${tier} (${score}/100)`}
    >
      <span style={flameStyle} aria-hidden="true">
        {Array.from({ length: flames }, () => '\u{1F525}').join('')}
      </span>
      <span style={labelStyle}>{tier}</span>

      {showTooltip && (
        <div style={tooltipStyle} role="tooltip">
          Heat score: {score}/100
        </div>
      )}
    </span>
  );
};
