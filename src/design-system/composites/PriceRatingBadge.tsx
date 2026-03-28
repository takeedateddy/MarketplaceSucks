/**
 * Badge displaying a price rating tier with emoji indicator, color
 * coding, and an optional tooltip showing the reasoning.
 *
 * @module design-system/composites/PriceRatingBadge
 */

import React, { useState, useCallback } from 'react';

/** Props for the {@link PriceRatingBadge} component. */
export interface PriceRatingBadgeProps {
  /** Price rating tier label (e.g. "Steal", "Great Deal"). */
  tier: string;
  /** Emoji representing the tier. */
  emoji: string;
  /** CSS color variable suffix for the tier (e.g. "price-steal"). */
  color: string;
  /** Human-readable reasoning lines for the tooltip. */
  reasoning?: string[];
  /** Additional CSS class for composition. */
  className?: string;
}

/**
 * A compact price rating badge that shows the tier emoji and label,
 * with a hover tooltip displaying transparent reasoning.
 *
 * @example
 * ```tsx
 * <PriceRatingBadge
 *   tier="Great Deal"
 *   emoji="\u{1F7E2}"
 *   color="price-great"
 *   reasoning={['Compared against 15 similar listings...']}
 * />
 * ```
 */
export const PriceRatingBadge: React.FC<PriceRatingBadgeProps> = ({
  tier,
  emoji,
  color,
  reasoning,
  className,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleEnter = useCallback(() => setShowTooltip(true), []);
  const handleLeave = useCallback(() => setShowTooltip(false), []);

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-xxs)',
    padding: 'var(--mps-spacing-xxs) var(--mps-spacing-sm)',
    borderRadius: 'var(--mps-radius-full)',
    backgroundColor: `var(--mps-color-${color})`,
    color: '#fff',
    fontFamily: 'var(--mps-font-family-primary)',
    fontSize: 'var(--mps-font-size-xs)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    lineHeight: 1,
    position: 'relative',
    cursor: reasoning ? 'help' : 'default',
    whiteSpace: 'nowrap',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 'var(--mps-spacing-xs)',
    padding: 'var(--mps-spacing-sm) var(--mps-spacing-md)',
    backgroundColor: 'var(--mps-color-surface-elevated)',
    color: 'var(--mps-color-text-primary)',
    borderRadius: 'var(--mps-radius-md)',
    boxShadow: 'var(--mps-shadow-lg)',
    fontSize: 'var(--mps-font-size-xs)',
    fontWeight: 'var(--mps-font-weight-normal)' as never,
    whiteSpace: 'normal',
    minWidth: '200px',
    maxWidth: '300px',
    zIndex: 'var(--mps-z-tooltip)' as never,
    pointerEvents: 'none',
  };

  return (
    <span
      className={className}
      style={badgeStyle}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      aria-label={`Price rating: ${tier}`}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{tier}</span>

      {showTooltip && reasoning && reasoning.length > 0 && (
        <div style={tooltipStyle} role="tooltip">
          {reasoning.map((line, i) => (
            <div
              key={i}
              style={{
                marginBottom: i < reasoning.length - 1 ? 'var(--mps-spacing-xs)' : 0,
                lineHeight: 'var(--mps-line-height-normal)' as never,
                color: 'var(--mps-color-text-secondary)',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </span>
  );
};
