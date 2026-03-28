/**
 * Spacing tokens for the MarketplaceSucks design system.
 *
 * Based on a 4px grid with select half-grid values for fine adjustments.
 */

/** Spacing scale in pixels. */
export const spacing = {
  /** 2px – hairline gaps, icon nudges. */
  xxs: '2px',
  /** 4px – tight internal padding. */
  xs: '4px',
  /** 8px – compact padding, small gaps. */
  sm: '8px',
  /** 12px – default internal padding. */
  md: '12px',
  /** 16px – standard padding, card gutters. */
  lg: '16px',
  /** 24px – section spacing. */
  xl: '24px',
  /** 32px – large section spacing. */
  xxl: '32px',
  /** 48px – page-level spacing. */
  xxxl: '48px',
} as const;

export type SpacingToken = keyof typeof spacing;
