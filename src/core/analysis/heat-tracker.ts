/**
 * Heat tracker / popularity detection engine. Calculates how much attention
 * a listing is getting based on engagement data, velocity, and search position.
 *
 * This module has ZERO browser dependencies.
 *
 * @module heat-tracker
 */

import { clamp } from '@/core/utils/math-utils';

/** Heat score tier */
export type HeatTier = 'cool' | 'warm' | 'hot' | 'fire';

/** Display info for heat tiers */
export const HEAT_TIER_INFO: Record<
  HeatTier,
  { label: string; emoji: string; flames: number; color: string }
> = {
  cool: { label: 'Cool', emoji: '', flames: 0, color: '' },
  warm: { label: 'Warm', emoji: '\u{1F525}', flames: 1, color: 'heat-warm' },
  hot: { label: 'Hot', emoji: '\u{1F525}\u{1F525}', flames: 2, color: 'heat-hot' },
  fire: { label: 'On Fire', emoji: '\u{1F525}\u{1F525}\u{1F525}', flames: 3, color: 'heat-fire' },
};

/** Input data for heat calculation */
export interface HeatInput {
  /** Current engagement numbers */
  engagement: {
    saves: number | null;
    comments: number | null;
    views: number | null;
  };
  /** Previous engagement snapshot for velocity calculation */
  previousEngagement?: {
    saves: number | null;
    comments: number | null;
    views: number | null;
    observedAt: string;
  };
  /** Position in search results (lower = higher) */
  searchPosition: number | null;
  /** When the listing was posted */
  postedDate: Date | null;
}

/** Full heat calculation result */
export interface HeatResult {
  /** Heat score (0-100) */
  score: number;
  /** Heat tier */
  tier: HeatTier;
  /** Display info */
  display: { label: string; emoji: string; flames: number; color: string };
  /** Whether the score is based on limited data */
  limitedData: boolean;
  /** Breakdown of score components */
  breakdown: {
    absoluteEngagement: number;
    engagementVelocity: number;
    positionScore: number;
    recencyBoost: number;
  };
}

/**
 * Score absolute engagement levels (0-40 points).
 * Considers saves, comments, and views.
 */
function scoreAbsoluteEngagement(engagement: {
  saves: number | null;
  comments: number | null;
  views: number | null;
}): number {
  let score = 0;
  let hasData = false;

  if (engagement.saves !== null) {
    hasData = true;
    if (engagement.saves >= 20) score += 15;
    else if (engagement.saves >= 10) score += 12;
    else if (engagement.saves >= 5) score += 8;
    else if (engagement.saves >= 2) score += 4;
    else score += 1;
  }

  if (engagement.comments !== null) {
    hasData = true;
    if (engagement.comments >= 10) score += 15;
    else if (engagement.comments >= 5) score += 10;
    else if (engagement.comments >= 2) score += 6;
    else if (engagement.comments >= 1) score += 3;
  }

  if (engagement.views !== null) {
    hasData = true;
    if (engagement.views >= 500) score += 10;
    else if (engagement.views >= 200) score += 8;
    else if (engagement.views >= 100) score += 5;
    else if (engagement.views >= 50) score += 3;
    else score += 1;
  }

  return hasData ? clamp(score, 0, 40) : 0;
}

/**
 * Score engagement velocity — rate of change (0-35 points).
 */
function scoreEngagementVelocity(
  current: { saves: number | null; comments: number | null; views: number | null },
  previous?: { saves: number | null; comments: number | null; views: number | null; observedAt: string },
): number {
  if (!previous) return 0;

  const hoursSincePrevious = Math.max(
    (Date.now() - new Date(previous.observedAt).getTime()) / (1000 * 60 * 60),
    0.1,
  );

  let totalDelta = 0;
  let dataPoints = 0;

  if (current.saves !== null && previous.saves !== null) {
    totalDelta += Math.max(0, current.saves - previous.saves);
    dataPoints++;
  }
  if (current.comments !== null && previous.comments !== null) {
    totalDelta += Math.max(0, current.comments - previous.comments) * 2; // Comments weighted higher
    dataPoints++;
  }
  if (current.views !== null && previous.views !== null) {
    totalDelta += Math.max(0, current.views - previous.views) * 0.1;
    dataPoints++;
  }

  if (dataPoints === 0) return 0;

  const velocityPerHour = totalDelta / hoursSincePrevious;

  if (velocityPerHour >= 10) return 35;
  if (velocityPerHour >= 5) return 28;
  if (velocityPerHour >= 2) return 20;
  if (velocityPerHour >= 1) return 12;
  if (velocityPerHour >= 0.5) return 6;
  return 2;
}

/**
 * Score search position (0-15 points).
 * Higher positions (lower numbers) = more heat.
 */
function scoreSearchPosition(position: number | null): number {
  if (position === null) return 0;

  if (position <= 5) return 15;
  if (position <= 10) return 12;
  if (position <= 20) return 8;
  if (position <= 50) return 4;
  return 1;
}

/**
 * Calculate recency boost (0-10 points).
 * Newer listings with engagement get an extra boost.
 */
function scoreRecencyBoost(
  postedDate: Date | null,
  hasEngagement: boolean,
): number {
  if (!postedDate || !hasEngagement) return 0;

  const hoursOld = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);

  if (hoursOld <= 2) return 10;
  if (hoursOld <= 6) return 8;
  if (hoursOld <= 12) return 6;
  if (hoursOld <= 24) return 4;
  if (hoursOld <= 48) return 2;
  return 0;
}

/**
 * Determine heat tier from score.
 */
function getHeatTier(score: number): HeatTier {
  if (score >= 80) return 'fire';
  if (score >= 60) return 'hot';
  if (score >= 30) return 'warm';
  return 'cool';
}

/**
 * Calculate the heat score for a listing.
 *
 * @param input - Heat calculation input data
 * @returns Full heat result with score, tier, and breakdown
 *
 * @example
 * ```typescript
 * const result = calculateHeatScore({
 *   engagement: { saves: 15, comments: 5, views: 200 },
 *   searchPosition: 3,
 *   postedDate: new Date(Date.now() - 3600000), // 1 hour ago
 * });
 * // result.score => ~75
 * // result.tier => 'hot'
 * ```
 */
export function calculateHeatScore(input: HeatInput): HeatResult {
  const absoluteEngagement = scoreAbsoluteEngagement(input.engagement);
  const engagementVelocity = scoreEngagementVelocity(
    input.engagement,
    input.previousEngagement,
  );
  const positionScore = scoreSearchPosition(input.searchPosition);

  const hasEngagement =
    (input.engagement.saves ?? 0) > 0 ||
    (input.engagement.comments ?? 0) > 0 ||
    (input.engagement.views ?? 0) > 0;

  const recencyBoost = scoreRecencyBoost(input.postedDate, hasEngagement);

  const score = clamp(
    absoluteEngagement + engagementVelocity + positionScore + recencyBoost,
    0,
    100,
  );

  const tier = getHeatTier(score);

  const limitedData =
    input.engagement.saves === null &&
    input.engagement.comments === null &&
    input.engagement.views === null;

  return {
    score,
    tier,
    display: HEAT_TIER_INFO[tier],
    limitedData,
    breakdown: {
      absoluteEngagement,
      engagementVelocity,
      positionScore,
      recencyBoost,
    },
  };
}
