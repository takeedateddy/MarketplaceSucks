/**
 * Seller trust scoring engine. Evaluates sellers based on account age,
 * rating, response rate, profile completeness, and listing behavior
 * to produce a 0-100 trust score with detailed breakdown.
 *
 * This module has ZERO browser dependencies. All data must be passed in.
 *
 * @module seller-trust
 */

import type { SellerProfile } from '@/core/models/seller';
import { clamp } from '@/core/utils/math-utils';

/** Breakdown of individual trust score factors */
export interface TrustScoreBreakdown {
  accountAge: number;
  rating: number;
  ratingVolume: number;
  profileCompleteness: number;
  response: number;
  listingBehavior: number;
}

/** Full trust score result with score, breakdown, and confidence */
export interface TrustScoreResult {
  /** Overall trust score (0-100) */
  score: number;
  /** Individual factor scores */
  breakdown: TrustScoreBreakdown;
  /** Confidence level based on available data */
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  /** Number of data points available (out of 6 factors) */
  dataPointCount: number;
  /** Human-readable trust tier */
  tier: 'trusted' | 'moderate' | 'caution' | 'low';
  /** Factors that were based on actual data vs defaults */
  factorsWithData: string[];
}

/**
 * Calculate the account age score (0-25 points).
 *
 * @param ageMonths - Account age in months, or null if unknown
 * @returns Score and whether real data was used
 */
function scoreAccountAge(ageMonths: number | null): { score: number; hasData: boolean } {
  if (ageMonths === null) return { score: 12, hasData: false }; // Midpoint default

  if (ageMonths < 3) return { score: 0, hasData: true };
  if (ageMonths < 6) return { score: 5, hasData: true };
  if (ageMonths < 12) return { score: 10, hasData: true };
  if (ageMonths < 24) return { score: 15, hasData: true };
  if (ageMonths < 60) return { score: 20, hasData: true };
  return { score: 25, hasData: true };
}

/**
 * Calculate the rating score (0-25 points).
 *
 * @param rating - Star rating (1-5), or null if no ratings
 * @returns Score and whether real data was used
 */
function scoreRating(rating: number | null): { score: number; hasData: boolean } {
  if (rating === null) return { score: 5, hasData: false }; // Neutral default

  if (rating < 3) return { score: 0, hasData: true };
  if (rating < 3.5) return { score: 10, hasData: true };
  if (rating < 4) return { score: 15, hasData: true };
  if (rating < 4.5) return { score: 20, hasData: true };
  return { score: 25, hasData: true };
}

/**
 * Calculate the rating volume score (0-15 points).
 *
 * @param count - Number of ratings, or null if unknown
 * @returns Score and whether real data was used
 */
function scoreRatingVolume(count: number | null): { score: number; hasData: boolean } {
  if (count === null) return { score: 7, hasData: false }; // Midpoint default

  if (count === 0) return { score: 3, hasData: true };
  if (count <= 5) return { score: 7, hasData: true };
  if (count <= 20) return { score: 10, hasData: true };
  if (count <= 50) return { score: 13, hasData: true };
  return { score: 15, hasData: true };
}

/**
 * Calculate the profile completeness score (0-15 points).
 *
 * @param profile - Partial seller profile data
 * @returns Score and whether real data was used
 */
function scoreProfileCompleteness(profile: {
  hasProfilePhoto: boolean;
  hasCoverPhoto: boolean;
  hasLocation: boolean;
  hasBio: boolean;
}): { score: number; hasData: boolean } {
  let score = 0;
  let hasAnyData = false;

  if (profile.hasProfilePhoto) { score += 5; hasAnyData = true; }
  if (profile.hasCoverPhoto) { score += 3; hasAnyData = true; }
  if (profile.hasLocation) { score += 4; hasAnyData = true; }
  if (profile.hasBio) { score += 3; hasAnyData = true; }

  // If we have no profile data at all, return midpoint
  if (!hasAnyData) return { score: 7, hasData: false };
  return { score, hasData: true };
}

/**
 * Calculate the response score (0-10 points).
 *
 * @param responseRate - Response rate string, or null if unknown
 * @param responseTime - Response time string, or null if unknown
 * @returns Score and whether real data was used
 */
function scoreResponse(
  responseRate: string | null,
  responseTime: string | null,
): { score: number; hasData: boolean } {
  if (!responseRate && !responseTime) return { score: 3, hasData: false };

  const combined = `${responseRate ?? ''} ${responseTime ?? ''}`.toLowerCase();

  if (combined.includes('very responsive') || combined.includes('within an hour') || combined.includes('< 1 hour')) {
    return { score: 10, hasData: true };
  }
  if (combined.includes('responsive') || combined.includes('within') || combined.includes('< 12')) {
    return { score: 7, hasData: true };
  }
  if (combined.includes('not responsive') || combined.includes('> 24')) {
    return { score: 0, hasData: true };
  }

  return { score: 3, hasData: true };
}

/**
 * Calculate the listing behavior score (0-10 points).
 *
 * @param activeListings - Number of active listings, or null if unknown
 * @returns Score and whether real data was used
 */
