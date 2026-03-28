/**
 * @module core/models/analyzed-listing
 *
 * Extends the base {@link Listing} with optional analysis results that are
 * computed after initial parsing (e.g. seller trust, price rating, heat score).
 *
 * Modules that operate on enriched listings (comparison engine, sorters,
 * preview UI) should accept {@link AnalyzedListing} rather than plain
 * {@link Listing}.
 */

import type { Listing } from './listing';

/**
 * A {@link Listing} extended with optional analysis results.
 *
 * Analysis fields are populated by various analysis modules and may not be
 * present on every listing.
 */
export interface AnalyzedListing extends Listing {
  readonly sellerTrustScore?: number;
  readonly priceRating?: string;
  readonly priceRatingScore?: number;
  readonly heatScore?: number;
  readonly estimatedDaysToSell?: number;
  readonly imageFlags?: readonly string[];
  readonly aiImageScore?: number;
  readonly originalityScore?: number;
}
