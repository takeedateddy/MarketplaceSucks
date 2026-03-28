/**
 * @module core/models/price-data
 *
 * Defines the {@link PriceDataPoint} model for tracking price observations
 * over time.
 *
 * Price data points are collected each time a listing is observed and are
 * used by price-trend analyzers to detect drops, spikes, and fair-value
 * estimates.
 *
 * @example
 * ```ts
 * import { createPriceDataPoint, validatePriceDataPoint } from "@/core/models/price-data";
 *
 * const point = createPriceDataPoint({
 *   listingId: "12345",
 *   price: 800,
 *   currency: "USD",
 * });
 * ```
 */

/**
 * The source from which a price observation was obtained.
 *
 * - `"listing_card"` -- parsed from the search results grid.
 * - `"detail_page"` -- parsed from the listing's detail page.
 * - `"api"` -- obtained via an intercepted API response.
 */
export type PriceSource = "listing_card" | "detail_page" | "api";

/**
 * A single price observation for a listing at a specific point in time.
 *
 * Multiple data points for the same listing form a price history that
 * analyzers use to compute trends and detect anomalies.
 *
 * @example
 * ```ts
 * const point: PriceDataPoint = {
 *   listingId: "12345",
 *   price: 800,
 *   currency: "USD",
 *   timestamp: 1711612800000,
 *   source: "listing_card",
 *   priceDropFromPrevious: null,
 *   priceDropPercentage: null,
 * };
 * ```
 */
export interface PriceDataPoint {
  /** The listing this price observation belongs to. */
  readonly listingId: string;

  /** The observed price. */
  readonly price: number;

  /** ISO 4217 currency code. */
  readonly currency: string;

  /** Unix-epoch millisecond timestamp of the observation. */
  readonly timestamp: number;

  /** Where this price was observed. */
  readonly source: PriceSource;

  /**
   * Absolute price change from the previous observation.
   * Negative means the price dropped. `null` if this is the first observation.
   */
  readonly priceDropFromPrevious: number | null;

  /**
   * Percentage price change from the previous observation.
   * Negative means the price dropped. `null` if this is the first observation.
   */
  readonly priceDropPercentage: number | null;
}

/**
 * Fields accepted by {@link createPriceDataPoint}. Only `listingId`, `price`,
 * and `currency` are required.
 *
 * @example
 * ```ts
 * const input: PriceDataPointInput = {
 *   listingId: "12345",
 *   price: 800,
 *   currency: "USD",
 *   source: "detail_page",
 * };
 * ```
 */
export interface PriceDataPointInput {
  /** @see PriceDataPoint.listingId */
  readonly listingId: string;

  /** @see PriceDataPoint.price */
  readonly price: number;

  /** @see PriceDataPoint.currency */
  readonly currency: string;

  /** @see PriceDataPoint.timestamp */
  readonly timestamp?: number;

  /** @see PriceDataPoint.source */
  readonly source?: PriceSource;

  /** @see PriceDataPoint.priceDropFromPrevious */
  readonly priceDropFromPrevious?: number | null;

  /** @see PriceDataPoint.priceDropPercentage */
  readonly priceDropPercentage?: number | null;
}

/**
 * Factory function that creates a {@link PriceDataPoint} with sensible
 * defaults for any omitted fields.
 *
 * @param input - The partial price data. At minimum, `listingId`, `price`,
 *   and `currency` must be provided.
 * @returns A complete {@link PriceDataPoint} object.
 *
 * @example
 * ```ts
 * const point = createPriceDataPoint({
 *   listingId: "12345",
 *   price: 750,
 *   currency: "USD",
 *   source: "detail_page",
 * });
 * ```
 */
export function createPriceDataPoint(input: PriceDataPointInput): PriceDataPoint {
  return {
    listingId: input.listingId,
    price: input.price,
    currency: input.currency,
    timestamp: input.timestamp ?? Date.now(),
    source: input.source ?? "listing_card",
    priceDropFromPrevious: input.priceDropFromPrevious ?? null,
    priceDropPercentage: input.priceDropPercentage ?? null,
  };
}

/**
 * Runtime type guard that checks whether an unknown value conforms to the
 * {@link PriceDataPoint} interface.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a structurally valid {@link PriceDataPoint}.
 *
 * @example
 * ```ts
 * const raw: unknown = JSON.parse(stored);
 * if (validatePriceDataPoint(raw)) {
 *   console.log(raw.price);
 * }
 * ```
 */
export function validatePriceDataPoint(value: unknown): value is PriceDataPoint {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  if (typeof obj.listingId !== "string" || obj.listingId.length === 0) return false;
  if (typeof obj.price !== "number") return false;
  if (typeof obj.currency !== "string" || obj.currency.length === 0) return false;
  if (typeof obj.timestamp !== "number") return false;

  const validSources: readonly string[] = ["listing_card", "detail_page", "api"];
  if (typeof obj.source !== "string" || !validSources.includes(obj.source)) return false;

  if (obj.priceDropFromPrevious !== null && typeof obj.priceDropFromPrevious !== "number") {
    return false;
  }
  if (obj.priceDropPercentage !== null && typeof obj.priceDropPercentage !== "number") {
    return false;
  }

  return true;
}
