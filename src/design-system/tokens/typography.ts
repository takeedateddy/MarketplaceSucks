/**
 * Typography tokens for the MarketplaceSucks design system.
 */

/** Font family stacks. */
export const fontFamilies = {
  /** Primary system font stack matching Facebook's UI. */
  primary:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  /** Monospace stack for prices, codes, and technical content. */
  mono: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", "Courier New", monospace',
} as const;

/** Font size scale in pixels. */
export const fontSizes = {
  /** 11px – fine print, badges. */
  xs: '11px',
  /** 12px – captions, metadata. */
  sm: '12px',
  /** 14px – body text default. */
  base: '14px',
  /** 15px – slightly emphasised body. */
  md: '15px',
  /** 17px – sub-headings, card titles. */
  lg: '17px',
  /** 20px – section headings. */
  xl: '20px',
  /** 24px – page-level headings. */
  xxl: '24px',
} as const;

/** Font weight scale. */
export const fontWeights = {
  /** 400 – normal / regular. */
  normal: 400,
  /** 500 – medium emphasis. */
  medium: 500,
  /** 600 – semi-bold emphasis. */
  semibold: 600,
  /** 700 – bold / strong emphasis. */
  bold: 700,
} as const;

/** Line-height multipliers. */
export const lineHeights = {
  /** 1.2 – tight, headings. */
  tight: 1.2,
  /** 1.4 – normal body text. */
  normal: 1.4,
  /** 1.6 – relaxed, long-form content. */
  relaxed: 1.6,
} as const;

/** Aggregated typography tokens. */
export const typography = {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
} as const;
