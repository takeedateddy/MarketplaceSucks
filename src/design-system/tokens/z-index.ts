/**
 * Z-index tokens for the MarketplaceSucks design system.
 *
 * Values are chosen to layer correctly above Facebook's own UI while
 * maintaining a predictable stacking order among extension elements.
 */

/** Z-index scale for extension UI layers. */
export const zIndex = {
  /** Badges overlaying listing cards. */
  listingBadge: 100,
  /** Sidebar filter panel. */
  sidebar: 10000,
  /** Listing preview overlay. */
  preview: 10001,
  /** Comparison bar pinned to viewport. */
  comparisonBar: 10002,
  /** Tooltips and hover cards. */
  tooltip: 10003,
  /** Modal dialogs. */
  modal: 10004,
  /** Floating toggle button for the sidebar. */
  toggleButton: 9999,
} as const;

export type ZIndexToken = keyof typeof zIndex;
