/**
 * Listing comparison engine. Allows side-by-side comparison of up to 4 listings
 * with automated summary analysis highlighting the best options.
 *
 * This module has ZERO browser dependencies.
 *
 * @module comparison-engine
 */

import type { AnalyzedListing } from '@/core/models/analyzed-listing';

/** Maximum number of listings in a comparison */
export const MAX_COMPARISON_ITEMS = 4;

/** A single comparison dimension */
export interface ComparisonDimension {
  /** Dimension name (e.g., "Price", "Trust Score") */
  label: string;
  /** Values for each listing, keyed by listing ID */
  values: Record<string, string>;
  /** Which listing ID is "best" in this dimension, if determinable */
  bestId: string | null;
  /** Whether lower values are better (e.g., price) */
  lowerIsBetter: boolean;
}

/** Full comparison result */
export interface ComparisonResult {
  /** Listing IDs being compared */
  listingIds: string[];
  /** Comparison dimensions */
  dimensions: ComparisonDimension[];
  /** Auto-generated summary text */
  summary: string;
  /** The "recommended" listing ID, if one stands out */
  recommendedId: string | null;
}

/**
 * Compare multiple listings and generate a structured comparison
 * with an automated summary.
 *
 * @param listings - Array of 2-4 listings to compare
 * @returns Comparison result with dimensions and summary
 *
 * @example
 * ```typescript
 * const result = compareListings([listingA, listingB, listingC]);
 * console.log(result.summary);
 * // "Listing B appears to be the best overall option..."
 * ```
 */
export function compareListings(listings: AnalyzedListing[]): ComparisonResult {
  if (listings.length < 2) {
    return {
      listingIds: listings.map((l) => l.id),
      dimensions: [],
      summary: 'Need at least 2 listings to compare.',
      recommendedId: null,
    };
  }

  const ids = listings.map((l) => l.id);
  const dimensions: ComparisonDimension[] = [];

  // Price
  const priceValues: Record<string, string> = {};
  const priceNums: Record<string, number> = {};
  for (const l of listings) {
    priceValues[l.id] = l.price !== null ? `$${l.price.toFixed(0)}` : 'N/A';
    if (l.price !== null) priceNums[l.id] = l.price;
  }
  const cheapestId = findBest(priceNums, true);
  dimensions.push({
    label: 'Price',
    values: priceValues,
    bestId: cheapestId,
    lowerIsBetter: true,
  });

  // Condition
  const condValues: Record<string, string> = {};
  for (const l of listings) {
    condValues[l.id] = l.condition;
  }
  dimensions.push({
    label: 'Condition',
    values: condValues,
    bestId: null,
    lowerIsBetter: false,
  });

  // Distance
  const distValues: Record<string, string> = {};
  const distNums: Record<string, number> = {};
  for (const l of listings) {
    if (l.distance !== null) {
      distValues[l.id] = `${l.distance} mi`;
      distNums[l.id] = l.distance;
    } else {
      distValues[l.id] = 'Unknown';
    }
  }
  dimensions.push({
    label: 'Distance',
    values: distValues,
    bestId: findBest(distNums, true),
    lowerIsBetter: true,
  });

  // Seller Trust
  const trustValues: Record<string, string> = {};
  const trustNums: Record<string, number> = {};
  for (const l of listings) {
    if (l.sellerTrustScore !== undefined) {
      trustValues[l.id] = `${l.sellerTrustScore}/100`;
      trustNums[l.id] = l.sellerTrustScore;
    } else {
      trustValues[l.id] = 'N/A';
    }
  }
  dimensions.push({
    label: 'Seller Trust',
    values: trustValues,
    bestId: findBest(trustNums, false),
    lowerIsBetter: false,
  });

  // Price Rating
  const ratingValues: Record<string, string> = {};
  for (const l of listings) {
    ratingValues[l.id] = l.priceRating ?? 'N/A';
  }
  dimensions.push({
    label: 'Price Rating',
    values: ratingValues,
    bestId: null,
    lowerIsBetter: false,
  });

  // Heat Score
  const heatValues: Record<string, string> = {};
  const heatNums: Record<string, number> = {};
  for (const l of listings) {
    if (l.heatScore !== undefined) {
      heatValues[l.id] = `${l.heatScore}/100`;
      heatNums[l.id] = l.heatScore;
    } else {
      heatValues[l.id] = 'N/A';
    }
  }
  dimensions.push({
    label: 'Heat Score',
    values: heatValues,
    bestId: findBest(heatNums, false),
    lowerIsBetter: false,
  });

  // Shipping
  const shipValues: Record<string, string> = {};
  for (const l of listings) {
    shipValues[l.id] = l.shippingAvailable ? 'Yes' : 'No';
  }
  dimensions.push({
    label: 'Shipping',
    values: shipValues,
    bestId: null,
    lowerIsBetter: false,
  });

  // Generate summary
  const summary = generateSummary(listings, dimensions);

  // Determine recommendation based on most "best" dimensions
  const bestCounts: Record<string, number> = {};
  for (const d of dimensions) {
    if (d.bestId) {
      bestCounts[d.bestId] = (bestCounts[d.bestId] ?? 0) + 1;
    }
  }
  let recommendedId: string | null = null;
  let maxBests = 0;
  for (const [id, count] of Object.entries(bestCounts)) {
    if (count > maxBests) {
      maxBests = count;
      recommendedId = id;
    }
  }

  return { listingIds: ids, dimensions, summary, recommendedId };
}

