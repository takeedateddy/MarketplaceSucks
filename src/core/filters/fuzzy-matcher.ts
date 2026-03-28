/**
 * Fuzzy matching utility module for keyword filters.
 *
 * Bridges the gap between the keyword filter's fuzzy-level configuration
 * and the low-level similarity utilities. Handles both exact phrase matching
 * (quoted keywords) and single-word fuzzy matching, delegating to
 * {@link isFuzzyMatch} and {@link getFuzzyThreshold} from similarity-utils.
 *
 * @module fuzzy-matcher
 */

import { isFuzzyMatch, getFuzzyThreshold } from '@/core/utils/similarity-utils';
import { normalizeTitle } from '@/core/utils/text-utils';

/**
 * The set of fuzzy tolerance levels supported by keyword filters.
 */
export type FuzzyLevel = 'off' | 'low' | 'medium' | 'high';

/**
 * Determine whether a listing title matches a keyword at the given fuzzy level.
 *
 * When fuzzy is `'off'`, this performs a plain substring check against the
 * normalized title. When fuzzy is enabled (`'low'` | `'medium'` | `'high'`),
 * individual words in the title are compared to the keyword using Levenshtein
 * distance via {@link isFuzzyMatch}.
 *
 * Quoted phrases (e.g. `"mid century"`) are always matched as exact substrings
 * regardless of fuzzy level, because fuzzy edit-distance is not meaningful for
 * multi-word phrases.
 *
 * @param title - The raw listing title to search within.
 * @param keyword - A single keyword or a quoted phrase (e.g. `"mid century"`).
 * @param fuzzyLevel - The fuzzy tolerance level.
 * @returns `true` if the title matches the keyword at the requested tolerance.
 *
 * @example
 * ```typescript
 * matchesWithFuzzy('Corvette Stingray 2020', 'carvette', 'low');
 * // => true  (Levenshtein distance 1/8 = 0.125 <= 0.15)
 *
 * matchesWithFuzzy('Corvette Stingray 2020', 'carvette', 'off');
 * // => false (exact substring match fails)
 *
 * matchesWithFuzzy('Mid Century Modern Table', '"mid century"', 'high');
 * // => true  (exact phrase match, fuzzy level ignored for phrases)
 * ```
 */
export function matchesWithFuzzy(
  title: string,
  keyword: string,
  fuzzyLevel: FuzzyLevel,
): boolean {
  const trimmedKeyword = keyword.trim();
  const normalizedTitleStr = normalizeTitle(title);

  // Quoted phrases are always matched as exact substrings
  if (trimmedKeyword.startsWith('"') && trimmedKeyword.endsWith('"')) {
    const phrase = normalizeTitle(trimmedKeyword.slice(1, -1));
    return normalizedTitleStr.includes(phrase);
  }

  const normalizedKeyword = normalizeTitle(trimmedKeyword);

  // No fuzzy: plain substring check
  if (fuzzyLevel === 'off') {
    return normalizedTitleStr.includes(normalizedKeyword);
  }

  // With fuzzy: check if any word in the title fuzzy-matches the keyword.
  // Also fall through to exact substring check first for performance.
  if (normalizedTitleStr.includes(normalizedKeyword)) {
    return true;
  }

  const threshold = getFuzzyThreshold(fuzzyLevel);
  const titleWords = normalizedTitleStr.split(' ').filter((w) => w.length > 0);

  // For single-word keywords, compare against each title word
  if (!normalizedKeyword.includes(' ')) {
    return titleWords.some((word) => isFuzzyMatch(word, normalizedKeyword, threshold));
  }

  // For multi-word (unquoted) keywords, check each keyword token against title words
  const keywordTokens = normalizedKeyword.split(' ').filter((w) => w.length > 0);
  return keywordTokens.every((token) =>
    titleWords.some((word) => isFuzzyMatch(word, token, threshold)),
  );
}
