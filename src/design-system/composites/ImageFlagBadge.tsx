/**
 * Image authenticity flag badge indicating whether a listing image
 * appears real, possibly AI-generated, or likely AI-generated.
 *
 * @module design-system/composites/ImageFlagBadge
 */

import React from 'react';

/** Props for the {@link ImageFlagBadge} component. */
export interface ImageFlagBadgeProps {
  /** Image classification: 'appears-real' | 'possibly-ai' | 'likely-ai'. */
  classification: string;
  /** AI likelihood score (0-100). */
  score: number;
  /** Additional CSS class for composition. */
  className?: string;
}

/** Visual config for each classification. */
const CLASSIFICATION_CONFIG: Record<string, { label: string; icon: string; colorVar: string }> = {
  'appears-real': { label: 'Appears Real', icon: '\u2705', colorVar: 'var(--mps-color-status-success)' },
  'possibly-ai': { label: 'Possibly AI', icon: '\u26A0\uFE0F', colorVar: 'var(--mps-color-status-warning)' },
  'likely-ai': { label: 'Likely AI', icon: '\u{1F6A8}', colorVar: 'var(--mps-color-status-error)' },
};

/**
 * A small badge that flags listing images by their AI-detection
 * classification and score.
 *
 * @example
 * ```tsx
 * <ImageFlagBadge classification="possibly-ai" score={55} />
 * ```
 */
export const ImageFlagBadge: React.FC<ImageFlagBadgeProps> = ({
  classification,
  score,
  className,
}) => {
  const config = CLASSIFICATION_CONFIG[classification] ?? {
    label: classification,
    icon: '\u2753',
    colorVar: 'var(--mps-color-text-secondary)',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--mps-spacing-xxs)',
    padding: 'var(--mps-spacing-xxs) var(--mps-spacing-sm)',
    borderRadius: 'var(--mps-radius-full)',
    border: `var(--mps-border-width-thin) solid ${config.colorVar}`,
    backgroundColor: 'var(--mps-color-surface)',
    color: config.colorVar,
    fontFamily: 'var(--mps-font-family-primary)',
    fontSize: 'var(--mps-font-size-xs)',
    fontWeight: 'var(--mps-font-weight-medium)' as never,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };

  return (
    <span
      className={className}
      style={badgeStyle}
      aria-label={`Image: ${config.label} (score ${score})`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
      <span style={{ color: 'var(--mps-color-text-secondary)' }}>({score}%)</span>
    </span>
  );
};
