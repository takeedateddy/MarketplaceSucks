/**
 * Price rating threshold filter for Facebook Marketplace listings.
 *
 * Uses the analysis-phase `priceRating` enrichment to filter listings by
 * their value assessment. Price ratings follow a scale:
 *
 * - `'steal'`      -- Exceptionally low price
 * - `'great_deal'` -- Well below market
 * - `'fair'`       -- Around market price
 * - `'overpriced'` -- Above market price
 * - `'ripoff'`     -- Far above market price
 *
 * The filter can enforce a minimum rating threshold and/or hide overpriced
 * listings outright.
 *
 * Listings that have not yet been scored (i.e. `priceRating` is `undefined`)
 * are always kept so the user does not silently lose results before analysis
 * has run.
 *
 * @module price-rating-filter
 */

import type { IFilter, FilterCategory, FilterResult } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';

/**
 * Extended listing type that may include the optional price rating fields
 * added during the analysis phase.
 */
interface ListingWithPriceRating extends Listing {
  /** Qualitative price rating assigned by the price analyzer. */
  priceRating?: string;
  /** Numeric score corresponding to the price rating (higher = better deal). */
  priceRatingScore?: number;
}

/**
 * Ordered list of price ratings from best to worst.
 * Used to determine if a listing meets the minimum rating threshold.
 */
const RATING_ORDER: readonly string[] = [
  'steal',
  'great_deal',
  'fair',
  'overpriced',
  'ripoff',
];

/**
 * Set of ratings considered "overpriced" for the `hideOverpriced` toggle.
 */
const OVERPRICED_RATINGS = new Set(['overpriced', 'ripoff']);

/**
 * Configuration shape for the price rating filter.
 */
export interface PriceRatingFilterConfig {
  /**
   * Minimum acceptable price rating. `null` means no minimum.
   * Only ratings at this level or better (further left in RATING_ORDER) pass.
   */
  minRating: string | null;
  /** Whether to hide all listings rated as overpriced or ripoff. */
  hideOverpriced: boolean;
}

/**
 * Filters listings based on their computed price rating.
 *
 * - Listings with no price rating data (`undefined`) are always kept.
 * - When `minRating` is `null` and `hideOverpriced` is `false`, all listings pass.
 *
 * @example
 * ```typescript
 * import { PriceRatingFilter } from '@/core/filters/price-rating-filter';
 *
 * const filter = new PriceRatingFilter();
 * const config = { minRating: 'fair', hideOverpriced: true };
 * const result = filter.apply(listing, config);
 * ```
 */
export class PriceRatingFilter implements IFilter<PriceRatingFilterConfig> {
  /** @inheritdoc */
  readonly id = 'price-rating';

  /** @inheritdoc */
  readonly displayName = 'Price Rating';

  /** @inheritdoc */
  readonly category: FilterCategory = 'price';

  /** @inheritdoc */
  readonly defaultEnabled = false;

  /**
   * Evaluate a single listing against the price rating rules.
   *
   * @param listing - The listing to evaluate (may include `priceRating`).
   * @param config - Current price rating filter configuration.
   * @returns A {@link FilterResult} indicating whether the listing's value rating passes.
   *
   * @example
   * ```typescript
   * const result = filter.apply(listing, { minRating: 'fair', hideOverpriced: false });
   * ```
   */
  apply(listing: Listing, config: PriceRatingFilterConfig): FilterResult {
    const extended = listing as ListingWithPriceRating;

    // No price rating data -- keep by default
    if (extended.priceRating === undefined) {
      return { keep: true };
    }

    const rating = extended.priceRating.toLowerCase();

    // Hide overpriced listings
    if (config.hideOverpriced && OVERPRICED_RATINGS.has(rating)) {
      return {
        keep: false,
        reason: `Price rated as "${extended.priceRating}"`,
      };
    }

    // Check minimum rating threshold
    if (config.minRating !== null) {
      const minIndex = RATING_ORDER.indexOf(config.minRating.toLowerCase());
      const ratingIndex = RATING_ORDER.indexOf(rating);

      // If the rating is not in the known scale, keep it (unknown ratings pass)
      if (ratingIndex === -1) {
        return { keep: true };
      }

      // If the min rating is not in the known scale, skip the check
      if (minIndex === -1) {
        return { keep: true };
      }

      // Lower index = better rating. Listing must be at or better than min.
      if (ratingIndex > minIndex) {
        return {
          keep: false,
          reason: `Price rating "${extended.priceRating}" is worse than minimum "${config.minRating}"`,
        };
      }
    }

    return { keep: true };
  }

  /**
   * Return the default configuration with no minimum and overpriced showing.
   *
   * @returns Default {@link PriceRatingFilterConfig}.
   *
   * @example
   * ```typescript
   * const defaults = new PriceRatingFilter().getDefaultConfig();
   * // => { minRating: null, hideOverpriced: false }
   * ```
   */
  getDefaultConfig(): PriceRatingFilterConfig {
    return { minRating: null, hideOverpriced: false };
  }

  /**
   * Validate that an unknown value conforms to {@link PriceRatingFilterConfig}.
   *
   * @param config - The value to validate.
   * @returns `true` if the value is a valid price rating filter config.
   *
   * @example
   * ```typescript
   * filter.validateConfig({ minRating: 'fair', hideOverpriced: true }); // => true
   * filter.validateConfig({ minRating: null, hideOverpriced: false });  // => true
   * filter.validateConfig({ minRating: 123 });                          // => false
   * ```
   */
  validateConfig(config: unknown): config is PriceRatingFilterConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Record<string, unknown>;
    if (c.minRating !== null && typeof c.minRating !== 'string') return false;
    if (typeof c.hideOverpriced !== 'boolean') return false;
    return true;
  }
}
