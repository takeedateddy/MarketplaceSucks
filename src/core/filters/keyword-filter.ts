/**
 * Keyword include filter for Facebook Marketplace listings.
 *
 * Keeps only listings whose titles contain at least one of the specified
 * keywords. Supports comma-separated keywords, quoted exact phrases, and
 * configurable fuzzy matching tolerance.
 *
 * When no keywords are configured the filter is a no-op and all listings
 * pass through.
 *
 * @module keyword-filter
 */

import type { IFilter, FilterCategory, FilterResult } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';
import { parseKeywords, titleContainsKeyword } from '@/core/utils/text-utils';
import { matchesWithFuzzy, type FuzzyLevel } from '@/core/filters/fuzzy-matcher';

/**
 * Configuration shape for the keyword include filter.
 */
export interface KeywordFilterConfig {
  /** Comma-separated keyword string. Quoted phrases are preserved as single entries. */
  keywords: string;
  /** Fuzzy matching tolerance level. */
  fuzzyLevel: FuzzyLevel;
}

/**
 * Filters listings to only those whose titles contain at least one of the
 * configured keywords.
 *
 * - Supports quoted exact-phrase matching (e.g. `"mid century"`).
 * - Supports fuzzy/typo-tolerant matching at configurable levels.
 * - When the keyword string is empty, all listings pass through unchanged.
 *
 * @example
 * ```typescript
 * import { KeywordFilter } from '@/core/filters/keyword-filter';
 *
 * const filter = new KeywordFilter();
 * const config = { keywords: 'dresser, "mid century"', fuzzyLevel: 'low' as const };
 * const filtered = filter.apply(listings, config);
 * ```
 */
export class KeywordFilter implements IFilter<KeywordFilterConfig> {
  /** @inheritdoc */
  readonly id = 'keyword-include';

  /** @inheritdoc */
  readonly displayName = 'Keyword Include';

  /** @inheritdoc */
  readonly category: FilterCategory = 'keyword';

  /** @inheritdoc */
  readonly defaultEnabled = false;

  /**
   * Evaluate a single listing against the keyword include rules.
   *
   * @param listing - The listing to evaluate.
   * @param config - Current keyword filter configuration.
   * @returns A {@link FilterResult} indicating whether the listing matches.
   *
   * @example
   * ```typescript
   * const result = filter.apply(listing, { keywords: 'dresser', fuzzyLevel: 'off' });
   * ```
   */
  apply(listing: Listing, config: KeywordFilterConfig): FilterResult {
    const keywords = parseKeywords(config.keywords);

    // No keywords configured -- everything passes
    if (keywords.length === 0) {
      return { keep: true };
    }

    const fuzzyLevel = config.fuzzyLevel ?? 'off';

    for (const kw of keywords) {
      if (fuzzyLevel === 'off') {
        if (titleContainsKeyword(listing.title, kw)) {
          return { keep: true };
        }
      } else {
        if (matchesWithFuzzy(listing.title, kw, fuzzyLevel)) {
          return { keep: true };
        }
      }
    }

    return {
      keep: false,
      reason: `Title does not contain any of: ${keywords.join(', ')}`,
    };
  }

  /**
   * Return the default configuration with an empty keyword string and fuzzy off.
   *
   * @returns Default {@link KeywordFilterConfig}.
   *
   * @example
   * ```typescript
   * const defaults = new KeywordFilter().getDefaultConfig();
   * // => { keywords: '', fuzzyLevel: 'off' }
   * ```
   */
  getDefaultConfig(): KeywordFilterConfig {
    return { keywords: '', fuzzyLevel: 'off' };
  }

  /**
   * Validate that an unknown value conforms to {@link KeywordFilterConfig}.
   *
   * @param config - The value to validate.
   * @returns `true` if the value is a valid keyword filter config.
   *
   * @example
   * ```typescript
   * filter.validateConfig({ keywords: 'test', fuzzyLevel: 'low' }); // => true
   * filter.validateConfig({ keywords: 123 });                        // => false
   * ```
   */
  validateConfig(config: unknown): config is KeywordFilterConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Record<string, unknown>;
    if (typeof c.keywords !== 'string') return false;
    const validLevels: readonly string[] = ['off', 'low', 'medium', 'high'];
    if (typeof c.fuzzyLevel !== 'string' || !validLevels.includes(c.fuzzyLevel)) return false;
    return true;
  }
}
