/**
 * Responsive breakpoint tokens for the MarketplaceSucks design system.
 *
 * Values are in pixels and represent the minimum width for each breakpoint.
 */

/** Breakpoint scale (min-width values in px). */
export const breakpoints = {
  /** 480px – small screens, compact sidebar. */
  sm: 480,
  /** 768px – medium screens, tablet-like layouts. */
  md: 768,
  /** 1024px – large screens, full sidebar. */
  lg: 1024,
  /** 1280px – extra-large screens, expanded layouts. */
  xl: 1280,
} as const;

export type BreakpointToken = keyof typeof breakpoints;

/**
 * Returns a CSS `@media` min-width query string for the given breakpoint.
 *
 * @example
 * ```ts
 * mediaQuery('md') // '@media (min-width: 768px)'
 * ```
 */
export function mediaQuery(bp: BreakpointToken): string {
  return `@media (min-width: ${breakpoints[bp]}px)`;
}
