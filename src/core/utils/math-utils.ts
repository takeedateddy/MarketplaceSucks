/**
 * Statistical and mathematical utility functions used by analysis engines.
 * Provides median, percentile, standard deviation, and other calculations
 * needed for price rating, heat scoring, and forecasting.
 *
 * @module math-utils
 */

/**
 * Calculate the median of a numeric array.
 *
 * @param values - Array of numbers
 * @returns The median value, or 0 if array is empty
 *
 * @example
 * ```typescript
 * median([1, 3, 5, 7, 9]) // => 5
 * median([1, 3, 5, 7])    // => 4
 * ```
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate the mean (average) of a numeric array.
 *
 * @param values - Array of numbers
 * @returns The mean value, or 0 if array is empty
 *
 * @example
 * ```typescript
 * mean([1, 2, 3, 4, 5]) // => 3
 * ```
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate the standard deviation of a numeric array.
 *
 * @param values - Array of numbers
 * @returns The standard deviation, or 0 if array has fewer than 2 elements
 *
 * @example
 * ```typescript
 * standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]) // => ~2.0
 * ```
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Calculate the percentile rank of a value within a dataset.
 * Returns what percentage of values fall below the given value.
 *
 * @param value - The value to rank
 * @param dataset - The dataset to compare against
 * @returns Percentile rank (0-100)
 *
 * @example
 * ```typescript
 * percentileRank(45, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
 * // => 40 (45 is greater than 40% of the dataset)
 * ```
 */
export function percentileRank(value: number, dataset: number[]): number {
  if (dataset.length === 0) return 0;

  const below = dataset.filter((v) => v < value).length;
  return Math.round((below / dataset.length) * 100);
}

/**
 * Calculate a specific percentile value from a dataset.
 *
 * @param dataset - Array of numbers
 * @param p - Percentile to calculate (0-100)
 * @returns The value at the given percentile
 *
 * @example
 * ```typescript
 * percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 75) // => 7.75
 * ```
 */
export function percentile(dataset: number[], p: number): number {
  if (dataset.length === 0) return 0;

  const sorted = [...dataset].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Clamp a value between a minimum and maximum.
 *
 * @param value - The value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns The clamped value
 *
 * @example
 * ```typescript
 * clamp(150, 0, 100) // => 100
 * clamp(-5, 0, 100)  // => 0
 * clamp(50, 0, 100)  // => 50
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values.
 *
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}
