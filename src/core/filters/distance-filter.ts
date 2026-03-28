/**
 * Distance/radius enforcement filter for Facebook Marketplace listings.
 *
 * Removes listings that are beyond a configurable maximum distance from the
 * user. Listings without distance data are always kept so the user does not
 * silently lose results when Facebook does not provide distance information.
 *
 * @module distance-filter
 */

import type { IFilter, FilterCategory, FilterResult } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';

/**
 * Configuration shape for the distance filter.
 */
export interface DistanceFilterConfig {
  /** Maximum allowed distance in miles (inclusive). `null` means no limit. */
  maxDistance: number | null;
}

/**
 * Filters listings to only those within a specified distance radius.
 *
 * - Listings with `null` distance are always kept (no data to filter on).
 * - When `maxDistance` is `null`, all listings pass through.
 *
 * @example
 * ```typescript
 * import { DistanceFilter } from '@/core/filters/distance-filter';
 *
 * const filter = new DistanceFilter();
 * const config = { maxDistance: 25 };
 * const result = filter.apply(listing, config);
 * ```
 */
export class DistanceFilter implements IFilter<DistanceFilterConfig> {
  /** @inheritdoc */
  readonly id = 'distance-radius';

  /** @inheritdoc */
  readonly displayName = 'Distance / Radius';

  /** @inheritdoc */
  readonly category: FilterCategory = 'location';

  /** @inheritdoc */
  readonly defaultEnabled = false;

  /**
   * Evaluate a single listing against the maximum distance.
   *
   * @param listing - The listing to evaluate.
   * @param config - Current distance filter configuration.
   * @returns A {@link FilterResult} indicating whether the listing is within range.
   *
   * @example
   * ```typescript
   * const result = filter.apply(listing, { maxDistance: 10 });
   * if (!result.keep) console.log(result.reason);
   * ```
   */
  apply(listing: Listing, config: DistanceFilterConfig): FilterResult {
    // No distance limit configured -- everything passes
    if (config.maxDistance === null) {
      return { keep: true };
    }

    // Listings without distance data are kept by default
    if (listing.distance === null) {
      return { keep: true };
    }

    if (listing.distance > config.maxDistance) {
      return {
        keep: false,
        reason: `Distance ${listing.distance} mi exceeds maximum ${config.maxDistance} mi`,
      };
    }

    return { keep: true };
  }

  /**
   * Return the default configuration with no distance limit.
   *
   * @returns Default {@link DistanceFilterConfig}.
   *
   * @example
   * ```typescript
   * const defaults = new DistanceFilter().getDefaultConfig();
   * // => { maxDistance: null }
   * ```
   */
  getDefaultConfig(): DistanceFilterConfig {
    return { maxDistance: null };
  }

  /**
   * Validate that an unknown value conforms to {@link DistanceFilterConfig}.
   *
   * @param config - The value to validate.
   * @returns `true` if the value is a valid distance filter config.
   *
   * @example
   * ```typescript
   * filter.validateConfig({ maxDistance: 25 });   // => true
   * filter.validateConfig({ maxDistance: null });  // => true
   * filter.validateConfig({ maxDistance: 'far' }); // => false
   * ```
   */
  validateConfig(config: unknown): config is DistanceFilterConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Record<string, unknown>;
    if (c.maxDistance !== null && typeof c.maxDistance !== 'number') return false;
    return true;
  }
}