/**
 * Find the listing ID with the best (lowest or highest) numeric value.
 */
function findBest(
  values: Record<string, number>,
  lowerIsBetter: boolean,
): string | null {
  const entries = Object.entries(values);
  if (entries.length === 0) return null;

  return entries.reduce((best, [id, val]) => {
    const bestVal = values[best];
    if (lowerIsBetter) return val < bestVal ? id : best;
    return val > bestVal ? id : best;
  }, entries[0][0]);
}

/**
 * Generate a natural-language comparison summary.
 */
function generateSummary(
  listings: AnalyzedListing[],
  dimensions: ComparisonDimension[],
): string {
  const labels = listings.map((_, i) => `Listing ${String.fromCharCode(65 + i)}`);
  const idToLabel = new Map(listings.map((l, i) => [l.id, labels[i]]));

  const parts: string[] = [];

  // Find overall best by counting dimension wins
  const wins: Record<string, string[]> = {};
  for (const d of dimensions) {
    if (d.bestId) {
      if (!wins[d.bestId]) wins[d.bestId] = [];
      wins[d.bestId].push(d.label.toLowerCase());
    }
  }

  const sortedWinners = Object.entries(wins).sort(([, a], [, b]) => b.length - a.length);

  if (sortedWinners.length > 0) {
    const [bestId, bestDims] = sortedWinners[0];
    const label = idToLabel.get(bestId) ?? 'Unknown';
    parts.push(
      `${label} appears to be the strongest option, leading in ${bestDims.join(', ')}.`,
    );
  }

  // Add notes about each listing
  for (const listing of listings) {
    const label = idToLabel.get(listing.id) ?? 'Unknown';
    const notes: string[] = [];

    if (listing.sellerTrustScore !== undefined && listing.sellerTrustScore >= 80) {
      notes.push('highly trusted seller');
    } else if (listing.sellerTrustScore !== undefined && listing.sellerTrustScore < 40) {
      notes.push('low seller trust score');
    }

    if (listing.heatScore !== undefined && listing.heatScore >= 60) {
      notes.push('high engagement (may sell quickly)');
    }

    if (notes.length > 0) {
      parts.push(`${label}: ${notes.join('; ')}.`);
    }
  }

  return parts.join(' ') || 'Compare the details above to find the best option for your needs.';
}
