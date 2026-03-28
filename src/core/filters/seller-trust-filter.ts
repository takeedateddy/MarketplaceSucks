/**
 * Seller trust score threshold filter for Facebook Marketplace listings.
 *
 * Removes listings from sellers whose computed trust score falls below a
 * configurable minimum. The trust score is an analysis-phase enrichment
 * stored on `listing.sellerTrustScore` (0--100 scale).
 *
 * Listings that have not yet been scored (i.e. `sellerTrustScore` is
 * `undefined`) are always kept so the user does not silently lose results
 * before analysis has run.
 *
 * @module seller-trust-filter
 */

import type { IFilter, FilterCategory, FilterResult } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';

/**
 * Extended listing type that may include the optional seller trust score
 * added during the analysis phase.
 */
interface ListingWithTrustScore extends Listing {
  /** Seller trust score (0--100), added by the seller analyzer. */
  sellerTrustScore?: number;
}

/**
 * Configuration shape for the seller trust filter.
 */
export interface SellerTrustFilterConfig {
  /** Minimum required trust score (0--100 inclusive). */
  minTrustScore: number;
}

/**
 * Filters listings by seller trust score.
 *
 * - Listings with no trust score data (`undefined`) are always kept.
 * - A `minTrustScore` of 0 effectively disables the filter.
 *
 * @example
 * ```typescript
 * import { SellerTrustFilter } from '@/core/filters/seller-trust-filter';
 *
 * const filter = new SellerTrustFilter();
 * const config = { minTrustScore: 50 };
 * const result = filter.apply(listing, config);
 * ```
 */
export class SellerTrustFilter implements IFilter<SellerTrustFilterConfig> {
  /** @inheritdoc */
  readonly id = 'seller-trust';

  /** @inheritdoc */
  readonly displayName = 'Seller Trust Score';

  /** @inheritdoc */
  readonly category: FilterCategory = 'seller';

  /** @inheritdoc */
  readonly defaultEnabled = false;

  /**
   * Evaluate a single listing against the minimum trust score.
   *
   * @param listing - The listing to evaluate (may include `sellerTrustScore`).
   * @param config - Current seller trust filter configuration.
   * @returns A {@link FilterResult} indicating whether the seller is trusted enough.
   *
   * @example
   * ```typescript
   * const result = filter.apply(listing, { minTrustScore: 60 });
   * ```
   */
  apply(listing: Listing, config: SellerTrustFilterConfig): FilterResult {
    const extended = listing as ListingWithTrustScore;

    // No trust score data -- keep by default
    if (extended.sellerTrustScore === undefined) {
      return { keep: true };
    }

    if (extended.sellerTrustScore < config.minTrustScore) {
      return {
        keep: false,
        reason: `Seller trust score ${extended.sellerTrustScore} is below minimum ${config.minTrustScore}`,
      };
    }

    return { keep: true };
  }

  /**
   * Return the default configuration with a minimum trust score of 0 (all pass).
   *
   * @returns Default {@link SellerTrustFilterConfig}.
   *
   * @example
   * ```typescript
   * const defaults = new SellerTrustFilter().getDefaultConfig();
   * // => { minTrustScore: 0 }
   * ```
   */
  getDefaultConfig(): SellerTrustFilterConfig {
    return { minTrustScore: 0 };
  }

  /**
   * Validate that an unknown value conforms to {@link SellerTrustFilterConfig}.
   *
   * @param config - The value to validate.
   * @returns `true` if the value is a valid seller trust filter config.
   *
   * @example
   * ```typescript
   * filter.validateConfig({ minTrustScore: 50 }); // => true
   * filter.validateConfig({ minTrustScore: -1 });  // => false
   * filter.validateConfig({});                      // => false
   * ```
   */
  validateConfig(config: unknown): config is SellerTrustFilterConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Record<string, unknown>;
    if (typeof c.minTrustScore !== 'number') return false;
    if (c.minTrustScore < 0 || c.minTrustScore > 100) return false;
    return true;
  }
}
