/**
 * Date/age filter for Facebook Marketplace listings.
 *
 * Removes listings that were posted more than a configurable number of hours
 * ago. Uses the listing's `parsedDate` field (unix millisecond timestamp) to
 * compute age. Listings without a parsed date are always kept so the user
 * does not silently lose results when the post date is unavailable.
 *
 * Typical configuration values:
 * - `null`  -- Any age (filter disabled)
 * - `1`     -- Last hour
 * - `24`    -- Last 24 hours
 * - `72`    -- Last 3 days
 * - `168`   -- Last 7 days
 * - `720`   -- Last 30 days
 *
 * @module date-filter
 */

import type { IFilter, FilterCategory, FilterResult } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';

/** Milliseconds in one hour. */
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Configuration shape for the date filter.
 */
export interface DateFilterConfig {
  /** Maximum listing age in hours. `null` means no age limit. */
  maxAgeHours: number | null;
}

/**
 * Filters listings based on how recently they were posted.
 *
 * - Listings with `null` parsedDate are always kept (no data to filter on).
 * - When `maxAgeHours` is `null`, all listings pass through.
 *
 * @example
 * ```typescript
 * import { DateFilter } from '@/core/filters/date-filter';
 *
 * const filter = new DateFilter();
 * const config = { maxAgeHours: 24 }; // Last 24 hours
 * const result = filter.apply(listing, config);
 * ```
 */
export class DateFilter implements IFilter<DateFilterConfig> {
  /** @inheritdoc */
  readonly id = 'date-posted';

  /** @inheritdoc */
  readonly displayName = 'Date Posted';

  /** @inheritdoc */
  readonly category: FilterCategory = 'date';

  /** @inheritdoc */
  readonly defaultEnabled = false;

  /**
   * Evaluate a single listing against the maximum age.
   *
   * @param listing - The listing to evaluate.
   * @param config - Current date filter configuration.
   * @returns A {@link FilterResult} indicating whether the listing is recent enough.
   *
   * @example
   * ```typescript
   * const result = filter.apply(listing, { maxAgeHours: 72 });
   * if (!result.keep) console.log(result.reason); // "Posted 5 days ago..."
   * ```
   */
  apply(listing: Listing, config: DateFilterConfig): FilterResult {
    // No age limit -- everything passes
    if (config.maxAgeHours === null) {
      return { keep: true };
    }

    // Listings without a parsed date are kept by default
    if (listing.parsedDate === null) {
      return { keep: true };
    }

    const now = Date.now();
    const ageMs = now - listing.parsedDate;
    const ageHours = ageMs / MS_PER_HOUR;

    if (ageHours > config.maxAgeHours) {
      const ageDays = Math.round(ageHours / 24);
      const ageLabel = ageHours < 24
        ? `${Math.round(ageHours)} hours`
        : `${ageDays} days`;

      return {
        keep: false,
        reason: `Posted ${ageLabel} ago, exceeds maximum ${config.maxAgeHours} hours`,
      };
    }

    return { keep: true };
  }

  /**
   * Return the default configuration with no age limit.
   *
   * @returns Default {@link DateFilterConfig}.
   *
   * @example
   * ```typescript
   * const defaults = new DateFilter().getDefaultConfig();
   * // => { maxAgeHours: null }
   * ```
   */
  getDefaultConfig(): DateFilterConfig {
    return { maxAgeHours: null };
  }

  /**
   * Validate that an unknown value conforms to {@link DateFilterConfig}.
   *
   * @param config - The value to validate.
   * @returns `true` if the value is a valid date filter config.
   *
   * @example
   * ```typescript
   * filter.validateConfig({ maxAgeHours: 24 });   // => true
   * filter.validateConfig({ maxAgeHours: null });  // => true
   * filter.validateConfig({ maxAgeHours: 'day' }); // => false
   * ```
   */
  validateConfig(config: unknown): config is DateFilterConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Record<string, unknown>;
    if (c.maxAgeHours !== null && typeof c.maxAgeHours !== 'number') return false;
    return true;
  }
}
