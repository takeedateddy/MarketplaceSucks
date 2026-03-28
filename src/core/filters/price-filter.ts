/**
 * Price range filter for Facebook Marketplace listings.
 *
 * Keeps only listings whose asking price falls within a configurable
 * minimum/maximum range. Free items are treated as having a price of $0.
 * Listings with a `null` price (unparseable) are always kept so the user
 * does not silently lose results.
 *
 * @module price-filter
 */

import type { IFilter, FilterCategory, FilterResult } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';

/**
 * Configuration shape for the price range filter.
 */
export interface PriceFilterConfig {
  /** Minimum price (inclusive). `null` means no lower bound. */
  min: number | null;
  /** Maximum price (inclusive). `null` means no upper bound. */
  max: number | null;
}

/**
 * Filters listings to only those within a specified price range.
 *
 * - Free items are treated as price $0.
 * - Listings with `null` price are always kept (no data to filter on).
 * - When both `min` and `max` are `null`, all listings pass through.
 *
 * @example
 * ```typescript
 * import { PriceFilter } from '@/core/filters/price-filter';
 *
 * const filter = new PriceFilter();
 * const config = { min: 20, max: 500 };
 * const result = filter.apply(listing, config);
 * ```
 */
export class PriceFilter implements IFilter<PriceFilterConfig> {
  /** @inheritdoc */
  readonly id = 'price-range';

  /** @inheritdoc */
  readonly displayName = 'Price Range';

  /** @inheritdoc */
  readonly category: FilterCategory = 'price';

  /** @inheritdoc */
  readonly defaultEnabled = false;

  /**
   * Evaluate a single listing against the price range.
   *
   * @param listing - The listing to evaluate.
   * @param config - Current price filter configuration.
   * @returns A {@link FilterResult} indicating whether the listing is within range.
   *
   * @example
   * ```typescript
   * const result = filter.apply(listing, { min: 10, max: 200 });
   * if (!result.keep) console.log(result.reason);
   * ```
   */
  apply(listing: Listing, config: PriceFilterConfig): FilterResult {
    // Listings with no parseable price are always kept
    if (listing.price === null) {
      return { keep: true };
    }

    const price = listing.price;

    if (config.min !== null && price < config.min) {
      return {
        keep: false,
        reason: `Price $${price} is below minimum $${config.min}`,
      };
    }

    if (config.max !== null && price > config.max) {
      return {
        keep: false,
        reason: `Price $${price} is above maximum $${config.max}`,
      };
    }

    return { keep: true };
  }

  /**
   * Return the default configuration with no bounds.
   *
   * @returns Default {@link PriceFilterConfig}.
   *
   * @example
   * ```typescript
   * const defaults = new PriceFilter().getDefaultConfig();
   * // => { min: null, max: null }
   * ```
   */
  getDefaultConfig(): PriceFilterConfig {
    return { min: null, max: null };
  }

  /**
   * Validate that an unknown value conforms to {@link PriceFilterConfig}.
   *
   * @param config - The value to validate.
   * @returns `true` if the value is a valid price filter config.
   *
   * @example
   * ```typescript
   * filter.validateConfig({ min: 0, max: 100 });   // => true
   * filter.validateConfig({ min: null, max: null }); // => true
   * filter.validateConfig({ min: 'abc' });            // => false
   * ```
   */
  validateConfig(config: unknown): config is PriceFilterConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Record<string, unknown>;
    if (c.min !== null && typeof c.min !== 'number') return false;
    if (c.max !== null && typeof c.max !== 'number') return false;
    return true;
  }
}
