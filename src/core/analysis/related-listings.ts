/**
 * Related listings engine. Finds similar listings using title similarity,
 * category matching, price proximity, and location.
 *
 * This module has ZERO browser dependencies.
 *
 * @module related-listings
 */

import type { Listing } from '@/core/models/listing';
import { jaccardSimilarity } from '@/core/utils/similarity-utils';

/** A related listing with a relevance score */
export interface RelatedListing {
  listing: Listing;
  relevanceScore: number;
  matchReasons: string[];
}

/** Configuration for related listing search */
export interface RelatedSearchConfig {
  /** Maximum price deviation from target (0.5 = +/- 50%) */
  priceDeviation: number;
  /** Maximum number of results */
  maxResults: number;
  /** Minimum relevance score to include (0-1) */
  minRelevance: number;
}

const DEFAULT_CONFIG: RelatedSearchConfig = {
  priceDeviation: 0.5,
  maxResults: 10,
  minRelevance: 0.15,
};

/**
 * Find listings related to a target listing.
 *
 * Scores similarity based on title tokens (Jaccard similarity),
 * category match, price proximity, and distance.
 *
 * @param target - The listing to find related items for
 * @param candidates - Pool of listings to search through
 * @param config - Search configuration
 * @returns Sorted array of related listings with relevance scores
 *
 * @example
 * ```typescript
 * const related = findRelatedListings(currentListing, allListings);
 * // related[0].listing => most similar listing
 * // related[0].relevanceScore => 0.85
 * // related[0].matchReasons => ['Similar title', 'Same category', 'Similar price']
 * ```
 */
export function findRelatedListings(
  target: Listing,
  candidates: Listing[],
  config: Partial<RelatedSearchConfig> = {},
): RelatedListing[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const results: RelatedListing[] = [];

  for (const candidate of candidates) {
    // Skip the target listing itself
    if (candidate.id === target.id) continue;

    let score = 0;
    const reasons: string[] = [];

    // Title similarity (0-0.45 weight)
    const titleSim = jaccardSimilarity(target.titleTokens, candidate.titleTokens);
    if (titleSim > 0.1) {
      score += titleSim * 0.45;
      reasons.push('Similar title');
    }

    // Category match (0-0.2 weight)
    if (target.category && candidate.category && target.category === candidate.category) {
      score += 0.2;
      reasons.push('Same category');
    }

    // Price proximity (0-0.2 weight)
    if (target.price > 0 && candidate.price > 0) {
      const priceRatio = candidate.price / target.price;
      const minRatio = 1 - cfg.priceDeviation;
      const maxRatio = 1 + cfg.priceDeviation;

      if (priceRatio >= minRatio && priceRatio <= maxRatio) {
        // Closer to same price = higher score
        const proximity = 1 - Math.abs(1 - priceRatio) / cfg.priceDeviation;
        score += proximity * 0.2;
        reasons.push('Similar price');
      }
    }

    // Condition match (0-0.1 weight)
    if (target.condition && candidate.condition) {
      if (target.condition.toLowerCase() === candidate.condition.toLowerCase()) {
        score += 0.1;
        reasons.push('Same condition');
      }
    }

    // Location proximity (0-0.05 weight)
    if (target.distance !== null && candidate.distance !== null) {
      const distDiff = Math.abs(target.distance - candidate.distance);
      if (distDiff <= 10) {
        score += 0.05;
        reasons.push('Nearby');
      }
    }

    if (score >= cfg.minRelevance && reasons.length > 0) {
      results.push({
        listing: candidate,
        relevanceScore: Math.min(score, 1),
        matchReasons: reasons,
      });
    }
  }

  // Sort by relevance (highest first), then by price
  results.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return a.listing.price - b.listing.price;
  });

  return results.slice(0, cfg.maxResults);
}