function scoreListingBehavior(activeListings: number | null): { score: number; hasData: boolean } {
  if (activeListings === null) return { score: 5, hasData: false };

  if (activeListings <= 10) return { score: 10, hasData: true };
  if (activeListings <= 30) return { score: 7, hasData: true };
  if (activeListings <= 100) return { score: 4, hasData: true };
  return { score: 2, hasData: true };
}

/**
 * Determine the trust tier from a numeric score.
 *
 * @param score - Trust score (0-100)
 * @returns Trust tier label
 */
function getTrustTier(score: number): 'trusted' | 'moderate' | 'caution' | 'low' {
  if (score >= 80) return 'trusted';
  if (score >= 60) return 'moderate';
  if (score >= 40) return 'caution';
  return 'low';
}

/**
 * Calculate a comprehensive trust score for a seller profile.
 *
 * The score is a weighted sum of 6 factors, each scoring independently.
 * When data for a factor is missing, a neutral midpoint is used and
 * the confidence level is reduced.
 *
 * @param profile - Seller profile data (partial data is acceptable)
 * @returns Full trust score result with breakdown and confidence
 *
 * @example
 * ```typescript
 * const result = calculateTrustScore({
 *   accountAgeMonths: 36,
 *   rating: 4.5,
 *   ratingCount: 28,
 *   hasProfilePhoto: true,
 *   hasCoverPhoto: true,
 *   hasLocation: true,
 *   hasBio: false,
 *   responseRate: 'Very responsive',
 *   responseTime: null,
 *   activeListingCount: 5,
 * });
 * // result.score => ~85
 * // result.tier => 'trusted'
 * // result.confidence => 'high'
 * ```
 */
export function calculateTrustScore(profile: Partial<SellerProfile>): TrustScoreResult {
  const accountAgeMonths = profile.accountAgeDays != null
    ? Math.floor(profile.accountAgeDays / 30)
    : null;
  const ratingValue = profile.rating?.overall ?? null;
  const ratingCount = profile.rating?.totalReviews ?? null;
  const responseRateStr = profile.responseRate != null ? String(profile.responseRate) : null;

  const factors: { name: string; result: { score: number; hasData: boolean } }[] = [
    { name: 'accountAge', result: scoreAccountAge(accountAgeMonths) },
    { name: 'rating', result: scoreRating(ratingValue) },
    { name: 'ratingVolume', result: scoreRatingVolume(ratingCount) },
    {
      name: 'profileCompleteness',
      result: scoreProfileCompleteness({
        hasProfilePhoto: profile.profileImageUrl != null,
        hasCoverPhoto: false,
        hasLocation: profile.location != null,
        hasBio: false,
      }),
    },
    { name: 'response', result: scoreResponse(responseRateStr, profile.responseTime != null ? `${profile.responseTime} minutes` : null) },
    { name: 'listingBehavior', result: scoreListingBehavior(profile.activeListings ?? null) },
  ];

  const breakdown: TrustScoreBreakdown = {
    accountAge: factors[0].result.score,
    rating: factors[1].result.score,
    ratingVolume: factors[2].result.score,
    profileCompleteness: factors[3].result.score,
    response: factors[4].result.score,
    listingBehavior: factors[5].result.score,
  };

  const totalScore = clamp(
    factors.reduce((sum, f) => sum + f.result.score, 0),
    0,
    100,
  );

  const factorsWithData = factors.filter((f) => f.result.hasData).map((f) => f.name);
  const dataPointCount = factorsWithData.length;

  let confidence: 'high' | 'medium' | 'low' | 'insufficient';
  if (dataPointCount >= 5) confidence = 'high';
  else if (dataPointCount >= 3) confidence = 'medium';
  else if (dataPointCount >= 1) confidence = 'low';
  else confidence = 'insufficient';

  return {
    score: totalScore,
    breakdown,
    confidence,
    dataPointCount,
    tier: getTrustTier(totalScore),
    factorsWithData,
  };
}

/**
 * Get a human-readable description for a trust score factor.
 *
 * @param factor - Factor name
 * @param score - Factor score
 * @param maxScore - Maximum possible score for this factor
 * @returns Human-readable description
 */
export function describeTrustFactor(
  factor: keyof TrustScoreBreakdown,
  score: number,
  maxScore: number,
): string {
  const percentage = Math.round((score / maxScore) * 100);
  const descriptions: Record<keyof TrustScoreBreakdown, string> = {
    accountAge: `Account age: ${score}/${maxScore} points (${percentage}%)`,
    rating: `Seller rating: ${score}/${maxScore} points (${percentage}%)`,
    ratingVolume: `Rating volume: ${score}/${maxScore} points (${percentage}%)`,
    profileCompleteness: `Profile completeness: ${score}/${maxScore} points (${percentage}%)`,
    response: `Response rate: ${score}/${maxScore} points (${percentage}%)`,
    listingBehavior: `Listing behavior: ${score}/${maxScore} points (${percentage}%)`,
  };

  return descriptions[factor];
}

/** Maximum possible scores for each factor */
export const TRUST_FACTOR_MAX_SCORES: Record<keyof TrustScoreBreakdown, number> = {
  accountAge: 25,
  rating: 25,
  ratingVolume: 15,
  profileCompleteness: 15,
  response: 10,
  listingBehavior: 10,
};
