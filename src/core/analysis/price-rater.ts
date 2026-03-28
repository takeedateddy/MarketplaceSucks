/**
 * Price rating engine. Compares listing prices against aggregated data
 * from similar listings to determine whether a listing is a good deal,
 * fair, or overpriced. Produces transparent, human-readable reasoning.
 *
 * This module has ZERO browser dependencies.
 *
 * @module price-rater
 */

import { median, mean, standardDeviation, percentileRank } from '@/core/utils/math-utils';

/** Price rating tiers ordered from best to worst */
export type PriceRatingTier =
  | 'steal'
  | 'great-deal'
  | 'good-price'
  | 'fair-price'
  | 'above-market'
  | 'high'
  | 'overpriced';

/** Display info for each rating tier */
export const PRICE_RATING_INFO: Record<
  PriceRatingTier,
  { label: string; emoji: string; color: string; description: string }
> = {
  steal: {
    label: 'Steal',
    emoji: '\u{1F48E}',
    color: 'price-steal',
    description: 'Priced way below market',
  },
  'great-deal': {
    label: 'Great Deal',
    emoji: '\u{1F7E2}',
    color: 'price-great',
    description: 'Significantly below typical pricing',
  },
  'good-price': {
    label: 'Good Price',
    emoji: '\u{1F535}',
    color: 'price-good',
    description: 'Below average, solid price',
  },
  'fair-price': {
    label: 'Fair Price',
    emoji: '\u26AA',
    color: 'price-fair',
    description: 'Right around market rate',
  },
  'above-market': {
    label: 'Above Market',
    emoji: '\u{1F7E1}',
    color: 'price-above',
    description: 'Priced above typical for this type of item',
  },
  high: {
    label: 'High',
    emoji: '\u{1F7E0}',
    color: 'price-high',
    description: 'Notably above market rate',
  },
  overpriced: {
    label: 'Overpriced',
    emoji: '\u{1F534}',
    color: 'price-over',
    description: 'Significantly above typical pricing',
  },
};

/** Input data for rating a single listing's price */
export interface PriceRatingInput {
  /** The listing's price */
  price: number;
  /** The listing's condition */
  condition: string | null;
  /** Comparable prices from similar listings */
  comparablePrices: number[];
  /** Category name for display */
  category: string | null;
  /** How many days of data the comparables span */
  dataWindowDays: number;
  /** Condition-specific comparable prices (if available) */
  conditionAdjustedPrices?: number[];
}

/** Full price rating result */
export interface PriceRatingResult {
  /** Rating tier */
  tier: PriceRatingTier;
  /** Display info for the tier */
  display: { label: string; emoji: string; color: string };
  /** Price as percentage of median */
  percentOfMedian: number;
  /** Percentile rank (lower = cheaper relative to others) */
  percentileRank: number;
  /** Statistics about comparable listings */
  stats: {
    count: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  };
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  /** Human-readable reasoning lines */
  reasoning: string[];
}

/** Minimum number of comparables needed for a rating */
const MIN_COMPARABLES = 5;

/**
 * Determine the price rating tier based on percentage of median.
 *
 * @param percentOfMedian - Price as a percentage of the comparable median
 * @returns The price rating tier
 */
function determineTier(percentOfMedian: number): PriceRatingTier {
  if (percentOfMedian <= 40) return 'steal';
  if (percentOfMedian <= 70) return 'great-deal';
  if (percentOfMedian <= 90) return 'good-price';
  if (percentOfMedian <= 110) return 'fair-price';
  if (percentOfMedian <= 130) return 'above-market';
  if (percentOfMedian <= 160) return 'high';
  return 'overpriced';
}

/**
 * Determine confidence level based on comparable count.
 *
 * @param count - Number of comparable listings
 * @returns Confidence level
 */
function determineConfidence(
  count: number,
): 'high' | 'medium' | 'low' | 'insufficient' {
  if (count >= 20) return 'high';
  if (count >= 10) return 'medium';
  if (count >= MIN_COMPARABLES) return 'low';
  return 'insufficient';
}

