/**
 * Keyword exclude (blocklist) filter for Facebook Marketplace listings.
 *
 * Removes listings whose titles match any of the specified keywords.
 * This is the inverse of the keyword include filter -- a listing is kept
 * only if it does NOT match any configured keyword.
 *
 * Supports the same comma-separated keywords, quoted phrases, and fuzzy
 * matching levels as the include filter.
 *
 * @module keyword-exclude-filter
 */

import type { IFilter, FilterCategory, FilterResult } from '@/core/interfaces/filter.interface';
import type { Listing } from '@/core/models/listing';
import { parseKeywords, titleContainsKeyword } from '@/core/utils/text-utils';
import { matchesWithFuzzy, type FuzzyLevel } from '@/core/filters/fuzzy-matcher';

/**
 * Configuration shape for the keyword exclude filter.
 */
export interface KeywordExcludeFilterConfig {
  /** Comma-separated keyword string. Quoted phrases are preserved as single entries. */
  keywords: string;
  /** Fuzzy matching tolerance level. */
  fuzzyLevel: FuzzyLevel;
}

/**
 * Removes listings whose titles contain any of the configured keywords.
 *
 * - Supports quoted exact-phrase matching (e.g. `"broken screen"`).
 * - Supports fuzzy/typo-tolerant matching at configurable levels.
 * - When the keyword string is empty, all listings pass through unchanged.
 *
 * @example
 * ```typescript
 * import { KeywordExcludeFilter } from '@/core/filters/keyword-exclude-filter';
 *
 * const filter = new KeywordExcludeFilter();
 * const config = { keywords: 'broken, damaged, "for parts"', fuzzyLevel: 'off' as const };
 * const filtered = filter.apply(listing, config);
 * ```
 */
export class KeywordExcludeFilter implements IFilter<KeywordExcludeFilterConfig> {
  /** @inheritdoc */
  readonly id = 'keyword-exclude';

  /** @inheritdoc */
  readonly displayName = 'Keyword Exclude';

  /** @inheritdoc */
  readonly category: FilterCategory = 'keyword';

  /** @inheritdoc */
  readonly defaultEnabled = false;

  /**
   * Evaluate a single listing against the keyword exclude rules.
   *
   * A listing is removed if its title matches ANY of the configured keywords.
   *
   * @param listing - The listing to evaluate.
   * @param config - Current keyword exclude filter configuration.
   * @returns A {@link FilterResult} -- `keep: false` if the listing matches a blocked keyword.
   *
   * @example
   * ```typescript
   * const result = filter.apply(listing, { keywords: 'broken', fuzzyLevel: 'off' });
   * ```
   */
  apply(listing: Listing, config: KeywordExcludeFilterConfig): FilterResult {
    const keywords = parseKeywords(config.keywords);

    // No keywords configured -- everything passes
    if (keywords.length === 0) {
      return { keep: true };
    }

    const fuzzyLevel = config.fuzzyLevel ?? 'off';

    for (const kw of keywords) {
      const matched =
        fuzzyLevel === 'off'
          ? titleContainsKeyword(listing.title, kw)
          : matchesWithFuzzy(listing.title, kw, fuzzyLevel);

      if (matched) {
        return {
          keep: false,
          reason: `Title matches excluded keyword: ${kw}`,
        };
      }
    }

    return { keep: true };
  }

  /**
   * Return the default configuration with an empty keyword string and fuzzy off.
   *
   * @returns Default {@link KeywordExcludeFilterConfig}.
   *
   * @example
   * ```typescript
   * const defaults = new KeywordExcludeFilter().getDefaultConfig();
   * // => { keywords: '', fuzzyLevel: 'off' }
   * ```
   */
  getDefaultConfig(): KeywordExcludeFilterConfig {
    return { keywords: '', fuzzyLevel: 'off' };
  }

  /**
   * Validate that an unknown value conforms to {@link KeywordExcludeFilterConfig}.
   *
   * @param config - The value to validate.
   * @returns `true` if the value is a valid keyword exclude filter config.
   *
   * @example
   * ```typescript
   * filter.validateConfig({ keywords: 'broken', fuzzyLevel: 'low' }); // => true
   * filter.validateConfig(null);                                        // => false
   * ```
   */
  validateConfig(config: unknown): config is KeywordExcludeFilterConfig {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as Record<string, unknown>;
    if (typeof c.keywords !== 'string') return false;
    const validLevels: readonly string[] = ['off', 'low', 'medium', 'high'];
    if (typeof c.fuzzyLevel !== 'string' || !validLevels.includes(c.fuzzyLevel)) return false;
    return true;
  }
}
