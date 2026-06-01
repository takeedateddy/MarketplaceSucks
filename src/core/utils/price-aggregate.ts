/**
 * @module core/utils/price-aggregate
 *
 * Pure price-distribution aggregation, shared by the data-processing Web Worker
 * (which offloads it from the main thread) and unit tests. Reuses the existing
 * statistics helpers in {@link module:core/utils/math-utils}.
 */

import { median, mean, standardDeviation, percentile } from "@/core/utils/math-utils";

/** Summary statistics over a set of prices. */
export interface PriceAggregate {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  /** 25th percentile. */
  p25: number;
  /** 75th percentile. */
  p75: number;
}

/** Empty aggregate (no usable prices). */
const EMPTY: PriceAggregate = {
  count: 0,
  min: 0,
  max: 0,
  mean: 0,
  median: 0,
  stdDev: 0,
  p25: 0,
  p75: 0,
};

/**
 * Aggregate a list of prices into summary statistics. Non-positive and
 * non-finite values are ignored. Returns a zeroed aggregate when no usable
 * prices remain.
 */
export function aggregatePrices(prices: readonly number[]): PriceAggregate {
  const valid = prices.filter((p) => Number.isFinite(p) && p > 0);
  if (valid.length === 0) return { ...EMPTY };
  const sorted = [...valid].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean(sorted)),
    median: Math.round(median(sorted)),
    stdDev: Math.round(standardDeviation(sorted)),
    p25: Math.round(percentile(sorted, 25)),
    p75: Math.round(percentile(sorted, 75)),
  };
}