/**
 * Rate a listing's price against comparable listings.
 * Returns a detailed rating with transparent reasoning.
 *
 * @param input - Price rating input data
 * @returns Full price rating result, or null if insufficient data
 *
 * @example
 * ```typescript
 * const result = rateListing({
 *   price: 45,
 *   condition: 'Good',
 *   comparablePrices: [80, 95, 100, 110, 120, 125, 130, 150, 175, 200],
 *   category: 'Furniture',
 *   dataWindowDays: 60,
 * });
 * // result.tier => 'great-deal'
 * // result.percentOfMedian => ~37.5
 * // result.reasoning => ['Compared against 10 similar...', ...]
 * ```
 */
export function rateListing(input: PriceRatingInput): PriceRatingResult | null {
  const { price, condition, comparablePrices, category, dataWindowDays } = input;

  if (comparablePrices.length < MIN_COMPARABLES) {
    return null;
  }

  const stats = {
    count: comparablePrices.length,
    min: Math.min(...comparablePrices),
    max: Math.max(...comparablePrices),
    mean: mean(comparablePrices),
    median: median(comparablePrices),
    stdDev: standardDeviation(comparablePrices),
  };

  const percentOfMedian =
    stats.median > 0 ? Math.round((price / stats.median) * 100) : 100;
  const pRank = percentileRank(price, comparablePrices);
  const tier = determineTier(percentOfMedian);
  const confidence = determineConfidence(stats.count);
  const display = PRICE_RATING_INFO[tier];

  // Build reasoning
  const reasoning: string[] = [];

  const categoryLabel = category ?? 'similar items';
  reasoning.push(
    `Compared against ${stats.count} similar "${categoryLabel}" listings from the past ${dataWindowDays} days.`,
  );

  reasoning.push(
    `Median price: $${stats.median.toFixed(0)} | Range: $${stats.min.toFixed(0)} - $${stats.max.toFixed(0)}`,
  );

  reasoning.push(
    `This is priced at the ${ordinalSuffix(pRank)} percentile (lower than ${100 - pRank}% of similar items).`,
  );

  // Condition adjustment note
  if (condition && input.conditionAdjustedPrices && input.conditionAdjustedPrices.length >= 3) {
    const condMedian = median(input.conditionAdjustedPrices);
    reasoning.push(
      `${condition} condition items in this category average $${condMedian.toFixed(0)}.`,
    );
  }

  // Warning notes for extreme prices
  if (tier === 'steal') {
    reasoning.push(
      'Note: Price is unusually low. Verify item condition and seller trustworthiness before purchasing.',
    );
  } else if (tier === 'overpriced') {
    reasoning.push(
      'Note: Price is significantly above market. Consider negotiating or looking at alternatives.',
    );
  }

  reasoning.push(
    `Confidence: ${confidence.charAt(0).toUpperCase() + confidence.slice(1)} (${stats.count} comparables)`,
  );

  return {
    tier,
    display: { label: display.label, emoji: display.emoji, color: display.color },
    percentOfMedian,
    percentileRank: pRank,
    stats,
    confidence,
    reasoning,
  };
}

/**
 * Add ordinal suffix to a number (1st, 2nd, 3rd, etc.)
 */
function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Generate a one-line summary of a price rating.
 *
 * @param result - The price rating result
 * @param price - The listing price
 * @returns One-line summary string
 *
 * @example
 * ```typescript
 * generateSummary(result, 45)
 * // => "💎 Steal — $45 (37% of median $125, based on 10 comparables)"
 * ```
 */
export function generatePriceRatingSummary(
  result: PriceRatingResult,
  price: number,
): string {
  return `${result.display.emoji} ${result.display.label} — $${price} (${result.percentOfMedian}% of median $${result.stats.median.toFixed(0)}, based on ${result.stats.count} comparables)`;
}
