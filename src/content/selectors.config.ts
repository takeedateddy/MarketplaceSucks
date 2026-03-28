/**
 * @module content/selectors.config
 *
 * **Single source of truth for all Facebook Marketplace DOM selectors.**
 *
 * Facebook uses dynamically-generated CSS class names that change with every
 * deploy. This file centralizes every selector the extension depends on so
 * that when Facebook ships a DOM change, only THIS file needs updating --
 * no other content-script module should contain raw Facebook selectors.
 *
 * Each property is an **array of selector strings** ordered from most-specific
 * to least-specific. The first selector that matches wins, and the remaining
 * entries serve as fallbacks. This gives the extension resilience across
 * minor Facebook DOM reshuffles.
 *
 * ## Selector strategy
 *
 * Facebook's markup relies heavily on:
 * - `data-*` attributes (relatively stable)
 * - `aria-label` attributes (stable for accessibility)
 * - Structural patterns like `a[href*="/marketplace/item/"]`
 * - Role-based selectors (`[role="listitem"]`, `[role="article"]`)
 *
 * Avoid selectors that depend solely on generated class names (e.g.
 * `.x1lliihq`) -- they break on every Facebook deploy.
 *
 * @example
 * ```ts
 * import { SELECTORS } from "@/content/selectors.config";
 *
 * function findFirst(parent: Element, candidates: string[]): Element | null {
 *   for (const sel of candidates) {
 *     const el = parent.querySelector(sel);
 *     if (el) return el;
 *   }
 *   return null;
 * }
 *
 * const title = findFirst(card, SELECTORS.listingTitle);
 * ```
 */

/**
 * Shape of the selector configuration object.
 *
 * Every key maps to an array of CSS selector strings. The consumer tries
 * each selector in order until one produces a match.
 */
export interface SelectorConfig {
  /** Selectors for the outermost listing card container. */
  readonly listingCard: readonly string[];
  /** Selectors for the listing title text within a card. */
  readonly listingTitle: readonly string[];
  /** Selectors for the price element within a card. */
  readonly listingPrice: readonly string[];
  /** Selectors for the location / distance text within a card. */
  readonly listingLocation: readonly string[];
  /** Selectors for the listing image element within a card. */
  readonly listingImage: readonly string[];
  /** Selectors for the condition text within a card. */
  readonly listingCondition: readonly string[];
  /** Selectors for the date/time posted text within a card. */
  readonly listingDate: readonly string[];
  /** Selectors for the anchor link to the listing detail page. */
  readonly listingLink: readonly string[];
  /** Selectors for the seller name on a listing card or detail page. */
  readonly sellerName: readonly string[];
  /** Selectors for the anchor link to the seller's profile. */
  readonly sellerLink: readonly string[];
  /** Selectors for engagement indicators (saves, comments, views). */
  readonly engagementIndicators: readonly string[];
  /** Selectors for the main Marketplace content scroll area. */
  readonly marketplaceContainer: readonly string[];
  /** Selectors used to detect whether Facebook is in dark mode. */
  readonly darkModeIndicator: readonly string[];
}

/**
 * Master selector map for Facebook Marketplace.
 *
 * **This is the ONLY file you need to modify when Facebook changes their
 * DOM structure.** Every other content-script module reads from this object.
 */
