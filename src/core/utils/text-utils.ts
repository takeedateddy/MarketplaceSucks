/**
 * Text processing utilities for listing title normalization, tokenization,
 * and stop word removal. Used by filters, sorters, and analysis engines.
 *
 * @module text-utils
 */

/** Common stop words to remove from listing titles for comparison purposes */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'was', 'are',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'sale', 'selling', 'sold', 'sell', 'buy', 'buying',
  'great', 'good', 'excellent', 'condition', 'like', 'new', 'used',
  'obo', 'firm', 'negotiable', 'must', 'pick', 'up', 'pickup',
  'free', 'delivery', 'available', 'local', 'only',
]);

/**
 * Normalize a listing title for comparison purposes.
 * Lowercases, removes special characters, collapses whitespace.
 *
 * @param title - The raw listing title
 * @returns Normalized title string
 *
 * @example
 * ```typescript
 * normalizeTitle('  IKEA Malm Dresser - Great Condition!! ')
 * // => 'ikea malm dresser great condition'
 * ```
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a title into meaningful words, removing stop words.
 *
 * @param title - The raw or normalized title
 * @returns Array of significant tokens
 *
 * @example
 * ```typescript
 * tokenizeTitle('IKEA Malm Dresser - Great Condition!!')
 * // => ['ikea', 'malm', 'dresser']
 * ```
 */
export function tokenizeTitle(title: string): string[] {
  const normalized = normalizeTitle(title);
  return normalized
    .split(' ')
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Check if a title contains a keyword or phrase.
 * Supports exact phrase matching with quotes.
 *
 * @param title - The listing title to search in
 * @param keyword - The keyword or quoted phrase to search for
 * @returns Whether the title contains the keyword/phrase
 *
 * @example
 * ```typescript
 * titleContainsKeyword('Mid Century Modern Nightstand', '"mid century"')
 * // => true
 * titleContainsKeyword('Mid Century Modern Nightstand', 'nightstand')
 * // => true
 * ```
 */
export function titleContainsKeyword(title: string, keyword: string): boolean {
  const normalizedTitle = normalizeTitle(title);
  const trimmedKeyword = keyword.trim();

  // Exact phrase match (quoted)
  if (trimmedKeyword.startsWith('"') && trimmedKeyword.endsWith('"')) {
    const phrase = normalizeTitle(trimmedKeyword.slice(1, -1));
    return normalizedTitle.includes(phrase);
  }

  // Single keyword match
  const normalizedKeyword = normalizeTitle(trimmedKeyword);
  return normalizedTitle.includes(normalizedKeyword);
}

/**
 * Parse a comma-separated keyword string into individual keywords.
 * Preserves quoted phrases as single entries.
 *
 * @param input - Comma-separated keyword string
 * @returns Array of individual keywords/phrases
 *
 * @example
 * ```typescript
 * parseKeywords('"mid century", nightstand, dresser')
 * // => ['"mid century"', 'nightstand', 'dresser']
 * ```
 */
export function parseKeywords(input: string): string[] {
  if (!input.trim()) return [];

  const keywords: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of input) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      const trimmed = current.trim();
      if (trimmed) keywords.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }

  const trimmed = current.trim();
  if (trimmed) keywords.push(trimmed);

  return keywords;
}

/**
 * Extract a numeric price from a price string.
 * Handles various formats: "$45", "$1,234.56", "Free", "$0", "Negotiable".
 *
 * @param priceStr - The raw price string from the listing
 * @returns The numeric price, or 0 for free/unparseable
 *
 * @example
 * ```typescript
 * parsePrice('$1,234.56') // => 1234.56
 * parsePrice('Free')       // => 0
 * parsePrice('$45 OBO')    // => 45
 * ```
 */
export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;

  const lower = priceStr.toLowerCase().trim();
  if (lower === 'free' || lower === '$0' || lower === '0') return 0;

  // Extract numeric value, handling commas and decimals
  const match = priceStr.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;

  return parseFloat(match[1]);
}

/**
 * Parse a relative time string into an approximate Date.
 *
 * @param relativeTime - A string like "2 hours ago", "3 days ago", "Just now"
 * @returns Approximate Date object, or null if unparseable
 *
 * @example
 * ```typescript
 * parseRelativeTime('2 hours ago') // => Date (approx 2 hours in the past)
 * parseRelativeTime('3 days ago')  // => Date (approx 3 days in the past)
 * ```
 */
export function parseRelativeTime(relativeTime: string): Date | null {
  if (!relativeTime) return null;

  const lower = relativeTime.toLowerCase().trim();
  const now = Date.now();

  if (lower === 'just now' || lower === 'a moment ago') {
    return new Date(now);
  }

  const match = lower.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/);
  if (!match) {
    // Try "a/an" format: "an hour ago", "a day ago"
    const singleMatch = lower.match(/(?:a|an)\s+(second|minute|hour|day|week|month|year)\s*ago/);
    if (!singleMatch) return null;
    const unit = singleMatch[1];
    return subtractFromNow(now, 1, unit);
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  return subtractFromNow(now, amount, unit);
}

function subtractFromNow(now: number, amount: number, unit: string): Date {
  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };

  const ms = multipliers[unit] ?? 0;
  return new Date(now - amount * ms);
}

/**
 * Parse a distance string into a numeric value in miles.
 *
 * @param distanceStr - A string like "5 miles away", "2 mi", "10 miles"
 * @returns Distance in miles, or null if unparseable
 *
 * @example
 * ```typescript
 * parseDistance('5 miles away')  // => 5
 * parseDistance('2 mi')          // => 2
 * parseDistance('Listed nearby') // => null
 * ```
 */
export function parseDistance(distanceStr: string): number | null {
  if (!distanceStr) return null;

  const match = distanceStr.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)/i);
  if (!match) return null;

  return parseFloat(match[1]);
}
