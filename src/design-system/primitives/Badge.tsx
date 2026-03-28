import React from 'react';

/** All supported badge variants. */
export type BadgeVariant =
  | 'trust-high' | 'trust-moderate' | 'trust-caution' | 'trust-low'
  | 'price-steal' | 'price-great' | 'price-good' | 'price-fair'
  | 'price-above' | 'price-high' | 'price-over'
  | 'heat-warm' | 'heat-hot' | 'heat-fire'
  | 'image-original' | 'image-suspect' | 'image-flagged'
  | 'info' | 'success' | 'warning' | 'error';

/** Props for the {@link Badge} component. */
export interface BadgeProps {
  /** Visual variant controlling color. */
  variant: BadgeVariant;
  /** Size preset. */
  size?: 'sm' | 'md' | 'lg';
  /** Badge content. */
  children: React.ReactNode;
  /** Tooltip text shown on hover. */
  tooltip?: string;
  /** Additional CSS class for composition. */
  className?: string;
}

const variantColorMap: Record<BadgeVariant, string> = {
  'trust-high': 'var(--mps-color-trust-high)',
  'trust-moderate': 'var(--mps-color-trust-moderate)',
  'trust-caution': 'var(--mps-color-trust-caution)',
  'trust-low': 'var(--mps-color-trust-low)',
  'price-steal': 'var(--mps-color-price-steal)',
  'price-great': 'var(--mps-color-price-great)',
  'price-good': 'var(--mps-color-price-good)',
  'price-fair': 'var(--mps-color-price-fair)',
  'price-above': 'var(--mps-color-price-above)',
  'price-high': 'var(--mps-color-price-high)',
  'price-over': 'var(--mps-color-price-over)',
  'heat-warm': 'var(--mps-color-heat-warm)',
  'heat-hot': 'var(--mps-color-heat-hot)',
  'heat-fire': 'var(--mps-color-heat-fire)',
  'image-original': 'var(--mps-color-trust-high)',
  'image-suspect': 'var(--mps-color-trust-caution)',
  'image-flagged': 'var(--mps-color-trust-low)',
  info: 'var(--mps-color-status-info)',
  success: 'var(--mps-color-status-success)',
  warning: 'var(--mps-color-status-warning)',
  error: 'var(--mps-color-status-error)',
};

const sizePadding: Record<string, string> = {
  sm: 'var(--mps-spacing-xxs) var(--mps-spacing-xs)',
  md: 'var(--mps-spacing-xs) var(--mps-spacing-sm)',
  lg: 'var(--mps-spacing-xs) var(--mps-spacing-md)',
};

const sizeFontSize: Record<string, string> = {
  sm: 'var(--mps-font-size-xs)',
  md: 'var(--mps-font-size-sm)',
  lg: 'var(--mps-font-size-base)',
};

/**
 * A colored badge for trust scores, price ratings, heat levels, and statuses.
 *
 * @example
 * ```tsx
 * <Badge variant="trust-high">Trusted Seller</Badge>
 * <Badge variant="price-steal" size="sm" tooltip="Below market">Steal!</Badge>
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({
  variant,
  size = 'md',
  children,
  tooltip,
  className,
}) => {
  const color = variantColorMap[variant];
  const style: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 'var(--mps-spacing-xxs)',
    padding: sizePadding[size], fontSize: sizeFontSize[size], whiteSpace: 'nowrap',
    fontFamily: 'var(--mps-font-family-primary)',
    fontWeight: 'var(--mps-font-weight-semibold)' as never,
    lineHeight: 'var(--mps-line-height-tight)' as never,
    color, border: `var(--mps-border-width-thin) solid ${color}`,
    borderRadius: 'var(--mps-radius-full)',
  };

  return (
    <span className={className} style={style} title={tooltip}>
      {children}
    </span>
  );
};