export const SELECTORS: SelectorConfig = {
  // ---------------------------------------------------------------------------
  // Listing card container
  // ---------------------------------------------------------------------------
  listingCard: [
    // Feed-style grid cards (primary layout 2024-2026)
    '[data-testid="marketplace-feed-item"]',
    '[role="listitem"] > div[data-testid]',
    // Search results grid
    'div[data-marketplace-item-id]',
    // Fallback: anchor-based card detection
    'a[href*="/marketplace/item/"][role="link"]',
    // Generic grid items inside the Marketplace feed
    '[role="main"] [role="list"] [role="listitem"]',
    // Broad structural fallback
    'div[aria-label="Collection of Marketplace items"] > div > div',
  ],

  // ---------------------------------------------------------------------------
  // Listing title
  // ---------------------------------------------------------------------------
  listingTitle: [
    '[data-testid="marketplace-listing-title"]',
    'span[data-testid="marketplace-item-title"]',
    // Title is usually the first visible <span> inside the card link
    'a[href*="/marketplace/item/"] span[dir="auto"]:first-of-type',
    // Aria-based fallback
    '[aria-label][role="link"] span[dir="auto"]',
    // Deep structural pattern: second text node in card
    'a[href*="/marketplace/item/"] > div > div:nth-child(2) span',
  ],

  // ---------------------------------------------------------------------------
  // Listing price
  // ---------------------------------------------------------------------------
  listingPrice: [
    '[data-testid="marketplace-listing-price"]',
    'span[data-testid="marketplace-item-price"]',
    // Price text typically starts with "$" or "Free"
    'a[href*="/marketplace/item/"] span[dir="auto"]:has(+ span[dir="auto"])',
    // Structural: first span within the info section
    'a[href*="/marketplace/item/"] > div > div:first-child span[dir="auto"]',
    // Broad text-based fallback
    '[role="listitem"] span[aria-label*="$"]',
    '[role="listitem"] span[aria-label*="Price"]',
  ],

  // ---------------------------------------------------------------------------
  // Listing location / distance
  // ---------------------------------------------------------------------------
  listingLocation: [
    '[data-testid="marketplace-listing-location"]',
    'span[data-testid="marketplace-item-location"]',
    // Location/distance is usually the last metadata row
    'a[href*="/marketplace/item/"] span[dir="auto"]:last-of-type',
    '[role="listitem"] span[aria-label*="miles"]',
    '[role="listitem"] span[aria-label*="away"]',
    // Structural: third or fourth text span in listing card
    'a[href*="/marketplace/item/"] > div > div:nth-child(2) span:last-child',
  ],

  // ---------------------------------------------------------------------------
  // Listing image
  // ---------------------------------------------------------------------------
  listingImage: [
    '[data-testid="marketplace-listing-image"] img',
    'a[href*="/marketplace/item/"] img[src*="scontent"]',
    'a[href*="/marketplace/item/"] img[src*="fbcdn"]',
    // Background-image pattern (Facebook sometimes uses div backgrounds)
    'a[href*="/marketplace/item/"] div[role="img"]',
    '[role="listitem"] img[alt]',
  ],

  // ---------------------------------------------------------------------------
  // Listing condition
  // ---------------------------------------------------------------------------
  listingCondition: [
    '[data-testid="marketplace-listing-condition"]',
    'span[data-testid="marketplace-item-condition"]',
    // Condition is often a small tag/badge below the title
    '[role="listitem"] span[aria-label*="condition" i]',
    'a[href*="/marketplace/item/"] span[dir="auto"]:nth-of-type(3)',
  ],

  // ---------------------------------------------------------------------------
  // Listing date
  // ---------------------------------------------------------------------------
  listingDate: [
    '[data-testid="marketplace-listing-date"]',
    'span[data-testid="marketplace-item-date"]',
    // Relative time text (e.g. "2 hours ago")
    '[role="listitem"] span[aria-label*="ago"]',
    '[role="listitem"] abbr[data-utime]',
    'a[href*="/marketplace/item/"] span[dir="auto"]:last-of-type',
  ],

  // ---------------------------------------------------------------------------
  // Listing link (anchor to detail page)
  // ---------------------------------------------------------------------------
  listingLink: [
    'a[href*="/marketplace/item/"]',
    'a[href*="/marketplace/item/"][role="link"]',
    '[data-testid="marketplace-feed-item"] a[href*="/marketplace/"]',
    '[role="listitem"] a[href*="/marketplace/"]',
  ],

  // ---------------------------------------------------------------------------
  // Seller name
  // ---------------------------------------------------------------------------
  sellerName: [
    '[data-testid="marketplace-seller-name"]',
    'span[data-testid="marketplace-listing-seller"]',
    'a[href*="/marketplace/profile/"] span',
    '[aria-label*="Seller"] span',
    // Detail page: seller info section
    'div[data-testid="marketplace-pdp-seller-info"] span[dir="auto"]',
  ],

  // ---------------------------------------------------------------------------
  // Seller profile link
  // ---------------------------------------------------------------------------
  sellerLink: [
    'a[href*="/marketplace/profile/"]',
    'a[data-testid="marketplace-seller-link"]',
    '[aria-label*="seller" i] a[href*="/profile"]',
    'a[href*="/marketplace/profile/"][role="link"]',
  ],

  // ---------------------------------------------------------------------------
  // Engagement indicators (saves, comments, views)
  // ---------------------------------------------------------------------------
  engagementIndicators: [
    '[data-testid="marketplace-listing-engagement"]',
    'span[data-testid="marketplace-item-saves"]',
    'span[aria-label*="save" i]',
    'span[aria-label*="comment" i]',
    'span[aria-label*="view" i]',
    '[role="listitem"] [aria-label*="people saved this"]',
  ],

  // ---------------------------------------------------------------------------
  // Main Marketplace content area
  // ---------------------------------------------------------------------------
  marketplaceContainer: [
    '[data-testid="marketplace-feed"]',
    '[data-testid="marketplace-search-results"]',
    '[role="main"] [role="feed"]',
    '[role="main"] [role="list"]',
    'div[aria-label="Collection of Marketplace items"]',
    // Broad fallback
    '[role="main"] div[data-pagelet*="Marketplace"]',
  ],

  // ---------------------------------------------------------------------------
  // Dark mode detection
  // ---------------------------------------------------------------------------
  darkModeIndicator: [
    'html.__fb-dark-mode',
    'html[data-theme="dark"]',
    'html[data-color-scheme="dark"]',
    'body.__fb-dark-mode',
    'body[data-theme="dark"]',
  ],
} as const;

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Try each selector in order and return the first matching element, or `null`.
 *
 * @param parent - The element to search within.
 * @param candidates - Ordered list of CSS selectors to try.
 * @returns The first matched element, or `null` if none match.
 */
export function queryFirst(parent: Element | Document, candidates: readonly string[]): Element | null {
  for (const selector of candidates) {
    try {
      const el = parent.querySelector(selector);
      if (el) return el;
    } catch {
      // Invalid selector -- skip silently
    }
  }
  return null;
}

/**
 * Try each selector in order and return all matching elements from the first
 * selector that produces results.
 *
 * @param parent - The element to search within.
 * @param candidates - Ordered list of CSS selectors to try.
 * @returns A (possibly empty) array of matched elements.
 */
export function queryAllFirst(parent: Element | Document, candidates: readonly string[]): Element[] {
  for (const selector of candidates) {
    try {
      const els = parent.querySelectorAll(selector);
      if (els.length > 0) return Array.from(els);
    } catch {
      // Invalid selector -- skip silently
    }
  }
  return [];
}
