/**
 * @module core/interfaces/parser
 *
 * Defines the {@link IListingParser} contract for extracting structured
 * {@link Listing} data from Facebook Marketplace DOM elements.
 *
 * Parsers are the bridge between the messy, ever-changing Marketplace HTML
 * and the clean data models the rest of the extension works with. Because
 * Facebook ships frequent DOM changes, parsers are versioned and the
 * pipeline can fall back to older parsers when a newer one fails.
 *
 * @example
 * ```ts
 * import type { IListingParser } from "@/core/interfaces/parser.interface";
 *
 * const parser: IListingParser = {
 *   id: "fb-marketplace-2024",
 *   version: 2,
 *   canParse(root) { return root.querySelector('[data-listing]') !== null; },
 *   parseOne(el) { ... },
 *   parseAll(root) { ... },
 * };
 * ```
 */

import type { Listing } from "@/core/models/listing";

/**
 * Outcome of attempting to parse a single DOM element into a {@link Listing}.
 *
 * On success, `listing` is populated and `error` is `undefined`.
 * On failure, `listing` is `null` and `error` describes what went wrong.
 *
 * @example
 * ```ts
 * const result = parser.parseOne(element);
 * if (result.success) {
 *   console.log(result.listing.title);
 * } else {
 *   console.warn(result.error);
 * }
 * ```
 */
export interface ParseResult {
  /** Whether parsing succeeded. */
  readonly success: boolean;

  /** The parsed listing, or `null` on failure. */
  readonly listing: Listing | null;

  /** Human-readable error message when `success` is `false`. */
  readonly error?: string;
}

/**
 * Outcome of parsing an entire page of listings.
 *
 * @example
 * ```ts
 * const batch = parser.parseAll(document.body);
 * console.log(`Parsed ${batch.listings.length}, failed ${batch.errors.length}`);
 * ```
 */
export interface ParseBatchResult {
  /** Successfully parsed listings. */
  readonly listings: readonly Listing[];

  /** Error messages for elements that could not be parsed. */
  readonly errors: readonly string[];

  /** Total number of candidate elements found in the DOM subtree. */
  readonly totalCandidates: number;
}

/**
 * Contract for components that extract {@link Listing} data from DOM elements.
 *
 * Implementations are expected to be side-effect-free: they read the DOM but
 * never modify it.
 *
 * @example
 * ```ts
 * if (parser.canParse(document.body)) {
 *   const { listings } = parser.parseAll(document.body);
 *   listings.forEach(processListing);
 * }
 * ```
 */
export interface IListingParser {
  /**
   * Unique, stable identifier for this parser variant.
   *
   * @example "fb-marketplace-2024"
   */
  readonly id: string;

  /**
   * Monotonically increasing version number.
   *
   * Higher versions are tried first; lower versions serve as fallbacks.
   *
   * @example 2
   */
  readonly version: number;

  /**
   * Probe the given DOM subtree to determine whether this parser can handle it.
   *
   * Should be a cheap check (e.g. a single `querySelector`).
   *
   * @param root - The root element to probe (usually `document.body`).
   * @returns `true` if this parser recognizes the DOM structure.
   *
   * @example
   * ```ts
   * if (parser.canParse(document.body)) { ... }
   * ```
   */
  canParse(root: Element): boolean;

  /**
   * Parse a single listing card element into a {@link Listing}.
   *
   * @param element - The DOM element representing one listing card.
   * @returns A {@link ParseResult} with the listing or an error message.
   *
   * @example
   * ```ts
   * const result = parser.parseOne(cardElement);
   * ```
   */
  parseOne(element: Element): ParseResult;

  /**
   * Parse all listing cards found within a DOM subtree.
   *
   * @param root - The root element to search within.
   * @returns A {@link ParseBatchResult} with all parsed listings and errors.
   *
   * @example
   * ```ts
   * const { listings, errors } = parser.parseAll(document.body);
   * ```
   */
  parseAll(root: Element): ParseBatchResult;
}
