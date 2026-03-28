/**
 * Sales velocity forecaster. Predicts how quickly a listing is likely to sell
 * based on pricing, engagement, category velocity, condition, and other factors.
 *
 * This module has ZERO browser dependencies.
 *
 * @module sales-forecaster
 */

import { clamp } from '@/core/utils/math-utils';

/** Forecast confidence level */
export type ForecastConfidence = 'high' | 'medium' | 'low' | 'insufficient';

/** Full forecast result */
export interface ForecastResult {
  /** Estimated days to sell */
  estimatedDays: number;
  /** Human-readable estimate */
  displayEstimate: string;
  /** Confidence level */
  confidence: ForecastConfidence;
  /** Number of historical data points used */
  dataPointCount: number;
  /** Reasoning lines */
  reasoning: string[];
  /** Urgency tier */
  urgency: 'act-fast' | 'moderate' | 'take-your-time';
}

/** Input data for forecasting */
export interface ForecastInput {
  /** Base average days to sell for this category (from historical data) */
  categoryAvgDays: number | null;
  /** Number of historical data points for the category */
  categoryDataPoints: number;
  /** Price relative to median for similar items (e.g., 0.8 = 80% of median) */
  priceRatio: number | null;
  /** Heat score (0-100) */
  heatScore: number | null;
  /** Item condition */
  condition: string | null;
  /** Item price */
  price: number;
  /** Whether the listing was posted on a weekend */
  isWeekendListing: boolean;
  /** Whether the seller is responsive */
  isResponsiveSeller: boolean;
}

/** Default base days if no category data */
const DEFAULT_BASE_DAYS = 14;

/**
 * Get the price adjustment multiplier.
 * Items priced below median sell faster, above median sell slower.
 */
function getPriceAdjustment(priceRatio: number | null): number {
  if (priceRatio === null) return 1.0;

  if (priceRatio <= 0.4) return 0.5;
  if (priceRatio <= 0.7) return 0.65;
  if (priceRatio <= 0.9) return 0.8;
  if (priceRatio <= 1.1) return 1.0;
  if (priceRatio <= 1.3) return 1.3;
  if (priceRatio <= 1.6) return 1.7;
  return 2.0;
}

/**
 * Get the heat adjustment multiplier.
 * High heat = sells faster.
 */
function getHeatAdjustment(heatScore: number | null): number {
  if (heatScore === null) return 1.0;

  if (heatScore >= 80) return 0.4;
  if (heatScore >= 60) return 0.55;
  if (heatScore >= 40) return 0.7;
  if (heatScore >= 20) return 1.0;
  return 1.5;
}

/**
 * Get the condition adjustment multiplier.
 */
function getConditionAdjustment(condition: string | null): number {
  if (!condition) return 1.0;

  const lower = condition.toLowerCase();
  if (lower === 'new' || lower === 'like new') return 0.7;
  if (lower === 'good') return 0.9;
  if (lower === 'fair') return 1.3;
  if (lower === 'salvage') return 1.5;
  return 1.0;
}

/**
 * Get price-point adjustment.
 * Lower-priced items generally move faster.
 */
function getPricePointAdjustment(price: number): number {
  if (price === 0) return 0.5; // Free items go fast
  if (price <= 25) return 0.7;
  if (price <= 50) return 0.8;
  if (price <= 100) return 0.9;
  if (price <= 500) return 1.0;
  if (price <= 1000) return 1.3;
  return 1.5;
}

/**
 * Determine urgency tier from estimated days.
 */
function getUrgencyTier(days: number): 'act-fast' | 'moderate' | 'take-your-time' {
  if (days <= 2) return 'act-fast';
  if (days <= 7) return 'moderate';
  return 'take-your-time';
}

/**
 * Format estimated days into a human-readable string.
 */
function formatEstimate(days: number): string {
  if (days < 1) return '< 1 day';
  if (days <= 1.5) return '~1 day';
  if (days <= 2.5) return '~2 days';
  if (days <= 3.5) return '~3 days';
  if (days <= 5) return '~4-5 days';
  if (days <= 7) return '~1 week';
  if (days <= 14) return '~1-2 weeks';
  if (days <= 21) return '~2-3 weeks';
  if (days <= 30) return '~3-4 weeks';
  return '1+ months';
}

/**
 * Predict how quickly a listing is likely to sell.
 *
 * Uses a weighted adjustment model: starts with a base category average,
 * then applies multipliers for price, engagement, condition, etc.
 *
 * @param input - Forecast input data
 * @returns Forecast result with estimate, confidence, and reasoning
 *
 * @example
 * ```typescript
 * const result = forecastSale({
 *   categoryAvgDays: 10,
 *   categoryDataPoints: 50,
 *   priceRatio: 0.6,
 *   heatScore: 75,
 *   condition: 'Like New',
 *   price: 45,
 *   isWeekendListing: true,
 *   isResponsiveSeller: true,
 * });
 * // result.estimatedDays => ~2
 * // result.urgency => 'act-fast'
 * ```
 */
export function forecastSale(input: ForecastInput): ForecastResult | null {
  const baseDays = input.categoryAvgDays ?? DEFAULT_BASE_DAYS;

  // Determine confidence
  let confidence: ForecastConfidence;
  if (input.categoryDataPoints >= 20) confidence = 'high';
  else if (input.categoryDataPoints >= 10) confidence = 'medium';
  else if (input.categoryDataPoints >= 5) confidence = 'low';
  else return null; // Insufficient data

  // Apply all adjustments
  const priceAdj = getPriceAdjustment(input.priceRatio);
  const heatAdj = getHeatAdjustment(input.heatScore);
  const conditionAdj = getConditionAdjustment(input.condition);
  const pricePointAdj = getPricePointAdjustment(input.price);
  const weekendAdj = input.isWeekendListing ? 0.9 : 1.0;
  const responseAdj = input.isResponsiveSeller ? 0.8 : 1.0;

  const estimatedDays = clamp(
    baseDays * priceAdj * heatAdj * conditionAdj * pricePointAdj * weekendAdj * responseAdj,
    0.25,
    90,
  );

  // Build reasoning
  const reasoning: string[] = [];
  reasoning.push(
    `Base estimate: ${baseDays.toFixed(0)} days (category average from ${input.categoryDataPoints} historical listings).`,
  );

  if (input.priceRatio !== null) {
    const pct = Math.round(input.priceRatio * 100);
    reasoning.push(`Pricing at ${pct}% of market median (adjustment: x${priceAdj.toFixed(2)}).`);
  }

  if (input.heatScore !== null) {
    reasoning.push(`Heat score: ${input.heatScore}/100 (adjustment: x${heatAdj.toFixed(2)}).`);
  }

  if (input.condition) {
    reasoning.push(`Condition: ${input.condition} (adjustment: x${conditionAdj.toFixed(2)}).`);
  }

  reasoning.push(
    `Confidence: ${confidence} (${input.categoryDataPoints} historical data points).`,
  );

  return {
    estimatedDays: Math.round(estimatedDays * 10) / 10,
    displayEstimate: formatEstimate(estimatedDays),
    confidence,
    dataPointCount: input.categoryDataPoints,
    reasoning,
    urgency: getUrgencyTier(estimatedDays),
  };
}
