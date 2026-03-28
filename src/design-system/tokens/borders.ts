/**
 * Border tokens for the MarketplaceSucks design system.
 */

/** Border radius scale. */
export const borderRadii = {
  /** 0 – no rounding. */
  none: '0',
  /** 4px – subtle rounding. */
  sm: '4px',
  /** 8px – standard rounding (cards, inputs). */
  md: '8px',
  /** 12px – prominent rounding (modals, panels). */
  lg: '12px',
  /** 9999px – pill / fully rounded. */
  full: '9999px',
} as const;

/** Border width scale. */
export const borderWidths = {
  /** 0 – no border. */
  none: '0',
  /** 1px – default border. */
  thin: '1px',
  /** 2px – emphasised border. */
  medium: '2px',
  /** 3px – heavy border (active states, focus rings). */
  thick: '3px',
} as const;

/** Aggregated border tokens. */
export const borders = {
  radii: borderRadii,
  widths: borderWidths,
} as const;

export type BorderRadiusToken = keyof typeof borderRadii;
export type BorderWidthToken = keyof typeof borderWidths;
