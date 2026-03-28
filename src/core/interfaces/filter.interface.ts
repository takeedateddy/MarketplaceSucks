/**
 * @module core/interfaces/filter
 *
 * Defines the {@link IFilter} contract that every listing filter must implement.
 *
 * Filters are the primary mechanism for removing unwanted listings from search
 * results. Each filter declares its own configuration shape via the generic
 * `TConfig` parameter and provides methods for validation, defaults, and the
 * actual filtering logic.
 *
 * @example
 * ```ts
 * import type { IFilter, FilterCategory } from "@/core/interfaces/filter.interface";
 *
 * interface KeywordBlocklistConfig {
 *   blockedTerms: string[];
 *   caseSensitive: boolean;
 * }
 *
 * const keywordFilter: IFilter<KeywordBlocklistConfig> = {
 *   id: "keyword-blocklist",
 *   displayName: "Keyword Blocklist",
 *   category: "keyword",
 *   defaultEnabled: true,
 *   apply(listing, config) { ... },
 *   getDefaultConfig() { return { blockedTerms: [], caseSensitive: false }; },
 *   validateConfig(cfg) { return Array.isArray(cfg.blockedTerms); },
 * };
 * ```
 */

import type { Listing } from "@/core/models/listing";

/**
 * The set of logical categories a filter can belong to.
 *
 * Used to group filters in the UI and to scope bulk enable/disable operations.
 */
export type FilterCategory =
  | "keyword"
  | "price"
  | "location"
  | "condition"
  | "seller"
  | "image"
  | "market"
  | "date";

/**
 * Result returned by {@link IFilter.apply} indicating whether a listing should
 * be kept or removed, along with an optional human-readable reason.
 *
 * @example
 * ```ts
 * const result: FilterResult = { keep: false, reason: "Price below minimum ($5)" };
 * ```
 */
export interface FilterResult {
  /** Whether the listing passes this filter. */
  readonly keep: boolean;

  /**
   * Optional explanation shown to the user when the listing is filtered out.
   * Ignored when `keep` is `true`.
   */
  readonly reason?: string;
}

/**
 * Contract that every listing filter must satisfy.
 *
 * @typeParam TConfig - The configuration shape specific to this filter.
 *   Each filter defines its own config interface so the settings UI can be
 *   generated dynamically.
 *
 * @example
 * ```ts
 * class PriceRangeFilter implements IFilter<{ min: number; max: number }> {
 *   readonly id = "price-range";
 *   readonly displayName = "Price Range";
 *   readonly category = "price" as const;
 *   readonly defaultEnabled = true;
 *
 *   apply(listing: Listing, config: { min: number; max: number }): FilterResult {
 *     if (listing.price === null) return { keep: true };
 *     const inRange = listing.price >= config.min && listing.price <= config.max;
 *     return { keep: inRange, reason: inRange ? undefined : "Outside price range" };
 *   }
 *
 *   getDefaultConfig(): { min: number; max: number } {
 *     return { min: 0, max: Infinity };
 *   }
 *
 *   validateConfig(config: unknown): config is { min: number; max: number } {
 *     if (typeof config !== "object" || config === null) return false;
 *     const c = config as Record<string, unknown>;
 *     return typeof c.min === "number" && typeof c.max === "number";
 *   }
 * }
 * ```
 */
export interface IFilter<TConfig = Record<string, unknown>> {
  /**
   * Unique, stable identifier for this filter.
   *
   * Must be a kebab-case string that never changes across versions so that
   * persisted user preferences remain valid.
   *
   * @example "keyword-blocklist"
   */
  readonly id: string;

  /**
   * Human-readable name shown in the extension UI.
   *
   * @example "Keyword Blocklist"
   */
  readonly displayName: string;

  /**
   * Logical category this filter belongs to.
   *
   * @example "keyword"
   */
  readonly category: FilterCategory;

  /**
   * Whether this filter is enabled by default for new users.
   *
   * @example true
   */
  readonly defaultEnabled: boolean;

  /**
   * Evaluate a single listing against this filter's rules.
   *
   * @param listing - The listing to evaluate.
   * @param config  - The user's current configuration for this filter.
   * @returns A {@link FilterResult} indicating keep/remove and an optional reason.
   *
   * @example
   * ```ts
   * const result = filter.apply(listing, { blockedTerms: ["broken"] });
   * if (!result.keep) console.log(result.reason);
   * ```
   */
  apply(listing: Listing, config: TConfig): FilterResult;

  /**
   * Return the default configuration for this filter.
   *
   * Called once when the filter is first registered or when the user resets
   * to defaults.
   *
   * @returns A new default config object.
   *
   * @example
   * ```ts
   * const defaults = filter.getDefaultConfig();
   * ```
   */
  getDefaultConfig(): TConfig;

  /**
   * Validate that an arbitrary value conforms to the expected config shape.
   *
   * Used when loading persisted settings to guard against corrupt or outdated
   * data.
   *
   * @param config - The value to validate (loaded from storage).
   * @returns `true` if `config` is a valid `TConfig`, acting as a type guard.
   *
   * @example
   * ```ts
   * const raw: unknown = JSON.parse(stored);
   * if (filter.validateConfig(raw)) {
   *   filter.apply(listing, raw);
   * }
   * ```
   */
  validateConfig(config: unknown): config is TConfig;
}
