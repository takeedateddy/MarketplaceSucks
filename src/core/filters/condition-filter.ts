/**
 * Item condition filter for Facebook Marketplace listings.
 *
 * Keeps only listings whose reported condition matches one of the
 * user-selected conditions. When no conditions are selected (empty array),
 * all listings pass through -- this acts as "show all conditions".
 *
 * Comparison is case-insensitive to tolerate inconsistencies between
 * the parsed condition string and the user-facing checkbox labels.
 *
 * @module condition-filter
 */

import type { IFilter, FilterCategory, FilterResult } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';

/**
 * Configuration shape for the condition filter.
 */
export interface ConditionFilterConfig {
  /**
   * Array of allowed condition values (e.g. `['new', 'like_new', 'good']`).
   * An empty array means "show all conditions".
   */
  conditions: string[];
}

/**
 * Filters listings based on seller-reported item condition.
 *
 * - Comparison is case-insensitive.
 * - An empty `conditions` array disables the filter (all listings pass).
 * - Listings whose condition is `'unknown'` are kept when the array is
 *   non-empty only if `'unknown'` is explicitly included.
 *
 * @example
 * ```typescript
 * import { ConditionFilter } from '@/core/filters/condition-filter';
 *
 * const filter = new ConditionFilter();
 * const config = { conditions: ['new', 'like_new'] };
 * const result = filter.apply(listing, config);
 * ```
 */
export class ConditionFilter implements IFilter<ConditionFilterConfig> {
  /** @inheritdoc */
  readonly id = 'condition';

  /** @inheritdoc */
  readonly displayName = 'Condition';

  /** @inheritdoc */
  readonly category: FilterCategory = 'condition';

  /** @inheritdoc */
  readonly defaultEnabled = false;

  /**
   * Evaluate a single listing against the allowed conditions.
   *
   * @param listing - The listing to evaluate.
   * @param config - Current condition filter configuration.
   * @returns A {@link FilterResult} indicating whether the listing's condition is allowed.
   *
   * @example
   * ```typescript
   * const result = filter.apply(listing, { conditions: ['new', 'good'] });
   * ```
   */
  apply(listing: Listing, config: ConditionFilterConfig): FilterResult {
    // Empty array = show all
    if (config.conditions.length === 0) {
      return { keep: true };
    }

    const allowedLower = new Set(config.conditions.map((c) => c.toLowerCase()));
    const listingCondition = listing.condition.toLowerCase();

    if (allowedLower.has(listingCondition)) {
      return { keep: true };
    }

    return {
      keep: false,
      reason: `Condition "${listing.condition}" is not in allowed list: ${config.conditions.join(', ')}`,
    };
  }

  /**
   * Return the default configuration with an empty conditions array (show all).
   *
   * @returns Default {@link ConditionFilterConfig}.
   *
   * @example
   * ```typescript
   * const defaults = new ConditionFilter().getDefaultConfig();
   * // => { conditions: [] }
   * ```
   */
  getDefaultConfig(): ConditionFilterConfig {
    return { conditions: [] };
  }

  /**
   * Validate that an unknown value conforms to {@link ConditionFilterConfig}.
   *
   * @param config - The value to validate.
   * @returns `true` if the value is a valid condition filter config.
   *
   * @example
   * ```typescript
   * filter.validateConfig({ conditions: ['new', 'good'] }); // => true
   * filter.validateConfig({ conditions: [] });               // => true
   * filter.validateConfig({ conditions: 'new' });            // => false
   * ```
   */
  validateConfig(config: unknown): config is ConditionFilterConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Record<string, unknown>;
    if (!Array.isArray(c.conditions)) return false;
    return c.conditions.every((item: unknown) => typeof item === 'string');
  }
}
